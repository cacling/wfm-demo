/**
 * schedule.ts — Pinia 状态管理（Phase 3: EditIntent API 对接）
 *
 * 数据流：
 * 1. loadTimeline → GET /api/plans/:id/timeline → 加载所有块
 * 2. 拖拽中：updateBlockPreview → 本地更新位置（实时预览）
 * 3. 松手后：commitEdit → POST /api/plans/:id/changes/commit → 后端校验+落库
 * 4. 成功后：从返回值更新块列表，或重新 loadTimeline
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import dayjs from 'dayjs'
import type { DisplayBlock, ActivityType } from '../types'
import { snapTime, setBaseDate } from '../utils/time'
import { api, type EditIntentCommand } from '../api'

interface TimelineAgent {
  id: number
  name: string
  shift: string
  shiftStart: string
  shiftEnd: string
  groupName: string | null
  contractName: string | null
}

export const useScheduleStore = defineStore('schedule', () => {
  const agents = ref<TimelineAgent[]>([])
  const blocks = ref<DisplayBlock[]>([])
  const selectedBlockId = ref<string | null>(null)
  const loading = ref(false)
  const currentPlanId = ref<number | null>(null)
  const currentDate = ref<string>('')
  const versionNo = ref<number>(1)
  const lastValidation = ref<any>(null)

  // ========== API 加载 ==========

  async function loadTimeline(planId: number, date: string) {
    loading.value = true
    try {
      setBaseDate(date)
      const data = await api.getTimeline(planId, date)
      agents.value = data.agents
      blocks.value = data.blocks.map((b: any) => ({
        id: String(b.id),
        entryId: b.entryId,
        agentId: String(b.agentId),
        type: b.type,
        start: b.start,
        end: b.end,
        editable: b.editable,
        color: b.color,
      }))
      currentPlanId.value = planId
      currentDate.value = date
      // 获取当前版本号
      const plans = await api.getPlans()
      const plan = plans.find((p: any) => p.id === planId)
      if (plan) versionNo.value = plan.versionNo
    } finally {
      loading.value = false
    }
  }

  function selectBlock(id: string | null) {
    selectedBlockId.value = id
  }

  // ========== 拖拽预览（本地） ==========

  function updateBlockPreview(id: string, start: string, end: string) {
    const idx = blocks.value.findIndex((b) => b.id === id)
    if (idx === -1) return
    const agentId = blocks.value[idx].agentId
    blocks.value[idx] = { ...blocks.value[idx], start, end }
    rebuildWorkBlocksLocal(agentId)
  }

  // ========== EditIntent API 调用 ==========

  /**
   * 通过后端 API 提交编辑意图
   * 成功后重新加载时间轴数据
   */
  async function commitEdit(intent: Omit<EditIntentCommand, 'versionNo'>): Promise<{ ok: boolean; validation?: any }> {
    if (!currentPlanId.value) return { ok: false }

    try {
      const cmd: EditIntentCommand = {
        ...intent,
        versionNo: versionNo.value,
      }
      const result = await api.commitEdit(currentPlanId.value, cmd)

      if (result.status === 'committed') {
        versionNo.value = result.versionNo
        // 重新加载该天数据
        await loadTimeline(currentPlanId.value, currentDate.value)
        return { ok: true, validation: result.validation }
      }

      // 被拒绝（有错误或未确认的 warning）
      lastValidation.value = result.validation
      // 回滚本地预览：重新加载
      await loadTimeline(currentPlanId.value, currentDate.value)
      return { ok: false, validation: result.validation }
    } catch (e) {
      console.error('Edit failed:', e)
      // 回滚
      if (currentPlanId.value) await loadTimeline(currentPlanId.value, currentDate.value)
      return { ok: false }
    }
  }

  /** 确认告警后强制提交 */
  async function confirmAndCommit(intent: Omit<EditIntentCommand, 'versionNo'>): Promise<{ ok: boolean; validation?: any }> {
    if (!currentPlanId.value) return { ok: false }
    const cmd: EditIntentCommand = { ...intent, versionNo: versionNo.value, confirmWarnings: true }
    const result = await api.commitEdit(currentPlanId.value, cmd)

    if (result.status === 'committed') {
      versionNo.value = result.versionNo
      await loadTimeline(currentPlanId.value, currentDate.value)
      return { ok: true }
    }
    lastValidation.value = result.validation
    await loadTimeline(currentPlanId.value, currentDate.value)
    return { ok: false, validation: result.validation }
  }

  // ========== 便捷方法（调 commitEdit） ==========

  async function moveBlock(id: string, deltaMinutes: number): Promise<boolean> {
    const block = blocks.value.find((b) => b.id === id)
    if (!block || !block.editable) return false

    const duration = dayjs(block.end).diff(dayjs(block.start), 'minute')
    const newStart = snapTime(dayjs(block.start).add(deltaMinutes, 'minute'))
    const newEnd = newStart.add(duration, 'minute')

    // 找到 entryId（从 blocks 数据中）
    const entryId = findEntryId(block.agentId)
    if (!entryId) return false

    const result = await commitEdit({
      intentType: 'MOVE_BLOCK',
      assignmentId: entryId,
      blockId: Number(id),
      targetRange: { startTime: newStart.toISOString(), endTime: newEnd.toISOString() },
    })
    return result.ok
  }

  async function resizeBlock(id: string, edge: 'left' | 'right', deltaMinutes: number): Promise<boolean> {
    const block = blocks.value.find((b) => b.id === id)
    if (!block || !block.editable) return false

    let newStart = dayjs(block.start)
    let newEnd = dayjs(block.end)
    if (edge === 'left') newStart = snapTime(newStart.add(deltaMinutes, 'minute'))
    else newEnd = snapTime(newEnd.add(deltaMinutes, 'minute'))

    const entryId = findEntryId(block.agentId)
    if (!entryId) return false

    const result = await commitEdit({
      intentType: edge === 'left' ? 'RESIZE_LEFT' : 'RESIZE_RIGHT',
      assignmentId: entryId,
      blockId: Number(id),
      targetRange: { startTime: newStart.toISOString(), endTime: newEnd.toISOString() },
    })
    return result.ok
  }

  async function deleteBlock(id: string): Promise<boolean> {
    const block = blocks.value.find((b) => b.id === id)
    if (!block || !block.editable) return false

    const entryId = findEntryId(block.agentId)
    if (!entryId) return false

    // 先本地移除（乐观更新）
    blocks.value = blocks.value.filter((b) => b.id !== id)
    if (selectedBlockId.value === id) selectedBlockId.value = null
    rebuildWorkBlocksLocal(block.agentId)

    const result = await commitEdit({
      intentType: 'DELETE_BLOCK',
      assignmentId: entryId,
      blockId: Number(id),
    })
    return result.ok
  }

  async function addBlock(agentId: string, type: ActivityType, startISO: string): Promise<string | null> {
    const start = snapTime(dayjs(startISO))
    const end = start.add(30, 'minute')

    const entryId = findEntryId(agentId)
    if (!entryId) return null

    // 查找活动 ID
    const activities = await api.getActivities()
    const act = activities.find((a: any) => a.code?.toLowerCase() === type || a.name?.toLowerCase().replace(' ', '_') === type)
    if (!act) return null

    const result = await commitEdit({
      intentType: 'INSERT_ACTIVITY',
      assignmentId: entryId,
      activityId: act.id,
      targetRange: { startTime: start.toISOString(), endTime: end.toISOString() },
    })
    return result.ok ? 'ok' : null
  }

  // ========== 辅助 ==========

  /** 根据 agentId 找到当天的 entryId */
  function findEntryId(agentId: string): number | null {
    const block = blocks.value.find((b) => b.agentId === agentId && (b as any).entryId)
    return block ? (block as any).entryId : null
  }

  /** 本地 Work 块重建（仅用于拖拽预览） */
  function rebuildWorkBlocksLocal(agentId: string) {
    const agent = agents.value.find((a) => String(a.id) === agentId)
    if (!agent) return

    blocks.value = blocks.value.filter((b) => !(b.agentId === agentId && b.type === 'work'))

    const agentBlocks = blocks.value
      .filter((b) => b.agentId === agentId)
      .sort((a, b) => dayjs(a.start).diff(dayjs(b.start)))

    const datePrefix = currentDate.value
    const [sh, sm] = agent.shiftStart.split(':').map(Number)
    const [eh, em] = agent.shiftEnd.split(':').map(Number)
    const shiftStart = dayjs(datePrefix).add(sh, 'hour').add(sm, 'minute')
    const shiftEnd = dayjs(datePrefix).add(eh, 'hour').add(em, 'minute')

    let cursor = shiftStart
    const newWork: DisplayBlock[] = []

    for (const block of agentBlocks) {
      const bStart = dayjs(block.start)
      if (bStart.isAfter(cursor)) {
        newWork.push({
          id: `work-${agentId}-${cursor.valueOf()}`,
          agentId, type: 'work',
          start: cursor.toISOString(), end: bStart.toISOString(),
          editable: false,
        })
      }
      const bEnd = dayjs(block.end)
      if (bEnd.isAfter(cursor)) cursor = bEnd
    }
    if (cursor.isBefore(shiftEnd)) {
      newWork.push({
        id: `work-${agentId}-${cursor.valueOf()}`,
        agentId, type: 'work',
        start: cursor.toISOString(), end: shiftEnd.toISOString(),
        editable: false,
      })
    }
    blocks.value.push(...newWork)
  }

  return {
    agents, blocks, selectedBlockId, loading,
    currentPlanId, currentDate, versionNo, lastValidation,
    loadTimeline, selectBlock,
    updateBlockPreview,
    commitEdit, confirmAndCommit,
    moveBlock, resizeBlock, deleteBlock, addBlock,
  }
})
