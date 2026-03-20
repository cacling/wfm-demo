/**
 * edit-service.ts — 统一编辑服务
 *
 * 所有排班编辑操作统一通过 EditIntent 进入，支持：
 * - preview: 执行变更 + 局部校验，不落库，返回预览结果
 * - commit:  执行变更 + 全局校验 + 落库 + 记录历史 + version bump
 *
 * 编辑流程：
 * 1. 前端拖拽完 → POST preview → 返回校验结果
 * 2. 用户确认   → POST commit  → 落库
 * 3. 有 warning → POST confirm → 强制落库
 */

import { db } from '../db'
import * as s from '../db/schema'
import { eq, and } from 'drizzle-orm'
import dayjs from 'dayjs'
import { snapTime } from './snap'
import { executeRuleChain, type RuleContext, type RuleResult } from './rule-engine'

// ========== 类型定义 ==========

export interface EditIntentCommand {
  clientRequestId?: string
  intentType: 'INSERT_ACTIVITY' | 'MOVE_BLOCK' | 'RESIZE_LEFT' | 'RESIZE_RIGHT' | 'COVER_WITH_ACTIVITY' | 'REPLACE_WITH_LEAVE' | 'DELETE_BLOCK'
  planId: number
  assignmentId: number
  blockId?: number
  activityId?: number
  leaveTypeId?: number
  targetRange?: { startTime: string; endTime: string }
  saveMode: 'preview' | 'commit'
  versionNo: number
  confirmWarnings?: boolean
}

interface ValidationItem {
  level: 'error' | 'warning' | 'info'
  ruleCode: string
  message: string
  confirmable: boolean
  targetType?: string
  targetId?: number
}

export interface EditResult {
  operationId: number | null
  status: 'preview_ready' | 'committed' | 'rejected'
  versionNo: number
  validation: {
    valid: boolean
    errors: ValidationItem[]
    warnings: ValidationItem[]
    infos: ValidationItem[]
  }
  updatedBlocks: any[]
  refreshScope: { type: string; ids: number[] }
}

// ========== 主入口 ==========

export function executeEditIntent(cmd: EditIntentCommand): EditResult {
  const plan = db.select().from(s.schedulePlans).where(eq(s.schedulePlans.id, cmd.planId)).get()
  if (!plan) throw new Error('Plan not found')

  // 乐观锁检查
  if (cmd.versionNo && cmd.versionNo !== plan.versionNo) {
    return {
      operationId: null,
      status: 'rejected',
      versionNo: plan.versionNo,
      validation: {
        valid: false,
        errors: [{ level: 'error', ruleCode: 'VERSION_CONFLICT', message: `Version conflict: expected ${cmd.versionNo}, current ${plan.versionNo}`, confirmable: false }],
        warnings: [], infos: [],
      },
      updatedBlocks: [],
      refreshScope: { type: 'plan', ids: [cmd.planId] },
    }
  }

  const entry = db.select().from(s.scheduleEntries).where(eq(s.scheduleEntries.id, cmd.assignmentId)).get()
  if (!entry) throw new Error('Assignment not found')

  // 执行变更（在内存中计算，不立即落库）
  const mutations = computeMutations(cmd, entry)

  // 局部校验（edit_preview）— 使用规则引擎
  const ruleCtx: RuleContext = {
    planId: cmd.planId,
    date: entry.date,
    assignmentId: cmd.assignmentId,
    blockId: cmd.blockId,
    activityId: cmd.activityId,
    targetRange: cmd.targetRange ? {
      startTime: snapTime(cmd.targetRange.startTime),
      endTime: snapTime(cmd.targetRange.endTime),
    } : undefined,
    intentType: cmd.intentType,
  }
  const localResults = executeRuleChain('edit_preview', ruleCtx)
  const localValidation = toValidation(localResults)

  // 如果是 preview 模式，返回预览结果
  if (cmd.saveMode === 'preview') {
    return {
      operationId: null,
      status: localValidation.errors.length > 0 ? 'rejected' : 'preview_ready',
      versionNo: plan.versionNo,
      validation: localValidation,
      updatedBlocks: previewBlocks(entry.id, mutations),
      refreshScope: { type: 'assignment', ids: [entry.id] },
    }
  }

  // commit 模式：先做全局校验（edit_commit）— 使用规则引擎
  const globalResults = executeRuleChain('edit_commit', ruleCtx)
  const globalValidation = toValidation(globalResults)
  const allErrors = [...localValidation.errors, ...globalValidation.errors]
  const allWarnings = [...localValidation.warnings, ...globalValidation.warnings]
  const allInfos = [...localValidation.infos, ...globalValidation.infos]

  // 有错误 → 拒绝
  if (allErrors.length > 0) {
    return {
      operationId: null,
      status: 'rejected',
      versionNo: plan.versionNo,
      validation: { valid: false, errors: allErrors, warnings: allWarnings, infos: allInfos },
      updatedBlocks: [],
      refreshScope: { type: 'assignment', ids: [entry.id] },
    }
  }

  // 有 warning 且未确认 → 拒绝（需要二次确认）
  if (allWarnings.length > 0 && !cmd.confirmWarnings) {
    return {
      operationId: null,
      status: 'rejected',
      versionNo: plan.versionNo,
      validation: { valid: false, errors: [], warnings: allWarnings, infos: allInfos },
      updatedBlocks: previewBlocks(entry.id, mutations),
      refreshScope: { type: 'assignment', ids: [entry.id] },
    }
  }

  // 通过校验 → 落库
  applyMutations(mutations)
  rebuildWorkBlocks(entry.id)

  // 记录变更事务
  const [op] = db.insert(s.changeOperations).values({
    planId: cmd.planId,
    intentType: cmd.intentType,
    saveMode: 'commit',
    status: 'committed',
    clientRequestId: cmd.clientRequestId || null,
    versionNo: plan.versionNo + 1,
  }).returning().all()

  for (const m of mutations.items) {
    db.insert(s.changeItems).values({
      operationId: op.id,
      assignmentId: entry.id,
      blockId: m.blockId,
      changeType: m.type,
      beforeJson: m.before ? JSON.stringify(m.before) : null,
      afterJson: m.after ? JSON.stringify(m.after) : null,
    }).run()
  }

  // version bump
  db.update(s.schedulePlans)
    .set({ versionNo: plan.versionNo + 1, status: 'editing' })
    .where(eq(s.schedulePlans.id, cmd.planId))
    .run()

  // 返回更新后的块
  const updatedBlocks = getEntryBlocks(entry.id)

  return {
    operationId: op.id,
    status: 'committed',
    versionNo: plan.versionNo + 1,
    validation: { valid: true, errors: [], warnings: allWarnings, infos: allInfos },
    updatedBlocks,
    refreshScope: { type: 'assignment', ids: [entry.id] },
  }
}

// ========== 变更计算 ==========

interface MutationPlan {
  items: { type: 'add' | 'update' | 'delete'; blockId?: number; before?: any; after?: any; data?: any }[]
}

function computeMutations(cmd: EditIntentCommand, entry: any): MutationPlan {
  const items: MutationPlan['items'] = []

  switch (cmd.intentType) {
    case 'INSERT_ACTIVITY': {
      if (!cmd.activityId || !cmd.targetRange) break
      items.push({
        type: 'add',
        data: {
          entryId: entry.id,
          activityId: cmd.activityId,
          startTime: snapTime(cmd.targetRange.startTime),
          endTime: snapTime(cmd.targetRange.endTime),
          source: 'manual',
          locked: false,
        },
      })
      break
    }
    case 'MOVE_BLOCK': {
      if (!cmd.blockId || !cmd.targetRange) break
      const block = db.select().from(s.scheduleBlocks).where(eq(s.scheduleBlocks.id, cmd.blockId)).get()
      if (!block) break
      items.push({
        type: 'update',
        blockId: cmd.blockId,
        before: { startTime: block.startTime, endTime: block.endTime },
        after: { startTime: snapTime(cmd.targetRange.startTime), endTime: snapTime(cmd.targetRange.endTime) },
      })
      break
    }
    case 'RESIZE_LEFT': {
      if (!cmd.blockId || !cmd.targetRange) break
      const block = db.select().from(s.scheduleBlocks).where(eq(s.scheduleBlocks.id, cmd.blockId)).get()
      if (!block) break
      items.push({
        type: 'update',
        blockId: cmd.blockId,
        before: { startTime: block.startTime, endTime: block.endTime },
        after: { startTime: snapTime(cmd.targetRange.startTime), endTime: block.endTime },
      })
      break
    }
    case 'RESIZE_RIGHT': {
      if (!cmd.blockId || !cmd.targetRange) break
      const block = db.select().from(s.scheduleBlocks).where(eq(s.scheduleBlocks.id, cmd.blockId)).get()
      if (!block) break
      items.push({
        type: 'update',
        blockId: cmd.blockId,
        before: { startTime: block.startTime, endTime: block.endTime },
        after: { startTime: block.startTime, endTime: snapTime(cmd.targetRange.endTime) },
      })
      break
    }
    case 'DELETE_BLOCK': {
      if (!cmd.blockId) break
      const block = db.select().from(s.scheduleBlocks).where(eq(s.scheduleBlocks.id, cmd.blockId)).get()
      if (!block) break
      items.push({
        type: 'delete',
        blockId: cmd.blockId,
        before: { activityId: block.activityId, startTime: block.startTime, endTime: block.endTime },
      })
      break
    }
    case 'COVER_WITH_ACTIVITY': {
      if (!cmd.activityId || !cmd.targetRange) break
      items.push({
        type: 'add',
        data: {
          entryId: entry.id,
          activityId: cmd.activityId,
          startTime: snapTime(cmd.targetRange.startTime),
          endTime: snapTime(cmd.targetRange.endTime),
          source: 'manual',
          locked: false,
        },
      })
      break
    }
    case 'REPLACE_WITH_LEAVE': {
      // 删除该时间段内的所有非锁定块，插入休假块
      if (!cmd.targetRange) break
      const blocks = db.select().from(s.scheduleBlocks)
        .where(eq(s.scheduleBlocks.entryId, entry.id)).all()
      const rangeStart = dayjs(cmd.targetRange.startTime)
      const rangeEnd = dayjs(cmd.targetRange.endTime)

      for (const b of blocks) {
        if (b.locked) continue
        const bStart = dayjs(b.startTime)
        const bEnd = dayjs(b.endTime)
        if (bStart.isBefore(rangeEnd) && bEnd.isAfter(rangeStart)) {
          items.push({ type: 'delete', blockId: b.id, before: { activityId: b.activityId, startTime: b.startTime, endTime: b.endTime } })
        }
      }

      // 插入 Sick Leave 活动（用 SICK_LEAVE code 查找）
      const sickLeave = db.select().from(s.activities).where(eq(s.activities.code, 'SICK_LEAVE')).get()
      if (sickLeave) {
        items.push({
          type: 'add',
          data: {
            entryId: entry.id,
            activityId: sickLeave.id,
            startTime: cmd.targetRange.startTime,
            endTime: cmd.targetRange.endTime,
            source: 'leave',
            locked: false,
          },
        })
      }
      break
    }
  }

  return { items }
}

// ========== RuleResult → Validation 转换 ==========

function toValidation(results: RuleResult[]): EditResult['validation'] {
  const errors = results.filter(r => r.level === 'error').map(r => ({ ...r }))
  const warnings = results.filter(r => r.level === 'warning').map(r => ({ ...r }))
  const infos = results.filter(r => r.level === 'info').map(r => ({ ...r }))
  return { valid: errors.length === 0, errors, warnings, infos }
}

// ========== 以下为旧代码保留备用 ==========

function _runLocalValidation_legacy(cmd: EditIntentCommand, entry: any, mutations: MutationPlan): EditResult['validation'] {
  const errors: ValidationItem[] = []
  const warnings: ValidationItem[] = []
  const infos: ValidationItem[] = []

  for (const m of mutations.items) {
    if (m.type === 'add' || m.type === 'update') {
      const start = dayjs(m.after?.startTime || m.data?.startTime)
      const end = dayjs(m.after?.endTime || m.data?.endTime)

      // MIN_DURATION: 最小 15 分钟
      if (end.diff(start, 'minute') < 15) {
        errors.push({ level: 'error', ruleCode: 'MIN_DURATION', message: 'Block must be at least 15 minutes', confirmable: false })
      }

      // SHIFT_BOUNDARY: 不能超出班次边界
      if (entry.shiftId) {
        const shift = db.select().from(s.shifts).where(eq(s.shifts.id, entry.shiftId)).get()
        if (shift) {
          const [sh, sm] = shift.startTime.split(':').map(Number)
          const [eh, em] = shift.endTime.split(':').map(Number)
          const dayStart = dayjs(entry.date).startOf('day')
          const shiftStart = dayStart.add(sh, 'hour').add(sm, 'minute')
          const shiftEnd = dayStart.add(eh, 'hour').add(em, 'minute')
          if (start.isBefore(shiftStart) || end.isAfter(shiftEnd)) {
            errors.push({ level: 'error', ruleCode: 'SHIFT_BOUNDARY', message: `Block ${start.format('HH:mm')}-${end.format('HH:mm')} outside shift ${shift.startTime}-${shift.endTime}`, confirmable: false })
          }
        }
      }

      // ACTIVITY_COVER: 检查活动覆盖规则
      if (m.type === 'add' && m.data?.activityId) {
        const existingBlocks = db.select().from(s.scheduleBlocks)
          .where(eq(s.scheduleBlocks.entryId, entry.id)).all()

        for (const existing of existingBlocks) {
          const eStart = dayjs(existing.startTime)
          const eEnd = dayjs(existing.endTime)
          if (start.isBefore(eEnd) && end.isAfter(eStart)) {
            // 有重叠，检查覆盖规则
            const coverRule = db.select().from(s.activityCoverRules)
              .where(and(
                eq(s.activityCoverRules.sourceActivityId, m.data.activityId),
                eq(s.activityCoverRules.targetActivityId, existing.activityId),
              )).get()

            const targetActivity = db.select().from(s.activities).where(eq(s.activities.id, existing.activityId)).get()

            if (!coverRule?.canCover && targetActivity?.code !== 'WORK') {
              errors.push({
                level: 'error',
                ruleCode: 'ACTIVITY_COVER',
                message: `Cannot cover ${targetActivity?.name || 'Unknown'} at ${eStart.format('HH:mm')}-${eEnd.format('HH:mm')}`,
                confirmable: false,
                targetType: 'block',
                targetId: existing.id,
              })
            }
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings, infos }
}

// ========== 全局校验 ==========

function runGlobalValidation(cmd: EditIntentCommand, entry: any, mutations: MutationPlan): EditResult['validation'] {
  const errors: ValidationItem[] = []
  const warnings: ValidationItem[] = []
  const infos: ValidationItem[] = []

  const agent = db.select().from(s.agents).where(eq(s.agents.id, entry.agentId)).get()
  if (!agent?.contractId) return { valid: true, errors, warnings, infos }

  const contract = db.select().from(s.contracts).where(eq(s.contracts.id, agent.contractId)).get()
  if (!contract) return { valid: true, errors, warnings, infos }

  // 模拟应用变更后的块列表来校验
  const currentBlocks = db.select().from(s.scheduleBlocks)
    .where(eq(s.scheduleBlocks.entryId, entry.id)).all()
  const allActivities = db.select().from(s.activities).all()
  const actMap = new Map(allActivities.map(a => [a.id, a]))

  // 简化：用当前块列表做校验（实际应用变更后再算）
  let totalPaidMinutes = 0
  let breakMinutes = 0
  let hasLunch = false

  for (const b of currentBlocks) {
    const act = actMap.get(b.activityId)
    const dur = dayjs(b.endTime).diff(dayjs(b.startTime), 'minute')
    if (act?.isPaid) totalPaidMinutes += dur
    if (act?.code === 'BREAK') breakMinutes += dur
    if (act?.code === 'LUNCH') hasLunch = true
  }

  const totalHours = totalPaidMinutes / 60
  if (totalHours > contract.maxHoursDay) {
    errors.push({ level: 'error', ruleCode: 'CONTRACT_DAILY_HOURS', message: `Daily paid hours ${totalHours.toFixed(1)}h exceeds max ${contract.maxHoursDay}h`, confirmable: false })
  }
  if (totalHours < contract.minHoursDay) {
    warnings.push({ level: 'warning', ruleCode: 'CONTRACT_DAILY_HOURS', message: `Daily paid hours ${totalHours.toFixed(1)}h below min ${contract.minHoursDay}h`, confirmable: true })
  }
  if (contract.lunchRequired && !hasLunch) {
    warnings.push({ level: 'warning', ruleCode: 'MEAL_REQUIRED', message: 'Lunch break required but missing', confirmable: true })
  }
  if (breakMinutes < contract.minBreakMinutes) {
    warnings.push({ level: 'warning', ruleCode: 'MIN_BREAK', message: `Break time ${breakMinutes}min below minimum ${contract.minBreakMinutes}min`, confirmable: true })
  }

  return { valid: errors.length === 0, errors, warnings, infos }
}

// ========== 变更应用 ==========

function applyMutations(mutations: MutationPlan) {
  for (const m of mutations.items) {
    if (m.type === 'add' && m.data) {
      db.insert(s.scheduleBlocks).values(m.data).run()
    } else if (m.type === 'update' && m.blockId && m.after) {
      db.update(s.scheduleBlocks).set(m.after).where(eq(s.scheduleBlocks.id, m.blockId)).run()
    } else if (m.type === 'delete' && m.blockId) {
      db.delete(s.scheduleBlocks).where(eq(s.scheduleBlocks.id, m.blockId)).run()
    }
  }
}

// ========== Work 块重建 ==========

function rebuildWorkBlocks(entryId: number) {
  const entry = db.select().from(s.scheduleEntries).where(eq(s.scheduleEntries.id, entryId)).get()
  if (!entry?.shiftId) return
  const shift = db.select().from(s.shifts).where(eq(s.shifts.id, entry.shiftId)).get()
  if (!shift) return
  const workAct = db.select().from(s.activities).where(eq(s.activities.code, 'WORK')).get()
  if (!workAct) return

  // 删除旧 Work 块
  const all = db.select().from(s.scheduleBlocks).where(eq(s.scheduleBlocks.entryId, entryId)).all()
  for (const b of all) {
    if (b.activityId === workAct.id) db.delete(s.scheduleBlocks).where(eq(s.scheduleBlocks.id, b.id)).run()
  }

  // 重新填充
  const remaining = db.select().from(s.scheduleBlocks)
    .where(eq(s.scheduleBlocks.entryId, entryId)).all()
    .sort((a, b) => dayjs(a.startTime).diff(dayjs(b.startTime)))

  const [sh, sm] = shift.startTime.split(':').map(Number)
  const [eh, em] = shift.endTime.split(':').map(Number)
  const dayStart = dayjs(entry.date).startOf('day')
  const shiftStart = dayStart.add(sh, 'hour').add(sm, 'minute')
  const shiftEnd = dayStart.add(eh, 'hour').add(em, 'minute')

  let cursor = shiftStart
  for (const b of remaining) {
    const bStart = dayjs(b.startTime)
    if (bStart.isAfter(cursor)) {
      db.insert(s.scheduleBlocks).values({
        entryId, activityId: workAct.id,
        startTime: cursor.toISOString(), endTime: bStart.toISOString(),
        source: 'algorithm', locked: false,
      }).run()
    }
    const bEnd = dayjs(b.endTime)
    if (bEnd.isAfter(cursor)) cursor = bEnd
  }
  if (cursor.isBefore(shiftEnd)) {
    db.insert(s.scheduleBlocks).values({
      entryId, activityId: workAct.id,
      startTime: cursor.toISOString(), endTime: shiftEnd.toISOString(),
      source: 'algorithm', locked: false,
    }).run()
  }
}

// ========== 辅助 ==========

function getEntryBlocks(entryId: number) {
  const blocks = db.select().from(s.scheduleBlocks)
    .where(eq(s.scheduleBlocks.entryId, entryId)).all()
  const allAct = db.select().from(s.activities).all()
  const actMap = new Map(allAct.map(a => [a.id, a]))

  return blocks.map(b => {
    const act = actMap.get(b.activityId)
    return {
      id: b.id, entryId: b.entryId, activityId: b.activityId,
      type: act?.code?.toLowerCase() || 'work',
      name: act?.name || 'Unknown', color: act?.color || '#4ade80',
      start: b.startTime, end: b.endTime,
      source: b.source, locked: b.locked,
      editable: act?.code !== 'WORK',
    }
  })
}

function previewBlocks(entryId: number, mutations: MutationPlan) {
  // 返回当前块（preview 不改数据，前端自行预览）
  return getEntryBlocks(entryId)
}
