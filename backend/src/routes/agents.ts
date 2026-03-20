/** 员工/座席 CRUD（含关联的合同和班组信息） */
import { Hono } from 'hono'
import { db } from '../db'
import { agents, contracts, groups, agentSkills, skills } from '../db/schema'
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

/** 查询员工已绑定的技能列表 */
router.get('/:id/skills', (c) => {
  const agentId = Number(c.req.param('id'))
  const rows = db
    .select({
      agentSkillId: agentSkills.id,
      skillId: skills.id,
      skillCode: skills.code,
      skillName: skills.name,
      proficiency: agentSkills.proficiency,
    })
    .from(agentSkills)
    .innerJoin(skills, eq(agentSkills.skillId, skills.id))
    .where(eq(agentSkills.agentId, agentId))
    .all()
  return c.json(rows)
})

/** 为员工绑定技能 */
router.post('/:id/skills', async (c) => {
  const agentId = Number(c.req.param('id'))
  const body = await c.req.json()
  const [row] = db
    .insert(agentSkills)
    .values({ agentId, skillId: body.skillId, proficiency: body.proficiency ?? 100 })
    .returning()
    .all()
  return c.json(row, 201)
})

/** 解除员工与某技能的绑定 */
router.delete('/:id/skills/:skillId', (c) => {
  const agentId = Number(c.req.param('id'))
  const skillId = Number(c.req.param('skillId'))
  // 找到对应的 agent_skills 记录并删除
  const binding = db
    .select()
    .from(agentSkills)
    .where(eq(agentSkills.agentId, agentId))
    .all()
    .find((r) => r.skillId === skillId)
  if (!binding) return c.json({ error: 'Not found' }, 404)
  db.delete(agentSkills).where(eq(agentSkills.id, binding.id)).run()
  return c.json({ ok: true })
})

export default router
