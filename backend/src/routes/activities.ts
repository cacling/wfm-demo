/** 活动类型 CRUD */
import { Hono } from 'hono'
import { db } from '../db'
import { activities } from '../db/schema'
import { eq } from 'drizzle-orm'

const router = new Hono()

router.get('/', (c) => {
  const rows = db.select().from(activities).all()
  return c.json(rows)
})

router.get('/:id', (c) => {
  const row = db.select().from(activities).where(eq(activities.id, Number(c.req.param('id')))).get()
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})

router.post('/', async (c) => {
  const body = await c.req.json()
  const [row] = db.insert(activities).values(body).returning().all()
  return c.json(row, 201)
})

router.put('/:id', async (c) => {
  const body = await c.req.json()
  const [row] = db.update(activities).set(body).where(eq(activities.id, Number(c.req.param('id')))).returning().all()
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})

router.delete('/:id', (c) => {
  db.delete(activities).where(eq(activities.id, Number(c.req.param('id')))).run()
  return c.json({ ok: true })
})

export default router
