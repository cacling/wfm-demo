/**
 * rules.ts — 排班业务规则与 Work 块派生逻辑
 *
 * 核心函数 deriveDisplayBlocks() 实现了 WFM 的关键设计思想：
 * - 只存储"活动"（break/meeting/training 等）
 * - Work 块作为"填充物"，自动占满班次内没有活动的时间段
 * - 当活动被移动/删除/新增时，Work 块实时重新计算
 *
 * 这样做的好处：移动一个 Break，两侧的 Work 自动收缩/扩展，无需手动调整。
 */

import dayjs from 'dayjs'
import type { Agent, Activity, DisplayBlock } from '../types'

/**
 * 为某个坐席派生所有展示块（Work + Activities）
 *
 * 算法：
 * 1. 取出该坐席的所有活动，按开始时间排序
 * 2. 用一个"游标"从班次开始时间向后扫描
 * 3. 每遇到一个活动前的空隙 → 插入 Work 块
 * 4. 插入活动本身
 * 5. 最后一个活动到班次结束之间的空隙 → 插入 Work 块
 *
 * 示例（班次 4:00-12:00，有一个 Break 7:00-7:30）：
 *   → Work 4:00-7:00 | Break 7:00-7:30 | Work 7:30-12:00
 *
 * @param agent      - 坐席信息（包含班次起止时间）
 * @param activities - 所有活动列表（函数内部会过滤出该坐席的）
 * @returns DisplayBlock[] - 包含 Work 和 Activity 的完整展示块列表
 */
export function deriveDisplayBlocks(agent: Agent, activities: Activity[]): DisplayBlock[] {
  const shiftStart = dayjs(agent.shiftStart)
  const shiftEnd = dayjs(agent.shiftEnd)

  // 过滤出属于当前坐席的活动，并按开始时间排序
  const sorted = [...activities]
    .filter((a) => a.agentId === agent.id)
    .sort((a, b) => dayjs(a.start).diff(dayjs(b.start)))

  const blocks: DisplayBlock[] = []
  let cursor = shiftStart  // 游标：当前已处理到的时间点

  for (const act of sorted) {
    const actStart = dayjs(act.start)
    const actEnd = dayjs(act.end)

    // 活动前有空隙 → 用 Work 块填充
    if (actStart.isAfter(cursor)) {
      blocks.push({
        id: `work-${agent.id}-${cursor.valueOf()}`,  // 用时间戳生成唯一 ID
        agentId: agent.id,
        type: 'work',
        start: cursor.toISOString(),
        end: actStart.toISOString(),
        editable: false,  // Work 块不可编辑
      })
    }

    // 插入活动块本身
    blocks.push({
      id: act.id,
      agentId: agent.id,
      type: act.type,
      start: act.start,
      end: act.end,
      editable: true,  // 活动块可拖拽/拉伸/删除
    })

    // 推进游标到活动结束时间
    cursor = actEnd.isAfter(cursor) ? actEnd : cursor
  }

  // 最后一个活动到班次结束之间的空隙 → 用 Work 块填充
  if (cursor.isBefore(shiftEnd)) {
    blocks.push({
      id: `work-${agent.id}-${cursor.valueOf()}`,
      agentId: agent.id,
      type: 'work',
      start: cursor.toISOString(),
      end: shiftEnd.toISOString(),
      editable: false,
    })
  }

  return blocks
}

/** 计算一组展示块的总时长（分钟） */
export function calcWorkMinutes(blocks: DisplayBlock[]): number {
  return blocks.reduce((sum, b) => sum + dayjs(b.end).diff(dayjs(b.start), 'minute'), 0)
}
