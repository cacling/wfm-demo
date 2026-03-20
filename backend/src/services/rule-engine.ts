/**
 * rule-engine.ts — 规则引擎
 *
 * 从 DB 加载规则链（rule_chains → rule_bindings → rule_definitions），
 * 按 stage 和 execution_order 顺序执行对应的 handler。
 *
 * 四个阶段：
 * - generate:     排班生成时
 * - edit_preview:  拖拽即时校验
 * - edit_commit:   保存时全局校验
 * - publish:       发布前终检
 */

import { db } from '../db'
import * as s from '../db/schema'
import { eq, and } from 'drizzle-orm'
import dayjs from 'dayjs'

// ========== 类型 ==========

export interface RuleContext {
  planId: number
  date?: string
  assignmentId?: number
  blockId?: number
  activityId?: number
  targetRange?: { startTime: string; endTime: string }
  intentType?: string
}

export interface RuleResult {
  level: 'error' | 'warning' | 'info'
  ruleCode: string
  message: string
  confirmable: boolean
  targetType?: string
  targetId?: number
}

type RuleHandler = (ctx: RuleContext, params: any) => RuleResult[]

// ========== Handler 注册表 ==========

const handlers: Record<string, RuleHandler> = {}

function registerHandler(code: string, handler: RuleHandler) {
  handlers[code] = handler
}

// ========== 引擎主函数 ==========

export function executeRuleChain(stage: string, ctx: RuleContext): RuleResult[] {
  // 从 DB 加载该阶段的规则链
  const chains = db.select({
    chainId: s.ruleChains.id,
    order: s.ruleChains.executionOrder,
    stopOnError: s.ruleChains.stopOnError,
    bindingId: s.ruleBindings.id,
    enabled: s.ruleBindings.enabled,
    params: s.ruleBindings.params,
    defCode: s.ruleDefinitions.code,
    defName: s.ruleDefinitions.name,
    severity: s.ruleDefinitions.severityDefault,
  })
    .from(s.ruleChains)
    .innerJoin(s.ruleBindings, eq(s.ruleChains.bindingId, s.ruleBindings.id))
    .innerJoin(s.ruleDefinitions, eq(s.ruleBindings.definitionId, s.ruleDefinitions.id))
    .where(eq(s.ruleChains.stage, stage))
    .all()
    .sort((a, b) => a.order - b.order)

  const allResults: RuleResult[] = []

  for (const chain of chains) {
    if (!chain.enabled) continue

    const handler = handlers[chain.defCode]
    if (!handler) continue

    const params = chain.params ? JSON.parse(chain.params) : {}
    const results = handler(ctx, params)

    // 用规则定义的 severity 覆盖（如果 handler 没指定）
    for (const r of results) {
      if (!r.ruleCode) r.ruleCode = chain.defCode
    }

    allResults.push(...results)

    // 如果有错误且 stopOnError=true，终止链
    if (chain.stopOnError && results.some(r => r.level === 'error')) {
      break
    }
  }

  return allResults
}

// ========== Handler 实现 ==========

// --- edit_preview 阶段 ---

registerHandler('SNAP_ALIGNMENT', (ctx) => {
  // 吸附只是 info 级别提示，实际吸附在 edit-service 中完成
  return []
})

registerHandler('MIN_DURATION', (ctx, params) => {
  const minMinutes = params?.minMinutes || 15
  if (!ctx.targetRange) return []
  const dur = dayjs(ctx.targetRange.endTime).diff(dayjs(ctx.targetRange.startTime), 'minute')
  if (dur < minMinutes) {
    return [{ level: 'error', ruleCode: 'MIN_DURATION', message: `Block must be at least ${minMinutes} minutes (got ${dur}min)`, confirmable: false }]
  }
  return []
})

registerHandler('SHIFT_BOUNDARY', (ctx) => {
  if (!ctx.assignmentId || !ctx.targetRange) return []
  const entry = db.select().from(s.scheduleEntries).where(eq(s.scheduleEntries.id, ctx.assignmentId)).get()
  if (!entry?.shiftId) return []
  const shift = db.select().from(s.shifts).where(eq(s.shifts.id, entry.shiftId)).get()
  if (!shift) return []

  const [sh, sm] = shift.startTime.split(':').map(Number)
  const [eh, em] = shift.endTime.split(':').map(Number)
  const dayStart = dayjs(entry.date).startOf('day')
  const shiftStart = dayStart.add(sh, 'hour').add(sm, 'minute')
  const shiftEnd = dayStart.add(eh, 'hour').add(em, 'minute')
  const start = dayjs(ctx.targetRange.startTime)
  const end = dayjs(ctx.targetRange.endTime)

  if (start.isBefore(shiftStart) || end.isAfter(shiftEnd)) {
    return [{ level: 'error', ruleCode: 'SHIFT_BOUNDARY', message: `Outside shift ${shift.startTime}-${shift.endTime}`, confirmable: false }]
  }
  return []
})

registerHandler('ACTIVITY_COVER', (ctx) => {
  if (!ctx.assignmentId || !ctx.activityId || !ctx.targetRange) return []

  const blocks = db.select().from(s.scheduleBlocks)
    .where(eq(s.scheduleBlocks.entryId, ctx.assignmentId)).all()
  const start = dayjs(ctx.targetRange.startTime)
  const end = dayjs(ctx.targetRange.endTime)
  const results: RuleResult[] = []

  for (const b of blocks) {
    const bStart = dayjs(b.startTime)
    const bEnd = dayjs(b.endTime)
    if (!start.isBefore(bEnd) || !end.isAfter(bStart)) continue

    const act = db.select().from(s.activities).where(eq(s.activities.id, b.activityId)).get()
    if (act?.code === 'WORK') continue // Work 总是可覆盖

    const rule = db.select().from(s.activityCoverRules)
      .where(and(
        eq(s.activityCoverRules.sourceActivityId, ctx.activityId),
        eq(s.activityCoverRules.targetActivityId, b.activityId),
      )).get()

    if (!rule?.canCover) {
      results.push({
        level: 'error', ruleCode: 'ACTIVITY_COVER',
        message: `Cannot cover ${act?.name || 'activity'} at ${bStart.format('HH:mm')}-${bEnd.format('HH:mm')}`,
        confirmable: false, targetType: 'block', targetId: b.id,
      })
    }
  }
  return results
})

// --- edit_commit 阶段 ---

registerHandler('CONTRACT_DAILY_HOURS', (ctx) => {
  if (!ctx.assignmentId) return []
  const entry = db.select().from(s.scheduleEntries).where(eq(s.scheduleEntries.id, ctx.assignmentId)).get()
  if (!entry) return []
  const agent = db.select().from(s.agents).where(eq(s.agents.id, entry.agentId)).get()
  if (!agent?.contractId) return []
  const contract = db.select().from(s.contracts).where(eq(s.contracts.id, agent.contractId)).get()
  if (!contract) return []

  const blocks = db.select().from(s.scheduleBlocks).where(eq(s.scheduleBlocks.entryId, entry.id)).all()
  const allAct = db.select().from(s.activities).all()
  const actMap = new Map(allAct.map(a => [a.id, a]))

  const totalPaid = blocks.reduce((sum, b) => {
    const act = actMap.get(b.activityId)
    return act?.isPaid ? sum + dayjs(b.endTime).diff(dayjs(b.startTime), 'minute') : sum
  }, 0)
  const hours = totalPaid / 60
  const results: RuleResult[] = []

  if (hours > contract.maxHoursDay) {
    results.push({ level: 'error', ruleCode: 'CONTRACT_DAILY_HOURS', message: `Daily ${hours.toFixed(1)}h exceeds max ${contract.maxHoursDay}h`, confirmable: false })
  }
  if (hours < contract.minHoursDay) {
    results.push({ level: 'warning', ruleCode: 'CONTRACT_DAILY_HOURS', message: `Daily ${hours.toFixed(1)}h below min ${contract.minHoursDay}h`, confirmable: true })
  }
  return results
})

registerHandler('MEAL_REQUIRED', (ctx) => {
  if (!ctx.assignmentId) return []
  const entry = db.select().from(s.scheduleEntries).where(eq(s.scheduleEntries.id, ctx.assignmentId)).get()
  if (!entry) return []
  const agent = db.select().from(s.agents).where(eq(s.agents.id, entry.agentId)).get()
  if (!agent?.contractId) return []
  const contract = db.select().from(s.contracts).where(eq(s.contracts.id, agent.contractId)).get()
  if (!contract?.lunchRequired) return []

  const blocks = db.select().from(s.scheduleBlocks).where(eq(s.scheduleBlocks.entryId, entry.id)).all()
  const hasLunch = blocks.some(b => {
    const act = db.select().from(s.activities).where(eq(s.activities.id, b.activityId)).get()
    return act?.code === 'LUNCH'
  })
  if (!hasLunch) {
    return [{ level: 'warning', ruleCode: 'MEAL_REQUIRED', message: 'Lunch break required by contract', confirmable: true }]
  }
  return []
})

registerHandler('MIN_BREAK', (ctx) => {
  if (!ctx.assignmentId) return []
  const entry = db.select().from(s.scheduleEntries).where(eq(s.scheduleEntries.id, ctx.assignmentId)).get()
  if (!entry) return []
  const agent = db.select().from(s.agents).where(eq(s.agents.id, entry.agentId)).get()
  if (!agent?.contractId) return []
  const contract = db.select().from(s.contracts).where(eq(s.contracts.id, agent.contractId)).get()
  if (!contract) return []

  const blocks = db.select().from(s.scheduleBlocks).where(eq(s.scheduleBlocks.entryId, entry.id)).all()
  const breakMin = blocks.reduce((sum, b) => {
    const act = db.select().from(s.activities).where(eq(s.activities.id, b.activityId)).get()
    return act?.code === 'BREAK' ? sum + dayjs(b.endTime).diff(dayjs(b.startTime), 'minute') : sum
  }, 0)

  if (breakMin < contract.minBreakMinutes) {
    return [{ level: 'warning', ruleCode: 'MIN_BREAK', message: `Break ${breakMin}min below minimum ${contract.minBreakMinutes}min`, confirmable: true }]
  }
  return []
})

registerHandler('GROUP_SYNC', (ctx) => {
  if (!ctx.planId || !ctx.date) return []

  const entries = db.select({
    agentId: s.scheduleEntries.agentId,
    shiftId: s.scheduleEntries.shiftId,
    groupId: s.agents.groupId,
  })
    .from(s.scheduleEntries)
    .innerJoin(s.agents, eq(s.scheduleEntries.agentId, s.agents.id))
    .where(and(eq(s.scheduleEntries.planId, ctx.planId), eq(s.scheduleEntries.date, ctx.date!)))
    .all()

  const allGroups = db.select().from(s.groups).all()
  const allShifts = db.select().from(s.shifts).all()
  const shiftMap = new Map(allShifts.map(sh => [sh.id, sh]))
  const results: RuleResult[] = []

  for (const group of allGroups) {
    const members = entries.filter(e => e.groupId === group.id)
    if (members.length < 2) continue

    const starts: number[] = []
    const ends: number[] = []
    for (const m of members) {
      const sh = m.shiftId ? shiftMap.get(m.shiftId) : null
      if (!sh) continue
      const [h1, m1] = sh.startTime.split(':').map(Number)
      const [h2, m2] = sh.endTime.split(':').map(Number)
      starts.push(h1 * 60 + m1)
      ends.push(h2 * 60 + m2)
    }
    if (starts.length < 2) continue

    const startDiff = Math.max(...starts) - Math.min(...starts)
    const endDiff = Math.max(...ends) - Math.min(...ends)

    if (group.maxStartDiffMinutes && startDiff > group.maxStartDiffMinutes) {
      results.push({ level: 'warning', ruleCode: 'GROUP_SYNC', message: `${group.name}: start diff ${startDiff}min > max ${group.maxStartDiffMinutes}min`, confirmable: true })
    }
    if (group.maxEndDiffMinutes && endDiff > group.maxEndDiffMinutes) {
      results.push({ level: 'warning', ruleCode: 'GROUP_SYNC', message: `${group.name}: end diff ${endDiff}min > max ${group.maxEndDiffMinutes}min`, confirmable: true })
    }
  }
  return results
})

// --- generate 阶段 ---

registerHandler('LEAVE_FILTER', () => [])
registerHandler('CONTRACT_SHIFT_AVAIL', () => [])
registerHandler('STAFFING_MINIMUM', () => [])

// --- publish 阶段 ---

registerHandler('WEEK_HOURS', (ctx) => {
  // 简化：在发布时检查该方案日期范围内的周工时
  if (!ctx.planId) return []
  const plan = db.select().from(s.schedulePlans).where(eq(s.schedulePlans.id, ctx.planId)).get()
  if (!plan) return []

  const entries = db.select().from(s.scheduleEntries)
    .where(eq(s.scheduleEntries.planId, ctx.planId)).all()
  const allAct = db.select().from(s.activities).all()
  const actMap = new Map(allAct.map(a => [a.id, a]))
  const results: RuleResult[] = []

  // 按 agent 聚合
  const agentHours = new Map<number, number>()
  for (const entry of entries) {
    const blocks = db.select().from(s.scheduleBlocks)
      .where(eq(s.scheduleBlocks.entryId, entry.id)).all()
    const paid = blocks.reduce((sum, b) => {
      const act = actMap.get(b.activityId)
      return act?.isPaid ? sum + dayjs(b.endTime).diff(dayjs(b.startTime), 'minute') : sum
    }, 0)
    agentHours.set(entry.agentId, (agentHours.get(entry.agentId) || 0) + paid)
  }

  const agents = db.select().from(s.agents).all()
  for (const agent of agents) {
    if (!agent.contractId) continue
    const contract = db.select().from(s.contracts).where(eq(s.contracts.id, agent.contractId)).get()
    if (!contract) continue
    const totalHours = (agentHours.get(agent.id) || 0) / 60
    if (totalHours > contract.maxHoursWeek) {
      results.push({ level: 'error', ruleCode: 'WEEK_HOURS', message: `${agent.name}: week ${totalHours.toFixed(1)}h > max ${contract.maxHoursWeek}h`, confirmable: false })
    }
  }
  return results
})
