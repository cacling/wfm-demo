/**
 * validator.ts — 排班校验引擎
 *
 * 校验规则分 4 类：
 * 1. 活动覆盖规则（activity_priority）— 拖拽时即时校验
 * 2. 合同规则（contract）— 工时上下限、休息、午餐
 * 3. 班组同步规则（group_sync）— 同组成员时间差异
 * 4. 人力覆盖率（staffing）— 某时段最低人数
 *
 * 校验结果分 3 级：error（不可保存）、warning（可确认后保存）、info（提示）
 */

import { db } from '../db'
import * as s from '../db/schema'
import { eq, and } from 'drizzle-orm'
import dayjs from 'dayjs'

export interface ValidationItem {
  agentId: number | null
  agentName?: string
  date: string
  level: 'error' | 'warning' | 'info'
  ruleType: 'contract' | 'cover' | 'group_sync' | 'staffing' | 'activity_priority'
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationItem[]
  warnings: ValidationItem[]
  infos: ValidationItem[]
}

/**
 * 对排班方案的某一天做全局校验
 */
export function validatePlanDay(planId: number, date: string): ValidationResult {
  const items: ValidationItem[] = []

  // 获取当天所有排班条目
  const entries = db.select({
    entryId: s.scheduleEntries.id,
    agentId: s.scheduleEntries.agentId,
    agentName: s.agents.name,
    shiftId: s.scheduleEntries.shiftId,
    contractId: s.agents.contractId,
    groupId: s.agents.groupId,
  })
    .from(s.scheduleEntries)
    .innerJoin(s.agents, eq(s.scheduleEntries.agentId, s.agents.id))
    .where(and(eq(s.scheduleEntries.planId, planId), eq(s.scheduleEntries.date, date)))
    .all()

  // 预加载
  const allContracts = db.select().from(s.contracts).all()
  const contractMap = new Map(allContracts.map((c) => [c.id, c]))
  const allGroups = db.select().from(s.groups).all()
  const groupMap = new Map(allGroups.map((g) => [g.id, g]))
  const allActivities = db.select().from(s.activities).all()
  const activityMap = new Map(allActivities.map((a) => [a.id, a]))
  const allShifts = db.select().from(s.shifts).all()
  const shiftMap = new Map(allShifts.map((sh) => [sh.id, sh]))

  for (const entry of entries) {
    const blocks = db.select().from(s.scheduleBlocks)
      .where(eq(s.scheduleBlocks.entryId, entry.entryId))
      .all()

    const contract = entry.contractId ? contractMap.get(entry.contractId) : null
    const shift = entry.shiftId ? shiftMap.get(entry.shiftId) : null

    // === 1. 合同校验：工时 ===
    if (contract) {
      const totalMinutes = blocks.reduce((sum, b) => {
        const activity = activityMap.get(b.activityId)
        if (activity?.isPaid) {
          return sum + dayjs(b.endTime).diff(dayjs(b.startTime), 'minute')
        }
        return sum
      }, 0)
      const totalHours = totalMinutes / 60

      if (totalHours < contract.minHoursDay) {
        items.push({
          agentId: entry.agentId,
          agentName: entry.agentName,
          date,
          level: 'error',
          ruleType: 'contract',
          message: `Daily hours ${totalHours.toFixed(1)}h below minimum ${contract.minHoursDay}h`,
        })
      }
      if (totalHours > contract.maxHoursDay) {
        items.push({
          agentId: entry.agentId,
          agentName: entry.agentName,
          date,
          level: 'error',
          ruleType: 'contract',
          message: `Daily hours ${totalHours.toFixed(1)}h exceeds maximum ${contract.maxHoursDay}h`,
        })
      }

      // === 2. 合同校验：午餐 ===
      if (contract.lunchRequired) {
        const hasLunch = blocks.some((b) => {
          const activity = activityMap.get(b.activityId)
          return activity?.name === 'Lunch'
        })
        if (!hasLunch) {
          items.push({
            agentId: entry.agentId,
            agentName: entry.agentName,
            date,
            level: 'warning',
            ruleType: 'contract',
            message: 'Lunch break is required by contract but missing',
          })
        }
      }

      // === 3. 合同校验：最小休息时间 ===
      const breakMinutes = blocks.reduce((sum, b) => {
        const activity = activityMap.get(b.activityId)
        if (activity?.name === 'Break') {
          return sum + dayjs(b.endTime).diff(dayjs(b.startTime), 'minute')
        }
        return sum
      }, 0)
      if (breakMinutes < contract.minBreakMinutes) {
        items.push({
          agentId: entry.agentId,
          agentName: entry.agentName,
          date,
          level: 'warning',
          ruleType: 'contract',
          message: `Total break time ${breakMinutes}min below minimum ${contract.minBreakMinutes}min`,
        })
      }
    }
  }

  // === 4. 班组同步校验 ===
  const groupEntries = new Map<number, typeof entries>()
  for (const entry of entries) {
    if (!entry.groupId) continue
    const list = groupEntries.get(entry.groupId) || []
    list.push(entry)
    groupEntries.set(entry.groupId, list)
  }

  for (const [groupId, members] of groupEntries) {
    const group = groupMap.get(groupId)
    if (!group || members.length < 2) continue

    // 收集班次开始/结束时间
    const startTimes: number[] = []
    const endTimes: number[] = []
    for (const m of members) {
      const shift = m.shiftId ? shiftMap.get(m.shiftId) : null
      if (!shift) continue
      const [sh, sm] = shift.startTime.split(':').map(Number)
      const [eh, em] = shift.endTime.split(':').map(Number)
      startTimes.push(sh * 60 + sm)
      endTimes.push(eh * 60 + em)
    }

    if (startTimes.length >= 2) {
      const startDiff = Math.max(...startTimes) - Math.min(...startTimes)
      if (group.maxStartDiffMinutes && startDiff > group.maxStartDiffMinutes) {
        items.push({
          agentId: null,
          date,
          level: 'warning',
          ruleType: 'group_sync',
          message: `Group "${group.name}": start time diff ${startDiff}min exceeds max ${group.maxStartDiffMinutes}min`,
        })
      }

      const endDiff = Math.max(...endTimes) - Math.min(...endTimes)
      if (group.maxEndDiffMinutes && endDiff > group.maxEndDiffMinutes) {
        items.push({
          agentId: null,
          date,
          level: 'warning',
          ruleType: 'group_sync',
          message: `Group "${group.name}": end time diff ${endDiff}min exceeds max ${group.maxEndDiffMinutes}min`,
        })
      }
    }
  }

  // === 5. 人力覆盖率校验 ===
  const requirements = db.select().from(s.staffingRequirements)
    .where(and(eq(s.staffingRequirements.planId, planId), eq(s.staffingRequirements.date, date)))
    .all()

  for (const req of requirements) {
    const reqStart = dayjs(req.startTime)
    const reqEnd = dayjs(req.endTime)
    // 找 Work 活动 ID
    const workActivity = allActivities.find((a) => a.name === 'Work')
    if (!workActivity) continue

    // 统计该时段有多少人在做 Work
    let count = 0
    for (const entry of entries) {
      const blocks = db.select().from(s.scheduleBlocks)
        .where(eq(s.scheduleBlocks.entryId, entry.entryId))
        .all()

      const isWorking = blocks.some((b) => {
        if (b.activityId !== workActivity.id) return false
        return dayjs(b.startTime).isBefore(reqEnd) && dayjs(b.endTime).isAfter(reqStart)
      })
      if (isWorking) count++
    }

    if (count < req.minAgents) {
      items.push({
        agentId: null,
        date,
        level: 'error',
        ruleType: 'staffing',
        message: `Staffing ${req.startTime.slice(11, 16)}-${req.endTime.slice(11, 16)}: ${count} agents working, need ${req.minAgents}`,
      })
    }
  }

  const errors = items.filter((i) => i.level === 'error')
  const warnings = items.filter((i) => i.level === 'warning')
  const infos = items.filter((i) => i.level === 'info')

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    infos,
  }
}

/**
 * 检查活动覆盖规则：sourceActivity 能否覆盖 targetActivity？
 */
export function canActivityCover(sourceActivityId: number, targetActivityId: number): boolean {
  if (sourceActivityId === targetActivityId) return true

  const rule = db.select().from(s.activityCoverRules)
    .where(and(
      eq(s.activityCoverRules.sourceActivityId, sourceActivityId),
      eq(s.activityCoverRules.targetActivityId, targetActivityId),
    ))
    .get()

  return rule?.canCover ?? false
}
