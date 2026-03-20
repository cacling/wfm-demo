/**
 * schedule.ts — Pinia 状态管理（排班数据的唯一数据源）
 *
 * 使用 Composition API 风格的 defineStore，管理：
 * - agents:          坐席列表（只读）
 * - activities:      活动列表（可增删改）
 * - selectedBlockId: 当前选中的块 ID
 *
 * 所有对活动的修改（移动/拉伸/新增/删除）都通过这里的 action 执行，
 * 修改 activities 后，依赖它的 computed（如 TimelineBody 中的 allBlocks）
 * 会自动触发 Work 块重新派生。
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import dayjs from 'dayjs'
import type { Agent, Activity, ActivityType, DisplayBlock } from '../types'
import { agents as mockAgents, activities as mockActivities } from '../mock-data'
import { deriveDisplayBlocks } from '../utils/rules'
import { snapTime } from '../utils/time'

/** 新增活动时的自增 ID 起始值 */
let nextId = 1000

export const useScheduleStore = defineStore('schedule', () => {
  // ========== 状态 ==========
  const agents = ref<Agent[]>(mockAgents)
  const activities = ref<Activity[]>([...mockActivities])
  const selectedBlockId = ref<string | null>(null)

  // ========== 派生查询 ==========

  /**
   * 获取某个坐席的所有展示块（Work + Activities）
   * 每次 activities 变化时调用方的 computed 会自动重新计算
   */
  function getDisplayBlocks(agentId: string): DisplayBlock[] {
    const agent = agents.value.find((a) => a.id === agentId)
    if (!agent) return []
    return deriveDisplayBlocks(agent, activities.value)
  }

  // ========== 选中操作 ==========

  function selectBlock(id: string | null) {
    selectedBlockId.value = id
  }

  // ========== 移动活动 ==========

  /**
   * 将活动整体平移 deltaMinutes 分钟
   * 会自动吸附到 15 分钟粒度，并校验：
   * - 不超出坐席班次边界
   * - 不与同坐席其他活动重叠
   *
   * @returns true=移动成功，false=校验不通过（位置不变）
   */
  function moveActivity(id: string, deltaMinutes: number): boolean {
    const idx = activities.value.findIndex((a) => a.id === id)
    if (idx === -1) return false
    const activity = activities.value[idx]

    const agent = agents.value.find((a) => a.id === activity.agentId)
    if (!agent) return false

    // 计算新位置：保持时长不变，起点偏移后吸附
    const duration = dayjs(activity.end).diff(dayjs(activity.start), 'minute')
    const newStart = snapTime(dayjs(activity.start).add(deltaMinutes, 'minute'))
    const newEnd = newStart.add(duration, 'minute')

    // 校验：不能超出班次范围
    if (newStart.isBefore(dayjs(agent.shiftStart))) return false
    if (newEnd.isAfter(dayjs(agent.shiftEnd))) return false

    // 校验：不能与同坐席的其他活动重叠
    const overlaps = activities.value.some((a) => {
      if (a.id === id || a.agentId !== activity.agentId) return false
      return newStart.isBefore(dayjs(a.end)) && newEnd.isAfter(dayjs(a.start))
    })
    if (overlaps) return false

    // 通过校验 → 更新位置
    activities.value[idx] = {
      ...activity,
      start: newStart.toISOString(),
      end: newEnd.toISOString(),
    }
    return true
  }

  // ========== 拉伸活动 ==========

  /**
   * 拉伸活动的左边或右边
   * edge='left'  → 调整开始时间（右边不动）
   * edge='right' → 调整结束时间（左边不动）
   */
  function resizeActivity(id: string, edge: 'left' | 'right', deltaMinutes: number): boolean {
    const idx = activities.value.findIndex((a) => a.id === id)
    if (idx === -1) return false
    const activity = activities.value[idx]

    const agent = agents.value.find((a) => a.id === activity.agentId)
    if (!agent) return false

    let newStart = dayjs(activity.start)
    let newEnd = dayjs(activity.end)

    if (edge === 'left') {
      newStart = snapTime(newStart.add(deltaMinutes, 'minute'))
    } else {
      newEnd = snapTime(newEnd.add(deltaMinutes, 'minute'))
    }

    // 校验：最小 15 分钟
    if (newEnd.diff(newStart, 'minute') < 15) return false
    // 校验：不超出班次
    if (newStart.isBefore(dayjs(agent.shiftStart))) return false
    if (newEnd.isAfter(dayjs(agent.shiftEnd))) return false

    // 校验：不重叠
    const overlaps = activities.value.some((a) => {
      if (a.id === id || a.agentId !== activity.agentId) return false
      return newStart.isBefore(dayjs(a.end)) && newEnd.isAfter(dayjs(a.start))
    })
    if (overlaps) return false

    activities.value[idx] = {
      ...activity,
      start: newStart.toISOString(),
      end: newEnd.toISOString(),
    }
    return true
  }

  // ========== 删除活动 ==========

  /** 删除活动 → 该时间段自动变回 Work（因为 Work 是派生的） */
  function deleteActivity(id: string) {
    activities.value = activities.value.filter((a) => a.id !== id)
    if (selectedBlockId.value === id) selectedBlockId.value = null
  }

  // ========== 新增活动 ==========

  /**
   * 在指定时间点新增一个 30 分钟的活动
   * @param agentId  - 坐席 ID
   * @param type     - 活动类型
   * @param startISO - 起始时间（会吸附到 15 分钟）
   * @returns 新活动的 ID，如果校验失败返回 null
   */
  function addActivity(agentId: string, type: ActivityType, startISO: string): string | null {
    const agent = agents.value.find((a) => a.id === agentId)
    if (!agent) return null

    const start = snapTime(dayjs(startISO))
    const end = start.add(30, 'minute')  // 默认时长 30 分钟

    // 校验
    if (start.isBefore(dayjs(agent.shiftStart))) return null
    if (end.isAfter(dayjs(agent.shiftEnd))) return null

    const overlaps = activities.value.some((a) => {
      if (a.agentId !== agentId) return false
      return start.isBefore(dayjs(a.end)) && end.isAfter(dayjs(a.start))
    })
    if (overlaps) return null

    const id = `act${nextId++}`
    activities.value.push({ id, agentId, type, start: start.toISOString(), end: end.toISOString() })
    selectedBlockId.value = id  // 自动选中新建的活动
    return id
  }

  // ========== 拖拽预览 ==========

  /**
   * 拖拽过程中的实时预览（直接修改位置，不做校验）
   * 松手后会先回滚到原始位置，再通过 moveActivity/resizeActivity 做正式提交
   */
  function updateActivityPreview(id: string, start: string, end: string) {
    const idx = activities.value.findIndex((a) => a.id === id)
    if (idx === -1) return
    activities.value[idx] = { ...activities.value[idx], start, end }
  }

  return {
    // 状态
    agents,
    activities,
    selectedBlockId,
    // 查询
    getDisplayBlocks,
    // 操作
    selectBlock,
    moveActivity,
    resizeActivity,
    deleteActivity,
    addActivity,
    updateActivityPreview,
  }
})
