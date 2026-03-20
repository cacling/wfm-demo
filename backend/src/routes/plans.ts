/**
 * 排班方案路由
 * - CRUD
 * - POST /:id/generate  — 算法生成排班
 * - GET  /:id/timeline   — 获取时间轴渲染数据
 */
import { Hono } from 'hono'
import { db } from '../db'
import { schedulePlans, scheduleEntries, scheduleBlocks, changeOperations, changeItems, agents, activities, groups, contracts, shifts, planVersions, publishLogs, validationResults, agentSkills, staffingRequirements as staffingReqTable } from '../db/schema'
import * as s from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { generateSchedule } from '../services/scheduler'
import { executeRuleChain } from '../services/rule-engine'

const router = new Hono()

// ========== CRUD ==========

router.get('/', (c) => c.json(db.select().from(schedulePlans).all()))

router.get('/:id', (c) => {
  const row = db.select().from(schedulePlans).where(eq(schedulePlans.id, Number(c.req.param('id')))).get()
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})

router.post('/', async (c) => {
  const body = await c.req.json()
  const [row] = db.insert(schedulePlans).values(body).returning().all()
  return c.json(row, 201)
})

router.put('/:id', async (c) => {
  const body = await c.req.json()
  const [row] = db.update(schedulePlans).set(body).where(eq(schedulePlans.id, Number(c.req.param('id')))).returning().all()
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})

router.delete('/:id', (c) => {
  // 级联删除 blocks → entries → plan
  const entries = db.select({ id: scheduleEntries.id }).from(scheduleEntries)
    .where(eq(scheduleEntries.planId, Number(c.req.param('id')))).all()
  for (const entry of entries) {
    db.delete(scheduleBlocks).where(eq(scheduleBlocks.entryId, entry.id)).run()
  }
  db.delete(scheduleEntries).where(eq(scheduleEntries.planId, Number(c.req.param('id')))).run()
  db.delete(schedulePlans).where(eq(schedulePlans.id, Number(c.req.param('id')))).run()
  return c.json({ ok: true })
})

// ========== 排班生成 ==========

router.post('/:id/generate', async (c) => {
  const planId = Number(c.req.param('id'))
  const plan = db.select().from(schedulePlans).where(eq(schedulePlans.id, planId)).get()
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  const result = generateSchedule({
    planId,
    startDate: plan.startDate,
    endDate: plan.endDate,
  })

  return c.json({
    ok: true,
    planId,
    ...result,
  })
})

// ========== 时间轴数据 ==========

/**
 * GET /api/plans/:id/timeline?date=YYYY-MM-DD
 *
 * 返回某天的时间轴数据，格式适配前端 ScheduleEditor：
 * {
 *   date: "2026-03-20",
 *   agents: [{ id, name, shift, shiftStart, shiftEnd, groupName, contractName }],
 *   blocks: [{ id, agentId, activityId, type, color, start, end, editable }]
 * }
 */
router.get('/:id/timeline', (c) => {
  const planId = Number(c.req.param('id'))
  const date = c.req.query('date')

  const plan = db.select().from(schedulePlans).where(eq(schedulePlans.id, planId)).get()
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  // 如果没指定日期，用方案的 startDate
  const targetDate = date || plan.startDate

  // 获取当天的排班条目
  const entries = db
    .select({
      entryId: scheduleEntries.id,
      agentId: scheduleEntries.agentId,
      shiftId: scheduleEntries.shiftId,
      agentName: agents.name,
      groupId: agents.groupId,
      groupName: groups.name,
      contractId: agents.contractId,
      contractName: contracts.name,
      shiftName: shifts.name,
      shiftStart: shifts.startTime,
      shiftEnd: shifts.endTime,
    })
    .from(scheduleEntries)
    .innerJoin(agents, eq(scheduleEntries.agentId, agents.id))
    .leftJoin(groups, eq(agents.groupId, groups.id))
    .leftJoin(contracts, eq(agents.contractId, contracts.id))
    .leftJoin(shifts, eq(scheduleEntries.shiftId, shifts.id))
    .where(and(
      eq(scheduleEntries.planId, planId),
      eq(scheduleEntries.date, targetDate),
    ))
    .all()

  // 预加载活动类型
  const allActivities = db.select().from(activities).all()
  const activityMap = new Map(allActivities.map((a) => [a.id, a]))

  // 构造 agents 和 blocks
  const timelineAgents = entries.map((e) => ({
    id: e.agentId,
    name: e.agentName,
    shift: e.shiftName || 'Unknown',
    shiftStart: e.shiftStart || '06:00',
    shiftEnd: e.shiftEnd || '14:00',
    groupName: e.groupName,
    contractName: e.contractName,
  }))

  const timelineBlocks: any[] = []
  for (const entry of entries) {
    const blocks = db.select().from(scheduleBlocks)
      .where(eq(scheduleBlocks.entryId, entry.entryId))
      .all()

    for (const block of blocks) {
      const activity = activityMap.get(block.activityId)
      timelineBlocks.push({
        id: block.id,
        entryId: entry.entryId,
        agentId: entry.agentId,
        activityId: block.activityId,
        type: activity?.code?.toLowerCase() || 'work',
        name: activity?.name || 'Unknown',
        color: activity?.color || '#4ade80',
        start: block.startTime,
        end: block.endTime,
        source: block.source,
        locked: block.locked,
        editable: activity ? activity.code !== 'WORK' : false,
      })
    }
  }

  return c.json({
    planId,
    date: targetDate,
    agents: timelineAgents,
    blocks: timelineBlocks,
  })
})

// ========== 块编辑 API ==========

import { updateBlock, deleteBlock as deleteBlockSvc, addBlock as addBlockSvc } from '../services/block-editor'
import { validatePlanDay } from '../services/validator'
import { executeEditIntent, type EditIntentCommand } from '../services/edit-service'

/** 修改块（拖拽/拉伸后提交） */
router.put('/:id/blocks/:blockId', async (c) => {
  const blockId = Number(c.req.param('blockId'))
  const { startTime, endTime } = await c.req.json()
  if (!startTime || !endTime) return c.json({ error: 'startTime and endTime required' }, 400)

  const result = updateBlock(blockId, startTime, endTime)
  return 'error' in result ? c.json(result, 404) : c.json(result)
})

/** 删除块 */
router.delete('/:id/blocks/:blockId', (c) => {
  const blockId = Number(c.req.param('blockId'))
  const result = deleteBlockSvc(blockId)
  return 'error' in result ? c.json(result, 404) : c.json(result)
})

/** 新增活动块 */
router.post('/:id/blocks', async (c) => {
  const { entryId, activityId, startTime, endTime } = await c.req.json()
  if (!entryId || !activityId || !startTime || !endTime) {
    return c.json({ error: 'entryId, activityId, startTime, endTime required' }, 400)
  }

  const result = addBlockSvc(entryId, activityId, startTime, endTime)
  return 'error' in result ? c.json(result, 404) : c.json(result, 201)
})

// ========== 校验 API ==========

/** 全局校验某天的排班 */
router.post('/:id/validate', async (c) => {
  const planId = Number(c.req.param('id'))
  const { date } = await c.req.json()

  const plan = db.select().from(schedulePlans).where(eq(schedulePlans.id, planId)).get()
  if (!plan) return c.json({ error: 'Plan not found' }, 404)

  const targetDate = date || plan.startDate
  const result = validatePlanDay(planId, targetDate)
  return c.json(result)
})

/** 获取编辑历史 */
router.get('/:id/changes', (c) => {
  const planId = Number(c.req.param('id'))
  const ops = db.select().from(changeOperations)
    .where(eq(changeOperations.planId, planId))
    .all()
  const result = ops.map((op) => {
    const items = db.select().from(changeItems)
      .where(eq(changeItems.operationId, op.id))
      .all()
    return { ...op, items }
  })
  return c.json(result)
})

// ========== EditIntent API（Phase 3） ==========

/** 预览编辑意图 */
router.post('/:id/changes/preview', async (c) => {
  const body = await c.req.json() as Partial<EditIntentCommand>
  const cmd: EditIntentCommand = {
    ...body,
    planId: Number(c.req.param('id')),
    saveMode: 'preview',
  } as EditIntentCommand

  try {
    const result = executeEditIntent(cmd)
    return c.json(result)
  } catch (e: any) {
    return c.json({ error: e.message }, 400)
  }
})

/** 提交编辑意图 */
router.post('/:id/changes/commit', async (c) => {
  const body = await c.req.json() as Partial<EditIntentCommand>
  const cmd: EditIntentCommand = {
    ...body,
    planId: Number(c.req.param('id')),
    saveMode: 'commit',
  } as EditIntentCommand

  try {
    const result = executeEditIntent(cmd)
    return c.json(result)
  } catch (e: any) {
    return c.json({ error: e.message }, 400)
  }
})

/** 确认告警后强制提交 */
router.post('/:id/changes/:opId/confirm', async (c) => {
  const body = await c.req.json() as Partial<EditIntentCommand>
  const cmd: EditIntentCommand = {
    ...body,
    planId: Number(c.req.param('id')),
    saveMode: 'commit',
    confirmWarnings: true,
  } as EditIntentCommand

  try {
    const result = executeEditIntent(cmd)
    return c.json(result)
  } catch (e: any) {
    return c.json({ error: e.message }, 400)
  }
})

// ========== 批量编辑 API（Phase 6） ==========

/** 批量提交多个编辑意图 */
router.post('/:id/changes/batch', async (c) => {
  const planId = Number(c.req.param('id'))
  const body = await c.req.json()
  const intents: EditIntentCommand[] = body.intents || []
  const confirmWarnings = body.confirmWarnings || false

  const results: any[] = []
  let allOk = true

  for (const intent of intents) {
    const cmd: EditIntentCommand = {
      ...intent,
      planId,
      saveMode: 'commit',
      confirmWarnings,
    } as EditIntentCommand

    try {
      const result = executeEditIntent(cmd)
      results.push(result)
      if (result.status !== 'committed') allOk = false
    } catch (e: any) {
      results.push({ status: 'rejected', error: e.message })
      allOk = false
    }
  }

  return c.json({
    ok: allOk,
    total: intents.length,
    committed: results.filter(r => r.status === 'committed').length,
    rejected: results.filter(r => r.status === 'rejected').length,
    results,
  })
})

// ========== 覆盖率查询 API（Phase 6） ==========

/** 按时段 + 技能查询覆盖率 */
router.get('/:id/coverage', (c) => {
  const planId = Number(c.req.param('id'))
  const date = c.req.query('date')
  const skillIdParam = c.req.query('skillId')

  const plan = db.select().from(schedulePlans).where(eq(schedulePlans.id, planId)).get()
  if (!plan) return c.json({ error: 'Plan not found' }, 404)
  const targetDate = date || plan.startDate

  // 获取当天所有 entries
  const entries = db.select({
    entryId: scheduleEntries.id,
    agentId: scheduleEntries.agentId,
  })
    .from(scheduleEntries)
    .where(and(eq(scheduleEntries.planId, planId), eq(scheduleEntries.date, targetDate)))
    .all()

  // 如果指定了 skillId，过滤有该技能的坐席
  let validAgentIds: Set<number> | null = null
  if (skillIdParam) {
    const skillId = Number(skillIdParam)
    const bindings = db.select().from(s.agentSkills).where(eq(s.agentSkills.skillId, skillId)).all()
    validAgentIds = new Set(bindings.map(b => b.agentId))
  }

  // Work 活动 ID
  const workAct = db.select().from(activities).where(eq(activities.code, 'WORK')).get()
  if (!workAct) return c.json({ error: 'Work activity not found' }, 500)

  // 按 30 分钟切片统计
  const dayStart = new Date(`${targetDate}T00:00:00Z`)
  const slots: { startTime: string; endTime: string; count: number; total: number }[] = []

  for (let offset = 0; offset < 24 * 60; offset += 30) {
    const slotStart = new Date(dayStart.getTime() + offset * 60000)
    const slotEnd = new Date(slotStart.getTime() + 30 * 60000)
    let workCount = 0
    let totalCount = 0

    for (const entry of entries) {
      if (validAgentIds && !validAgentIds.has(entry.agentId)) continue
      totalCount++

      const blocks = db.select().from(scheduleBlocks)
        .where(eq(scheduleBlocks.entryId, entry.entryId)).all()

      const isWorking = blocks.some(b => {
        if (b.activityId !== workAct.id) return false
        return new Date(b.startTime) < slotEnd && new Date(b.endTime) > slotStart
      })
      if (isWorking) workCount++
    }

    slots.push({
      startTime: slotStart.toISOString(),
      endTime: slotEnd.toISOString(),
      count: workCount,
      total: totalCount,
    })
  }

  // 获取该天的 staffing requirements
  const reqs = db.select().from(s.staffingRequirements)
    .where(and(eq(s.staffingRequirements.planId, planId), eq(s.staffingRequirements.date, targetDate)))
    .all()

  return c.json({ date: targetDate, skillId: skillIdParam ? Number(skillIdParam) : null, slots, requirements: reqs })
})

// ========== 发布/版本/回滚 API（Phase 5） ==========

/** 发布前全量校验（stage=publish） */
router.post('/:id/publish/validate', async (c) => {
  const planId = Number(c.req.param('id'))
  const results = executeRuleChain('publish', { planId })

  // 也执行 edit_commit 阶段的规则对所有 entries
  const entries = db.select().from(scheduleEntries).where(eq(scheduleEntries.planId, planId)).all()
  const allResults = [...results]
  for (const entry of entries) {
    const commitResults = executeRuleChain('edit_commit', {
      planId, assignmentId: entry.id, date: entry.date,
    })
    allResults.push(...commitResults)
  }

  const errors = allResults.filter(r => r.level === 'error')
  const warnings = allResults.filter(r => r.level === 'warning')
  const infos = allResults.filter(r => r.level === 'info')

  return c.json({ valid: errors.length === 0, errors, warnings, infos })
})

/** 发布排班方案 */
router.post('/:id/publish', async (c) => {
  const planId = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => ({}))

  const plan = db.select().from(schedulePlans).where(eq(schedulePlans.id, planId)).get()
  if (!plan) return c.json({ error: 'Plan not found' }, 404)
  if (plan.status === 'published') return c.json({ error: 'Already published' }, 400)

  // 创建版本快照
  const entries = db.select().from(scheduleEntries).where(eq(scheduleEntries.planId, planId)).all()
  const snapshot: any = { entries: [] }
  for (const entry of entries) {
    const blocks = db.select().from(scheduleBlocks).where(eq(scheduleBlocks.entryId, entry.id)).all()
    snapshot.entries.push({ ...entry, blocks })
  }

  db.insert(planVersions).values({
    planId,
    versionNo: plan.versionNo,
    snapshotJson: JSON.stringify(snapshot),
  }).run()

  // 更新方案状态
  const now = new Date().toISOString()
  db.update(schedulePlans).set({
    status: 'published',
    publishedAt: now,
    publishedBy: body.operatorId || 'system',
  }).where(eq(schedulePlans.id, planId)).run()

  // 锁定所有 entries
  for (const entry of entries) {
    db.update(scheduleEntries).set({ status: 'published' }).where(eq(scheduleEntries.id, entry.id)).run()
  }

  // 记录发布日志
  db.insert(publishLogs).values({
    planId,
    versionNo: plan.versionNo,
    operatorId: body.operatorId || 'system',
    operatorName: body.operatorName || 'System',
    action: 'publish',
    note: body.note || null,
  }).run()

  return c.json({ ok: true, versionNo: plan.versionNo, publishedAt: now })
})

/** 回滚到指定版本 */
router.post('/:id/rollback', async (c) => {
  const planId = Number(c.req.param('id'))
  const body = await c.req.json()
  const targetVersion = body.versionNo

  const version = db.select().from(planVersions)
    .where(and(eq(planVersions.planId, planId), eq(planVersions.versionNo, targetVersion)))
    .get()
  if (!version) return c.json({ error: `Version ${targetVersion} not found` }, 404)

  const snapshot = JSON.parse(version.snapshotJson)

  // 清除当前数据
  const currentEntries = db.select({ id: scheduleEntries.id }).from(scheduleEntries)
    .where(eq(scheduleEntries.planId, planId)).all()
  for (const e of currentEntries) {
    db.delete(scheduleBlocks).where(eq(scheduleBlocks.entryId, e.id)).run()
  }
  db.delete(scheduleEntries).where(eq(scheduleEntries.planId, planId)).run()

  // 从快照恢复
  for (const entry of snapshot.entries) {
    const [newEntry] = db.insert(scheduleEntries).values({
      planId, agentId: entry.agentId, date: entry.date,
      shiftId: entry.shiftId, status: 'editable',
    }).returning().all()

    for (const block of entry.blocks) {
      db.insert(scheduleBlocks).values({
        entryId: newEntry.id, activityId: block.activityId,
        startTime: block.startTime, endTime: block.endTime,
        source: block.source || 'algorithm', locked: block.locked || false,
      }).run()
    }
  }

  // 更新方案状态
  const plan = db.select().from(schedulePlans).where(eq(schedulePlans.id, planId)).get()
  db.update(schedulePlans).set({
    status: 'editing',
    versionNo: (plan?.versionNo || 0) + 1,
    publishedAt: null,
    publishedBy: null,
  }).where(eq(schedulePlans.id, planId)).run()

  // 记录回滚日志
  db.insert(publishLogs).values({
    planId,
    versionNo: targetVersion,
    operatorId: body.operatorId || 'system',
    operatorName: body.operatorName || 'System',
    action: 'rollback',
    note: `Rollback to version ${targetVersion}`,
  }).run()

  return c.json({ ok: true, restoredVersion: targetVersion })
})

/** 查看版本历史 */
router.get('/:id/history', (c) => {
  const planId = Number(c.req.param('id'))
  const versions = db.select({
    id: planVersions.id,
    versionNo: planVersions.versionNo,
    createdAt: planVersions.createdAt,
  }).from(planVersions)
    .where(eq(planVersions.planId, planId))
    .all()

  const logs = db.select().from(publishLogs)
    .where(eq(publishLogs.planId, planId))
    .all()

  return c.json({ versions, logs })
})

export default router
