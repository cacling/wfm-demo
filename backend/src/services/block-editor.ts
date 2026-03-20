/**
 * block-editor.ts — 排班块编辑服务
 *
 * 所有块的增删改都通过这里，确保：
 * 1. 修改活动块后自动重建 Work 块
 * 2. 记录编辑历史
 * 3. 返回更新后的完整块列表
 */

import { db } from '../db'
import * as s from '../db/schema'
import { eq, and } from 'drizzle-orm'
import dayjs from 'dayjs'

/** 重建某个 entry 的 Work 块 */
function rebuildWorkBlocks(entryId: number) {
  const entry = db.select().from(s.scheduleEntries).where(eq(s.scheduleEntries.id, entryId)).get()
  if (!entry) return

  const shift = entry.shiftId
    ? db.select().from(s.shifts).where(eq(s.shifts.id, entry.shiftId)).get()
    : null
  if (!shift) return

  // 找到 Work 活动 ID
  const workActivity = db.select().from(s.activities).where(eq(s.activities.name, 'Work')).get()
  if (!workActivity) return

  // 删除该 entry 所有 Work 块
  const allBlocks = db.select().from(s.scheduleBlocks).where(eq(s.scheduleBlocks.entryId, entryId)).all()
  for (const block of allBlocks) {
    if (block.activityId === workActivity.id) {
      db.delete(s.scheduleBlocks).where(eq(s.scheduleBlocks.id, block.id)).run()
    }
  }

  // 获取剩余的活动块（非 Work），按时间排序
  const activityBlocks = db.select().from(s.scheduleBlocks)
    .where(eq(s.scheduleBlocks.entryId, entryId))
    .all()
    .sort((a, b) => dayjs(a.startTime).diff(dayjs(b.startTime)))

  // 计算班次绝对时间
  const [sh, sm] = shift.startTime.split(':').map(Number)
  const [eh, em] = shift.endTime.split(':').map(Number)
  const dateStart = dayjs(entry.date).startOf('day')
  const shiftStart = dateStart.add(sh, 'hour').add(sm, 'minute')
  const shiftEnd = dateStart.add(eh, 'hour').add(em, 'minute')

  // 在间隙中插入 Work 块
  let cursor = shiftStart
  for (const block of activityBlocks) {
    const bStart = dayjs(block.startTime)
    if (bStart.isAfter(cursor)) {
      db.insert(s.scheduleBlocks).values({
        entryId,
        activityId: workActivity.id,
        startTime: cursor.toISOString(),
        endTime: bStart.toISOString(),
      }).run()
    }
    const bEnd = dayjs(block.endTime)
    if (bEnd.isAfter(cursor)) cursor = bEnd
  }
  if (cursor.isBefore(shiftEnd)) {
    db.insert(s.scheduleBlocks).values({
      entryId,
      activityId: workActivity.id,
      startTime: cursor.toISOString(),
      endTime: shiftEnd.toISOString(),
    }).run()
  }
}

/** 记录编辑历史 */
function recordChange(
  planId: number, agentId: number, date: string,
  changeType: string, before: any, after: any,
) {
  db.insert(s.scheduleChanges).values({
    planId,
    agentId,
    date,
    changeType,
    beforeJson: before ? JSON.stringify(before) : null,
    afterJson: after ? JSON.stringify(after) : null,
  }).run()
}

/** 更新块（拖拽/拉伸） */
export function updateBlock(blockId: number, newStart: string, newEnd: string) {
  const block = db.select().from(s.scheduleBlocks).where(eq(s.scheduleBlocks.id, blockId)).get()
  if (!block) return { error: 'Block not found' }

  const entry = db.select().from(s.scheduleEntries).where(eq(s.scheduleEntries.id, block.entryId)).get()
  if (!entry) return { error: 'Entry not found' }

  const before = { startTime: block.startTime, endTime: block.endTime }

  db.update(s.scheduleBlocks)
    .set({ startTime: newStart, endTime: newEnd })
    .where(eq(s.scheduleBlocks.id, blockId))
    .run()

  rebuildWorkBlocks(block.entryId)
  recordChange(entry.planId, entry.agentId, entry.date, 'update', before, { startTime: newStart, endTime: newEnd })

  return { ok: true }
}

/** 删除活动块 */
export function deleteBlock(blockId: number) {
  const block = db.select().from(s.scheduleBlocks).where(eq(s.scheduleBlocks.id, blockId)).get()
  if (!block) return { error: 'Block not found' }

  const entry = db.select().from(s.scheduleEntries).where(eq(s.scheduleEntries.id, block.entryId)).get()
  if (!entry) return { error: 'Entry not found' }

  const before = { activityId: block.activityId, startTime: block.startTime, endTime: block.endTime }

  db.delete(s.scheduleBlocks).where(eq(s.scheduleBlocks.id, blockId)).run()
  rebuildWorkBlocks(block.entryId)
  recordChange(entry.planId, entry.agentId, entry.date, 'delete', before, null)

  return { ok: true }
}

/** 新增活动块 */
export function addBlock(entryId: number, activityId: number, startTime: string, endTime: string) {
  const entry = db.select().from(s.scheduleEntries).where(eq(s.scheduleEntries.id, entryId)).get()
  if (!entry) return { error: 'Entry not found' }

  const [row] = db.insert(s.scheduleBlocks).values({
    entryId,
    activityId,
    startTime,
    endTime,
  }).returning().all()

  rebuildWorkBlocks(entryId)
  recordChange(entry.planId, entry.agentId, entry.date, 'add', null, { activityId, startTime, endTime })

  return { ok: true, blockId: row.id }
}
