/**
 * block-editor.ts — 排班块编辑服务（第 1 期适配）
 *
 * 使用新的 change_operations + change_items 两层事务模型记录变更。
 */

import { db } from '../db'
import * as s from '../db/schema'
import { eq } from 'drizzle-orm'
import dayjs from 'dayjs'

/** 重建某个 entry 的 Work 块 */
function rebuildWorkBlocks(entryId: number) {
  const entry = db.select().from(s.scheduleEntries).where(eq(s.scheduleEntries.id, entryId)).get()
  if (!entry) return

  const shift = entry.shiftId
    ? db.select().from(s.shifts).where(eq(s.shifts.id, entry.shiftId)).get()
    : null
  if (!shift) return

  const workActivity = db.select().from(s.activities).where(eq(s.activities.code, 'WORK')).get()
  if (!workActivity) return

  // 删除旧 Work 块
  const allBlocks = db.select().from(s.scheduleBlocks).where(eq(s.scheduleBlocks.entryId, entryId)).all()
  for (const block of allBlocks) {
    if (block.activityId === workActivity.id) {
      db.delete(s.scheduleBlocks).where(eq(s.scheduleBlocks.id, block.id)).run()
    }
  }

  // 获取非 Work 块
  const activityBlocks = db.select().from(s.scheduleBlocks)
    .where(eq(s.scheduleBlocks.entryId, entryId))
    .all()
    .sort((a, b) => dayjs(a.startTime).diff(dayjs(b.startTime)))

  const [sh, sm] = shift.startTime.split(':').map(Number)
  const [eh, em] = shift.endTime.split(':').map(Number)
  const dateStart = dayjs(entry.date).startOf('day')
  const shiftStart = dateStart.add(sh, 'hour').add(sm, 'minute')
  const shiftEnd = dateStart.add(eh, 'hour').add(em, 'minute')

  let cursor = shiftStart
  for (const block of activityBlocks) {
    const bStart = dayjs(block.startTime)
    if (bStart.isAfter(cursor)) {
      db.insert(s.scheduleBlocks).values({
        entryId,
        activityId: workActivity.id,
        startTime: cursor.toISOString(),
        endTime: bStart.toISOString(),
        source: 'algorithm',
        locked: false,
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
      source: 'algorithm',
      locked: false,
    }).run()
  }
}

/** 记录变更操作（两层模型） */
function recordChange(
  planId: number, intentType: string,
  assignmentId: number | null, blockId: number | null,
  changeType: string, before: any, after: any,
) {
  const [op] = db.insert(s.changeOperations).values({
    planId,
    intentType,
    saveMode: 'commit',
    status: 'committed',
  }).returning().all()

  db.insert(s.changeItems).values({
    operationId: op.id,
    assignmentId,
    blockId,
    changeType,
    beforeJson: before ? JSON.stringify(before) : null,
    afterJson: after ? JSON.stringify(after) : null,
  }).run()

  // bump version
  const plan = db.select().from(s.schedulePlans).where(eq(s.schedulePlans.id, planId)).get()
  if (plan) {
    db.update(s.schedulePlans)
      .set({ versionNo: plan.versionNo + 1 })
      .where(eq(s.schedulePlans.id, planId))
      .run()
  }
}

/** 更新块 */
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
  recordChange(entry.planId, 'MOVE_BLOCK', entry.id, blockId, 'update', before, { startTime: newStart, endTime: newEnd })
  return { ok: true }
}

/** 删除块 */
export function deleteBlock(blockId: number) {
  const block = db.select().from(s.scheduleBlocks).where(eq(s.scheduleBlocks.id, blockId)).get()
  if (!block) return { error: 'Block not found' }
  const entry = db.select().from(s.scheduleEntries).where(eq(s.scheduleEntries.id, block.entryId)).get()
  if (!entry) return { error: 'Entry not found' }

  const before = { activityId: block.activityId, startTime: block.startTime, endTime: block.endTime }
  db.delete(s.scheduleBlocks).where(eq(s.scheduleBlocks.id, blockId)).run()
  rebuildWorkBlocks(block.entryId)
  recordChange(entry.planId, 'DELETE_BLOCK', entry.id, blockId, 'delete', before, null)
  return { ok: true }
}

/** 新增块 */
export function addBlock(entryId: number, activityId: number, startTime: string, endTime: string) {
  const entry = db.select().from(s.scheduleEntries).where(eq(s.scheduleEntries.id, entryId)).get()
  if (!entry) return { error: 'Entry not found' }

  const [row] = db.insert(s.scheduleBlocks).values({
    entryId,
    activityId,
    startTime,
    endTime,
    source: 'manual',
    locked: false,
  }).returning().all()

  rebuildWorkBlocks(entryId)
  recordChange(entry.planId, 'INSERT_ACTIVITY', entry.id, row.id, 'add', null, { activityId, startTime, endTime })
  return { ok: true, blockId: row.id }
}
