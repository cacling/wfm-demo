/**
 * types.ts — WFM 排班编辑器的核心类型定义
 *
 * 数据模型分三层：
 * 1. Agent        — 坐席/员工，包含班次时间范围
 * 2. Activity     — 非工作活动（break/meeting 等），是用户可编辑的对象
 * 3. DisplayBlock — 渲染用的展示块，包含 Activity + 自动填充的 Work 块
 *
 * 关键设计：Work 块不存储，由 deriveDisplayBlocks() 运行时计算生成
 */

/** 坐席/员工信息 */
export interface Agent {
  id: string
  name: string
  shift: 'AM' | 'MD'          // 班次类型标签
  shiftStart: string           // 班次开始时间（ISO datetime）
  shiftEnd: string             // 班次结束时间（ISO datetime）
  icons?: string[]             // 可选的图标标识（如 headset、phone）
}

/** 活动类型 — 只包含非工作活动，Work 是自动派生的 */
export type ActivityType = 'break' | 'meeting' | 'training' | 'offline' | 'other'

/** 活动块 — 用户可拖拽/编辑的排班活动 */
export interface Activity {
  id: string
  agentId: string              // 所属坐席 ID
  type: ActivityType
  start: string                // 开始时间（ISO datetime）
  end: string                  // 结束时间（ISO datetime）
}

/** 块类型 = Work + 所有活动类型 */
export type BlockType = 'work' | ActivityType

/**
 * 展示块 — 渲染到时间轴上的最终对象
 * - Activity → editable: true（可拖拽/拉伸/删除）
 * - Work     → editable: false（自动填充，不可编辑）
 */
export interface DisplayBlock {
  id: string
  agentId: string
  type: BlockType
  start: string
  end: string
  editable: boolean
}

/** 块类型 → 背景颜色映射 */
export const BLOCK_COLORS: Record<BlockType, string> = {
  work: '#4ade80',       // 绿色
  break: '#facc15',      // 黄色
  meeting: '#3b82f6',    // 蓝色
  offline: '#f97316',    // 橙色
  training: '#818cf8',   // 紫色
  other: '#fb923c',      // 浅橙色
}

/** 块类型 → 显示文字映射 */
export const BLOCK_LABELS: Record<BlockType, string> = {
  work: 'Work',
  break: 'Break',
  meeting: 'Meeting',
  offline: 'Offline',
  training: 'Training',
  other: 'Other',
}
