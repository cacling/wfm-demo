/** 班次相关 CRUD（班制模板、班次、班次包） */
import { Hono } from 'hono'
import { db } from '../db'
import { shiftPatterns, shifts, shiftActivities, shiftPackages, shiftPackageItems, activities } from '../db/schema'
import { eq } from 'drizzle-orm'

const router = new Hono()

// ========== 班制模板 ==========
router.get('/patterns', (c) => c.json(db.select().from(shiftPatterns).all()))

router.post('/patterns', async (c) => {
  const body = await c.req.json()
  const [row] = db.insert(shiftPatterns).values(body).returning().all()
  return c.json(row, 201)
})

// ========== 班次 ==========
router.get('/', (c) => {
  const rows = db
    .select({
      id: shifts.id,
      patternId: shifts.patternId,
      name: shifts.name,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      durationMinutes: shifts.durationMinutes,
    })
    .from(shifts)
    .all()
  return c.json(rows)
})

/** 获取班次详情（含活动片段） */
router.get('/:id', (c) => {
  const id = Number(c.req.param('id'))
  const shift = db.select().from(shifts).where(eq(shifts.id, id)).get()
  if (!shift) return c.json({ error: 'Not found' }, 404)

  const activitySlots = db
    .select({
      id: shiftActivities.id,
      activityId: shiftActivities.activityId,
      activityName: activities.name,
      activityColor: activities.color,
      offsetMinutes: shiftActivities.offsetMinutes,
      durationMinutes: shiftActivities.durationMinutes,
      sortOrder: shiftActivities.sortOrder,
    })
    .from(shiftActivities)
    .leftJoin(activities, eq(shiftActivities.activityId, activities.id))
    .where(eq(shiftActivities.shiftId, id))
    .all()

  return c.json({ ...shift, activities: activitySlots })
})

router.post('/', async (c) => {
  const body = await c.req.json()
  const [row] = db.insert(shifts).values(body).returning().all()
  return c.json(row, 201)
})

// ========== 班次包 ==========
router.get('/packages', (c) => {
  const pkgs = db.select().from(shiftPackages).all()
  return c.json(pkgs)
})

/** 获取班次包详情（含包内班次） */
router.get('/packages/:id', (c) => {
  const id = Number(c.req.param('id'))
  const pkg = db.select().from(shiftPackages).where(eq(shiftPackages.id, id)).get()
  if (!pkg) return c.json({ error: 'Not found' }, 404)

  const items = db
    .select({
      shiftId: shifts.id,
      shiftName: shifts.name,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      durationMinutes: shifts.durationMinutes,
    })
    .from(shiftPackageItems)
    .innerJoin(shifts, eq(shiftPackageItems.shiftId, shifts.id))
    .where(eq(shiftPackageItems.packageId, id))
    .all()

  return c.json({ ...pkg, shifts: items })
})

router.post('/packages', async (c) => {
  const body = await c.req.json()
  const [row] = db.insert(shiftPackages).values(body).returning().all()
  return c.json(row, 201)
})

export default router
