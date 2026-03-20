/**
 * schedule.ts — Pinia 状态管理
 *
 * Phase 2 改造：从后端 API 加载排班数据，不再使用 mock-data。
 *
 * 数据流：
 * 1. loadTimeline(planId, date) → 调 GET /api/plans/:id/timeline
 * 2. 后端返回 agents + blocks（含 Work 块）
 * 3. 前端直接渲染所有块（不再本地派生 Work）
 * 4. 拖拽/拉伸时：本地预览 → 松手后调后端 API 提交（Phase 3）
 *    当前 Phase 2 仍在前端做本地校验和提交
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import type { DisplayBlock, ActivityType } from '../types'
import { snapTime, setBaseDate } from '../utils/time'
import { api } from '../api'

/** 从后端返回的坐席信息 */
interface TimelineAgent {
  id: number
  name: string
  shift: string
  shiftStart: string  // HH:mm
  shiftEnd: string
  groupName: string | null
  contractName: string | null
}

export const useScheduleStore = defineStore('schedule', () => {
  // ========== 状态 ==========
  const agents = ref<TimelineAgent[]>([])
  const blocks = ref<DisplayBlock[]>([])
  const selectedBlockId = ref<string | null>(null)
  const loading = ref(false)
  const currentPlanId = ref<number | null>(null)
  const currentDate = ref<string>('')

  // ========== API 加载 ==========

  /** 从后端加载某天的时间轴数据 */
  async function loadTimeline(planId: number, date: string) {
    loading.value = true
    try {
      setBaseDate(date)  // 设置时间轴基准日期
      const data = await api.getTimeline(planId, date)
      agents.value = data.agents
      // 将后端返回的块转为 DisplayBlock 格式
      blocks.value = data.blocks.map((b: any) => ({
        id: String(b.id),
        agentId: String(b.agentId),
        type: b.type,
        start: b.start,
        end: b.end,
        editable: b.editable,
        color: b.color,
      }))
      currentPlanId.value = planId
      currentDate.value = date
    } finally {
      loading.value = false
    }
  }

  // ========== 按坐席分组获取块 ==========

  function getBlocksForAgent(agentId: number): DisplayBlock[] {
    return blocks.value.filter((b) => b.agentId === String(agentId))
  }

  // ========== 选中 ==========

  function selectBlock(id: string | null) {
    selectedBlockId.value = id
  }

  // ========== 本地编辑（拖拽/拉伸/增删） ==========
  // Phase 2: 仍在前端做本地校验
  // Phase 3: 改为调后端 API

  function moveBlock(id: string, deltaMinutes: number): boolean {
    const idx = blocks.value.findIndex((b) => b.id === id)
    if (idx === -1 || !blocks.value[idx].editable) return false
    const block = blocks.value[idx]

    const agent = agents.value.find((a) => String(a.id) === block.agentId)
    if (!agent) return false

    const duration = dayjs(block.end).diff(dayjs(block.start), 'minute')
    const newStart = snapTime(dayjs(block.start).add(deltaMinutes, 'minute'))
    const newEnd = newStart.add(duration, 'minute')

    // 构造当天的班次绝对时间边界
    const datePrefix = currentDate.value  // YYYY-MM-DD
    const [sh, sm] = agent.shiftStart.split(':').map(Number)
    const [eh, em] = agent.shiftEnd.split(':').map(Number)
    const shiftStartAbs = dayjs(datePrefix).add(sh, 'hour').add(sm, 'minute')
    const shiftEndAbs = dayjs(datePrefix).add(eh, 'hour').add(em, 'minute')

    if (newStart.isBefore(shiftStartAbs)) return false
    if (newEnd.isAfter(shiftEndAbs)) return false

    // 不与同坐席其他非 Work 块重叠
    const overlaps = blocks.value.some((b) => {
      if (b.id === id || b.agentId !== block.agentId || b.type === 'work') return false
      return newStart.isBefore(dayjs(b.end)) && newEnd.isAfter(dayjs(b.start))
    })
    if (overlaps) return false

    // 更新活动块位置
    blocks.value[idx] = { ...block, start: newStart.toISOString(), end: newEnd.toISOString() }

    // 重建该坐席的 Work 块
    rebuildWorkBlocks(block.agentId)
    return true
  }

  function resizeBlock(id: string, edge: 'left' | 'right', deltaMinutes: number): boolean {
    const idx = blocks.value.findIndex((b) => b.id === id)
    if (idx === -1 || !blocks.value[idx].editable) return false
    const block = blocks.value[idx]

    let newStart = dayjs(block.start)
    let newEnd = dayjs(block.end)

    if (edge === 'left') {
      newStart = snapTime(newStart.add(deltaMinutes, 'minute'))
    } else {
      newEnd = snapTime(newEnd.add(deltaMinutes, 'minute'))
    }

    if (newEnd.diff(newStart, 'minute') < 15) return false

    blocks.value[idx] = { ...block, start: newStart.toISOString(), end: newEnd.toISOString() }
    rebuildWorkBlocks(block.agentId)
    return true
  }

  function deleteBlock(id: string) {
    const block = blocks.value.find((b) => b.id === id)
    if (!block || !block.editable) return
    const agentId = block.agentId
    blocks.value = blocks.value.filter((b) => b.id !== id)
    if (selectedBlockId.value === id) selectedBlockId.value = null
    rebuildWorkBlocks(agentId)
  }

  function addBlock(agentId: string, type: ActivityType, startISO: string): string | null {
    const agent = agents.value.find((a) => String(a.id) === agentId)
    if (!agent) return null

    const start = snapTime(dayjs(startISO))
    const end = start.add(30, 'minute')

    const overlaps = blocks.value.some((b) => {
      if (b.agentId !== agentId || b.type === 'work') return false
      return start.isBefore(dayjs(b.end)) && end.isAfter(dayjs(b.start))
    })
    if (overlaps) return null

    const id = `new-${Date.now()}`
    blocks.value.push({
      id,
      agentId,
      type,
      start: start.toISOString(),
      end: end.toISOString(),
      editable: true,
    })
    selectedBlockId.value = id
    rebuildWorkBlocks(agentId)
    return id
  }

  /** 拖拽预览：直接修改位置 + 重建 Work */
  function updateBlockPreview(id: string, start: string, end: string) {
    const idx = blocks.value.findIndex((b) => b.id === id)
    if (idx === -1) return
    const agentId = blocks.value[idx].agentId
    blocks.value[idx] = { ...blocks.value[idx], start, end }
    rebuildWorkBlocks(agentId)
  }

  // ========== Work 块重建 ==========

  /**
   * 重新计算某坐席的 Work 块
   * 删除该坐席所有旧 Work 块，然后在活动块间隙重新填充
   */
  function rebuildWorkBlocks(agentId: string) {
    const agent = agents.value.find((a) => String(a.id) === agentId)
    if (!agent) return

    // 移除旧 Work 块
    blocks.value = blocks.value.filter((b) => !(b.agentId === agentId && b.type === 'work'))

    // 获取该坐席的活动块，按时间排序
    const agentBlocks = blocks.value
      .filter((b) => b.agentId === agentId)
      .sort((a, b) => dayjs(a.start).diff(dayjs(b.start)))

    // 班次边界
    const datePrefix = currentDate.value
    const [sh, sm] = agent.shiftStart.split(':').map(Number)
    const [eh, em] = agent.shiftEnd.split(':').map(Number)
    const shiftStart = dayjs(datePrefix).add(sh, 'hour').add(sm, 'minute')
    const shiftEnd = dayjs(datePrefix).add(eh, 'hour').add(em, 'minute')

    let cursor = shiftStart
    const newWorkBlocks: DisplayBlock[] = []

    for (const block of agentBlocks) {
      const bStart = dayjs(block.start)
      if (bStart.isAfter(cursor)) {
        newWorkBlocks.push({
          id: `work-${agentId}-${cursor.valueOf()}`,
          agentId,
          type: 'work',
          start: cursor.toISOString(),
          end: bStart.toISOString(),
          editable: false,
        })
      }
      const bEnd = dayjs(block.end)
      if (bEnd.isAfter(cursor)) cursor = bEnd
    }

    if (cursor.isBefore(shiftEnd)) {
      newWorkBlocks.push({
        id: `work-${agentId}-${cursor.valueOf()}`,
        agentId,
        type: 'work',
        start: cursor.toISOString(),
        end: shiftEnd.toISOString(),
        editable: false,
      })
    }

    blocks.value.push(...newWorkBlocks)
  }

  return {
    agents,
    blocks,
    selectedBlockId,
    loading,
    currentPlanId,
    currentDate,
    loadTimeline,
    getBlocksForAgent,
    selectBlock,
    moveBlock,
    resizeBlock,
    deleteBlock,
    addBlock,
    updateBlockPreview,
  }
})
