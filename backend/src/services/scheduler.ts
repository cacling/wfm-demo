/**
 * scheduler.ts — 排班生成算法
 *
 * 简化版排班流程：
 * 1. 遍历日期范围内每一天
 * 2. 对每个员工：
 *    a. 检查是否有已审批的全天休假 → 跳过
 *    b. 通过合同 → 班次包 → 获取可用班次
 *    c. 按轮转规则选一个班次
 *    d. 用班次的活动模板生成当天的 schedule_blocks
 *    e. 叠加例外安排（会议/培训替换 Work 段）
 */

import { db } from '../db'
import * as s from '../db/schema'
import { eq, and, lte, gte } from 'drizzle-orm'
import dayjs from 'dayjs'
import dayOfYear from 'dayjs/plugin/dayOfYear'
dayjs.extend(dayOfYear)

interface GenerateOptions {
  planId: number
  startDate: string  // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
}

export function generateSchedule(opts: GenerateOptions) {
  const { planId, startDate, endDate } = opts

  // 清除该方案下已有的排班数据
  const existingEntries = db.select({ id: s.scheduleEntries.id })
    .from(s.scheduleEntries)
    .where(eq(s.scheduleEntries.planId, planId))
    .all()

  for (const entry of existingEntries) {
    db.delete(s.scheduleBlocks).where(eq(s.scheduleBlocks.entryId, entry.id)).run()
  }
  db.delete(s.scheduleEntries).where(eq(s.scheduleEntries.planId, planId)).run()

  // 获取所有员工
  const allAgents = db.select().from(s.agents).all()

  // 预加载合同 → 班次包 → 班次的关联
  const contractPkgMap = new Map<number, number[]>() // contractId → shiftIds[]
  const allContractPkgs = db.select().from(s.contractPackages).all()
  const allPkgItems = db.select().from(s.shiftPackageItems).all()

  for (const cp of allContractPkgs) {
    const shiftIds = allPkgItems
      .filter((pi) => pi.packageId === cp.packageId)
      .map((pi) => pi.shiftId)
    const existing = contractPkgMap.get(cp.contractId) || []
    contractPkgMap.set(cp.contractId, [...existing, ...shiftIds])
  }

  // 预加载班次活动模板
  const allShiftActivities = db.select().from(s.shiftActivities).all()
  const shiftActivityMap = new Map<number, typeof allShiftActivities>()
  for (const sa of allShiftActivities) {
    const list = shiftActivityMap.get(sa.shiftId) || []
    list.push(sa)
    shiftActivityMap.set(sa.shiftId, list)
  }

  // 预加载班次信息
  const allShifts = db.select().from(s.shifts).all()
  const shiftMap = new Map(allShifts.map((sh) => [sh.id, sh]))

  // 预加载已审批休假
  const approvedLeaves = db.select().from(s.leaves)
    .where(eq(s.leaves.status, 'approved'))
    .all()

  // 预加载例外安排
  const allExceptions = db.select().from(s.exceptions).all()

  let totalEntries = 0
  let totalBlocks = 0

  // 遍历每一天
  let cursor = dayjs(startDate)
  const end = dayjs(endDate)

  while (!cursor.isAfter(end)) {
    const dateStr = cursor.format('YYYY-MM-DD')
    const dateStart = cursor.startOf('day')

    for (const agent of allAgents) {
      // 检查全天休假
      const hasFullDayLeave = approvedLeaves.some((lv) =>
        lv.agentId === agent.id &&
        lv.isFullDay &&
        dayjs(lv.startTime).format('YYYY-MM-DD') <= dateStr &&
        dayjs(lv.endTime).format('YYYY-MM-DD') >= dateStr,
      )
      if (hasFullDayLeave) continue

      // 获取可用班次
      const availableShiftIds = contractPkgMap.get(agent.contractId!) || []
      if (availableShiftIds.length === 0) continue

      // 简单轮转：按 (agentId + dayOfYear) % shiftCount 选班次
      const dayIndex = cursor.dayOfYear()
      const shiftIdx = (agent.id + dayIndex) % availableShiftIds.length
      const selectedShiftId = availableShiftIds[shiftIdx]
      const shift = shiftMap.get(selectedShiftId)
      if (!shift) continue

      // 创建排班条目
      const [entry] = db.insert(s.scheduleEntries).values({
        planId,
        agentId: agent.id,
        date: dateStr,
        shiftId: selectedShiftId,
        status: 'editable',
      }).returning().all()
      totalEntries++

      // 从班次模板生成活动块
      const templates = shiftActivityMap.get(selectedShiftId) || []
      const sorted = [...templates].sort((a, b) => a.sortOrder - b.sortOrder)

      // 解析班次开始时间
      const [startH, startM] = shift.startTime.split(':').map(Number)
      const shiftStart = dateStart.add(startH, 'hour').add(startM, 'minute')

      for (const tmpl of sorted) {
        const blockStart = shiftStart.add(tmpl.offsetMinutes, 'minute')
        const blockEnd = blockStart.add(tmpl.durationMinutes, 'minute')

        db.insert(s.scheduleBlocks).values({
          entryId: entry.id,
          activityId: tmpl.activityId,
          startTime: blockStart.toISOString(),
          endTime: blockEnd.toISOString(),
          source: 'algorithm',
          locked: false,
        }).run()
        totalBlocks++
      }

      // 叠加例外安排（替换对应时间段的 Work 块）
      const agentExceptions = allExceptions.filter((ex) => {
        if (ex.agentId !== agent.id) return false
        const exDate = dayjs(ex.startTime).format('YYYY-MM-DD')
        return exDate === dateStr
      })

      for (const ex of agentExceptions) {
        // 找到 Work 活动的 ID（priority 最低的）
        const workActivity = db.select().from(s.activities)
          .where(eq(s.activities.code, 'WORK'))
          .get()
        if (!workActivity) continue

        // 删除被例外时间覆盖的 Work 块
        const entryBlocks = db.select().from(s.scheduleBlocks)
          .where(eq(s.scheduleBlocks.entryId, entry.id))
          .all()

        for (const block of entryBlocks) {
          if (block.activityId !== workActivity.id) continue
          const bStart = dayjs(block.startTime)
          const bEnd = dayjs(block.endTime)
          const exStart = dayjs(ex.startTime)
          const exEnd = dayjs(ex.endTime)

          // 如果例外完全覆盖这个 Work 块
          if (!exStart.isAfter(bStart) && !exEnd.isBefore(bEnd)) {
            db.delete(s.scheduleBlocks).where(eq(s.scheduleBlocks.id, block.id)).run()
          }
          // 如果例外部分覆盖（在 Work 块中间切一段）
          else if (exStart.isAfter(bStart) && exEnd.isBefore(bEnd)) {
            // 缩短原 Work 块到例外开始
            db.update(s.scheduleBlocks)
              .set({ endTime: exStart.toISOString() })
              .where(eq(s.scheduleBlocks.id, block.id))
              .run()
            // 例外后面补一个 Work 块
            db.insert(s.scheduleBlocks).values({
              entryId: entry.id,
              activityId: workActivity.id,
              startTime: exEnd.toISOString(),
              endTime: bEnd.toISOString(),
              source: 'algorithm',
              locked: false,
            }).run()
            totalBlocks++
          }
        }

        // 插入例外活动块
        db.insert(s.scheduleBlocks).values({
          entryId: entry.id,
          activityId: ex.activityId,
          startTime: ex.startTime,
          endTime: ex.endTime,
          source: 'exception',
          locked: false,
        }).run()
        totalBlocks++
      }
    }

    cursor = cursor.add(1, 'day')
  }

  return { totalEntries, totalBlocks }
}
