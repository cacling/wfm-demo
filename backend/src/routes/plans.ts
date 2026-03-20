/**
 * 排班方案路由
 * - CRUD
 * - POST /:id/generate  — 算法生成排班
 * - GET  /:id/timeline   — 获取时间轴渲染数据
 */
import { Hono } from 'hono'
import { db } from '../db'
import { schedulePlans, scheduleEntries, scheduleBlocks, changeOperations, changeItems, agents, activities, groups, contracts, shifts } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { generateSchedule } from '../services/scheduler'

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

export default router
