/**
 * time.ts — 时间轴配置与时间↔像素转换工具
 *
 * 核心公式：
 *   像素位置 x = (时间 - 时间轴起点) * 每分钟像素数
 *   时间     t = 时间轴起点 + x / 每分钟像素数
 *
 * 所有组件通过这些工具函数进行时间和位置的转换，
 * 修改下面的常量即可调整整个时间轴的显示范围和密度。
 */

import dayjs, { type Dayjs } from 'dayjs'

// ========== 时间轴范围 ==========
// 从今天凌晨 2:00 AM 到明天早上 6:00 AM，共 28 小时
const today = dayjs().startOf('day')
export const TIMELINE_START = today.add(2, 'hour')       // 时间轴左边界
export const TIMELINE_END = today.add(1, 'day').add(6, 'hour') // 时间轴右边界
export const TIMELINE_HOURS = TIMELINE_END.diff(TIMELINE_START, 'hour')   // 总小时数 = 28
export const TIMELINE_MINUTES = TIMELINE_END.diff(TIMELINE_START, 'minute') // 总分钟数

// ========== 显示参数 ==========
export const PX_PER_HOUR = 80                    // 每小时占 80 像素
export const PX_PER_MINUTE = PX_PER_HOUR / 60    // 每分钟占 ≈1.33 像素
export const TIMELINE_WIDTH = TIMELINE_HOURS * PX_PER_HOUR  // 时间轴总宽度（像素）
export const SNAP_MINUTES = 15                   // 拖拽/拉伸时的吸附粒度（分钟）
export const ROW_HEIGHT = 44                     // 每个坐席行的高度（像素）

/**
 * 将时间转换为时间轴上的像素位置（X 坐标）
 * 例：4:00 AM → (4:00 - 2:00) * 80/60 = 160px
 */
export function timeToX(time: Dayjs): number {
  return time.diff(TIMELINE_START, 'minute') * PX_PER_MINUTE
}

/**
 * 将像素位置转换回时间（timeToX 的逆运算）
 * 用于右键点击时计算点击位置对应的时间
 */
export function xToTime(x: number): Dayjs {
  const minutes = x / PX_PER_MINUTE
  return TIMELINE_START.add(minutes, 'minute')
}

/**
 * 将时间吸附到最近的 SNAP_MINUTES（15 分钟）整数倍
 * 例：7:08 → 7:15，7:22 → 7:15，7:23 → 7:30
 */
export function snapTime(time: Dayjs): Dayjs {
  const minutes = time.diff(TIMELINE_START, 'minute')
  const snapped = Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES
  return TIMELINE_START.add(snapped, 'minute')
}

/** 将分钟数格式化为 "H:MM" 形式，如 480 → "8:00" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}:${m.toString().padStart(2, '0')}`
}

/**
 * 生成时间轴顶部的刻度标签（每 2 小时一个）
 * 返回 { x: 像素位置, label: 显示文字 } 数组
 * 跨天的标签会加 "+1" 后缀
 */
export function getHourLabels(): { x: number; label: string }[] {
  const labels: { x: number; label: string }[] = []
  let cursor = TIMELINE_START
  while (cursor.isBefore(TIMELINE_END) || cursor.isSame(TIMELINE_END)) {
    const x = timeToX(cursor)
    const hour = cursor.hour()
    const isNextDay = cursor.isAfter(today.add(1, 'day').subtract(1, 'minute'))
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    const suffix = isNextDay ? ' +1' : ''
    labels.push({ x, label: `${h12}:00 ${ampm}${suffix}` })
    cursor = cursor.add(2, 'hour')
  }
  return labels
}
