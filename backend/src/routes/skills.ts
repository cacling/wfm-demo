/** 技能定义 CRUD */
import { Hono } from 'hono'
import { db } from '../db'
import { skills, agentSkills, agents } from '../db/schema'
import { eq } from 'drizzle-orm'

const router = new Hono()

router.get('/', (c) => {
  const rows = db.select().from(skills).all()
  return c.json(rows)
})

router.post('/', async (c) => {
  const body = await c.req.json()
  const [row] = db.insert(skills).values(body).returning().all()
  return c.json(row, 201)
})

router.put('/:id', async (c) => {
  const body = await c.req.json()
  const [row] = db.update(skills).set(body).where(eq(skills.id, Number(c.req.param('id')))).returning().all()
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})

router.delete('/:id', (c) => {
  db.delete(skills).where(eq(skills.id, Number(c.req.param('id')))).run()
  return c.json({ ok: true })
})

/** 查询拥有该技能的员工列表 */
router.get('/:id/agents', (c) => {
  const skillId = Number(c.req.param('id'))
  const rows = db
    .select({
      agentSkillId: agentSkills.id,
      agentId: agents.id,
      agentName: agents.name,
      employeeNo: agents.employeeNo,
      proficiency: agentSkills.proficiency,
    })
    .from(agentSkills)
    .innerJoin(agents, eq(agentSkills.agentId, agents.id))
    .where(eq(agentSkills.skillId, skillId))
    .all()
  return c.json(rows)
})

export default router
