/** 班组 CRUD */
import { Hono } from 'hono'
import { db } from '../db'
import { groups } from '../db/schema'
import { eq } from 'drizzle-orm'

const router = new Hono()

router.get('/', (c) => c.json(db.select().from(groups).all()))

router.get('/:id', (c) => {
  const row = db.select().from(groups).where(eq(groups.id, Number(c.req.param('id')))).get()
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})

router.post('/', async (c) => {
  const body = await c.req.json()
  const [row] = db.insert(groups).values(body).returning().all()
  return c.json(row, 201)
})

router.put('/:id', async (c) => {
  const body = await c.req.json()
  const [row] = db.update(groups).set(body).where(eq(groups.id, Number(c.req.param('id')))).returning().all()
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})

router.delete('/:id', (c) => {
  db.delete(groups).where(eq(groups.id, Number(c.req.param('id')))).run()
  return c.json({ ok: true })
})

export default router
