/** 人力覆盖需求 CRUD */
import { Hono } from 'hono'
import { db } from '../db'
import { staffingRequirements } from '../db/schema'
import { eq } from 'drizzle-orm'

const router = new Hono()

router.get('/', (c) => {
  const planId = c.req.query('plan_id')
  if (planId) {
    const rows = db
      .select()
      .from(staffingRequirements)
      .where(eq(staffingRequirements.planId, Number(planId)))
      .all()
    return c.json(rows)
  }
  const rows = db.select().from(staffingRequirements).all()
  return c.json(rows)
})

router.post('/', async (c) => {
  const body = await c.req.json()
  const [row] = db.insert(staffingRequirements).values(body).returning().all()
  return c.json(row, 201)
})

router.put('/:id', async (c) => {
  const body = await c.req.json()
  const [row] = db
    .update(staffingRequirements)
    .set(body)
    .where(eq(staffingRequirements.id, Number(c.req.param('id'))))
    .returning()
    .all()
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})

router.delete('/:id', (c) => {
  db.delete(staffingRequirements).where(eq(staffingRequirements.id, Number(c.req.param('id')))).run()
  return c.json({ ok: true })
})

export default router
