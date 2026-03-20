/** 员工/座席 CRUD（含关联的合同和班组信息） */
import { Hono } from 'hono'
import { db } from '../db'
import { agents, contracts, groups } from '../db/schema'
import { eq } from 'drizzle-orm'

const router = new Hono()

router.get('/', (c) => {
  const rows = db
    .select({
      id: agents.id,
      name: agents.name,
      employeeNo: agents.employeeNo,
      groupId: agents.groupId,
      groupName: groups.name,
      contractId: agents.contractId,
      contractName: contracts.name,
      createdAt: agents.createdAt,
    })
    .from(agents)
    .leftJoin(groups, eq(agents.groupId, groups.id))
    .leftJoin(contracts, eq(agents.contractId, contracts.id))
    .all()
  return c.json(rows)
})

router.get('/:id', (c) => {
  const row = db.select().from(agents).where(eq(agents.id, Number(c.req.param('id')))).get()
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})

router.post('/', async (c) => {
  const body = await c.req.json()
  const [row] = db.insert(agents).values(body).returning().all()
  return c.json(row, 201)
})

router.put('/:id', async (c) => {
  const body = await c.req.json()
  const [row] = db.update(agents).set(body).where(eq(agents.id, Number(c.req.param('id')))).returning().all()
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})

router.delete('/:id', (c) => {
  db.delete(agents).where(eq(agents.id, Number(c.req.param('id')))).run()
  return c.json({ ok: true })
})

export default router
