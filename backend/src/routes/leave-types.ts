/** 假期类型 CRUD */
import { Hono } from 'hono'
import { db } from '../db'
import { leaveTypes } from '../db/schema'
import { eq } from 'drizzle-orm'

const router = new Hono()

router.get('/', (c) => {
  const rows = db.select().from(leaveTypes).all()
  return c.json(rows)
})

router.post('/', async (c) => {
  const body = await c.req.json()
  const [row] = db.insert(leaveTypes).values(body).returning().all()
  return c.json(row, 201)
})

router.put('/:id', async (c) => {
  const body = await c.req.json()
  const [row] = db.update(leaveTypes).set(body).where(eq(leaveTypes.id, Number(c.req.param('id')))).returning().all()
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})

router.delete('/:id', (c) => {
  db.delete(leaveTypes).where(eq(leaveTypes.id, Number(c.req.param('id')))).run()
  return c.json({ ok: true })
})

export default router
