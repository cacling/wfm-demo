/** 合同 CRUD */
import { Hono } from 'hono'
import { db } from '../db'
import { contracts, contractPackages, shiftPackages } from '../db/schema'
import { eq } from 'drizzle-orm'

const router = new Hono()

router.get('/', (c) => c.json(db.select().from(contracts).all()))

router.get('/:id', (c) => {
  const row = db.select().from(contracts).where(eq(contracts.id, Number(c.req.param('id')))).get()
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})

router.post('/', async (c) => {
  const body = await c.req.json()
  const [row] = db.insert(contracts).values(body).returning().all()
  return c.json(row, 201)
})

router.put('/:id', async (c) => {
  const body = await c.req.json()
  const [row] = db.update(contracts).set(body).where(eq(contracts.id, Number(c.req.param('id')))).returning().all()
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})

router.delete('/:id', (c) => {
  db.delete(contracts).where(eq(contracts.id, Number(c.req.param('id')))).run()
  return c.json({ ok: true })
})

/** 列出合同绑定的班次包 */
router.get('/:id/packages', (c) => {
  const contractId = Number(c.req.param('id'))
  const rows = db
    .select({
      bindingId: contractPackages.id,
      packageId: shiftPackages.id,
      packageName: shiftPackages.name,
      createdAt: shiftPackages.createdAt,
    })
    .from(contractPackages)
    .innerJoin(shiftPackages, eq(contractPackages.packageId, shiftPackages.id))
    .where(eq(contractPackages.contractId, contractId))
    .all()
  return c.json(rows)
})

/** 为合同绑定班次包 */
router.post('/:id/packages', async (c) => {
  const contractId = Number(c.req.param('id'))
  const body = await c.req.json()
  const [row] = db.insert(contractPackages).values({ contractId, packageId: body.packageId }).returning().all()
  return c.json(row, 201)
})

/** 解除合同与班次包的绑定 */
router.delete('/:id/packages/:bindingId', (c) => {
  db.delete(contractPackages).where(eq(contractPackages.id, Number(c.req.param('bindingId')))).run()
  return c.json({ ok: true })
})

export default router
