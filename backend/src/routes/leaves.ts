/** 休假申请 CRUD */
import { Hono } from 'hono'
import { db } from '../db'
import { leaves, agents } from '../db/schema'
import { eq } from 'drizzle-orm'

const router = new Hono()

router.get('/', (c) => {
  const rows = db
    .select({
      id: leaves.id,
      agentId: leaves.agentId,
      agentName: agents.name,
      leaveType: leaves.leaveType,
      startTime: leaves.startTime,
      endTime: leaves.endTime,
      isFullDay: leaves.isFullDay,
      status: leaves.status,
      isPrePlanned: leaves.isPrePlanned,
      note: leaves.note,
      createdAt: leaves.createdAt,
    })
    .from(leaves)
    .leftJoin(agents, eq(leaves.agentId, agents.id))
    .all()
  return c.json(rows)
})

router.post('/', async (c) => {
  const body = await c.req.json()
  const [row] = db.insert(leaves).values(body).returning().all()
  return c.json(row, 201)
})

router.put('/:id', async (c) => {
  const body = await c.req.json()
  const [row] = db.update(leaves).set(body).where(eq(leaves.id, Number(c.req.param('id')))).returning().all()
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})

router.delete('/:id', (c) => {
  db.delete(leaves).where(eq(leaves.id, Number(c.req.param('id')))).run()
  return c.json({ ok: true })
})

export default router
