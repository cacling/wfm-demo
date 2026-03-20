/** 规则中心：定义 / 绑定 / 编排 */
import { Hono } from 'hono'
import { db } from '../db'
import { ruleDefinitions, ruleBindings, ruleChains } from '../db/schema'
import { eq } from 'drizzle-orm'

const router = new Hono()

// ========== 规则定义 ==========

router.get('/definitions', (c) => {
  const rows = db.select().from(ruleDefinitions).all()
  return c.json(rows)
})

router.post('/definitions', async (c) => {
  const body = await c.req.json()
  const [row] = db.insert(ruleDefinitions).values(body).returning().all()
  return c.json(row, 201)
})

router.put('/definitions/:id', async (c) => {
  const body = await c.req.json()
  const [row] = db
    .update(ruleDefinitions)
    .set(body)
    .where(eq(ruleDefinitions.id, Number(c.req.param('id'))))
    .returning()
    .all()
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})

// ========== 规则绑定 ==========

router.get('/bindings', (c) => {
  const rows = db
    .select({
      id: ruleBindings.id,
      definitionId: ruleBindings.definitionId,
      definitionCode: ruleDefinitions.code,
      definitionName: ruleDefinitions.name,
      scopeType: ruleBindings.scopeType,
      scopeId: ruleBindings.scopeId,
      priority: ruleBindings.priority,
      enabled: ruleBindings.enabled,
      params: ruleBindings.params,
      effectiveStart: ruleBindings.effectiveStart,
      effectiveEnd: ruleBindings.effectiveEnd,
      createdAt: ruleBindings.createdAt,
    })
    .from(ruleBindings)
    .leftJoin(ruleDefinitions, eq(ruleBindings.definitionId, ruleDefinitions.id))
    .all()
  return c.json(rows)
})

router.post('/bindings', async (c) => {
  const body = await c.req.json()
  const [row] = db.insert(ruleBindings).values(body).returning().all()
  return c.json(row, 201)
})

router.put('/bindings/:id', async (c) => {
  const body = await c.req.json()
  const [row] = db
    .update(ruleBindings)
    .set(body)
    .where(eq(ruleBindings.id, Number(c.req.param('id'))))
    .returning()
    .all()
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})

router.delete('/bindings/:id', (c) => {
  db.delete(ruleBindings).where(eq(ruleBindings.id, Number(c.req.param('id')))).run()
  return c.json({ ok: true })
})

// ========== 规则编排（按阶段分组） ==========

router.get('/chains', (c) => {
  const rows = db
    .select({
      id: ruleChains.id,
      stage: ruleChains.stage,
      executionOrder: ruleChains.executionOrder,
      stopOnError: ruleChains.stopOnError,
      bindingId: ruleChains.bindingId,
      definitionId: ruleBindings.definitionId,
      definitionCode: ruleDefinitions.code,
      definitionName: ruleDefinitions.name,
      scopeType: ruleBindings.scopeType,
      scopeId: ruleBindings.scopeId,
      enabled: ruleBindings.enabled,
    })
    .from(ruleChains)
    .leftJoin(ruleBindings, eq(ruleChains.bindingId, ruleBindings.id))
    .leftJoin(ruleDefinitions, eq(ruleBindings.definitionId, ruleDefinitions.id))
    .all()

  // 按 stage 分组
  const grouped: Record<string, typeof rows> = {}
  for (const row of rows) {
    if (!grouped[row.stage]) grouped[row.stage] = []
    grouped[row.stage].push(row)
  }
  return c.json(grouped)
})

router.post('/chains', async (c) => {
  const body = await c.req.json()
  const [row] = db.insert(ruleChains).values(body).returning().all()
  return c.json(row, 201)
})

router.delete('/chains/:id', (c) => {
  db.delete(ruleChains).where(eq(ruleChains.id, Number(c.req.param('id')))).run()
  return c.json({ ok: true })
})

export default router
