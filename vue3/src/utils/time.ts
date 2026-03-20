/**
 * time.ts — 时间轴配置与时间↔像素转换工具
 *
 * Phase 2 改造：时间轴基于 baseDate（排班方案日期），不再硬编码"今天"。
 * baseDate 由 setBaseDate() 设置，loadTimeline 时调用。
 */

import dayjs, { type Dayjs } from 'dayjs'

// ========== 可变基准日期 ==========
let _baseDate = dayjs().startOf('day')

/** 设置时间轴基准日期（由 store.loadTimeline 调用） */
export function setBaseDate(dateStr: string) {
  _baseDate = dayjs(dateStr).startOf('day')
}

// ========== 时间轴范围（基于 baseDate） ==========
export function getTimelineStart(): Dayjs { return _baseDate.add(2, 'hour') }
export function getTimelineEnd(): Dayjs { return _baseDate.add(1, 'day').add(6, 'hour') }

// 为了兼容静态引用，提供 getter
export const PX_PER_HOUR = 80
export const PX_PER_MINUTE = PX_PER_HOUR / 60
export const SNAP_MINUTES = 15
export const ROW_HEIGHT = 44

/** 时间轴总宽度（28 小时 × 80px） */
export const TIMELINE_WIDTH = 28 * PX_PER_HOUR

export function timeToX(time: Dayjs): number {
  return time.diff(getTimelineStart(), 'minute') * PX_PER_MINUTE
}

export function xToTime(x: number): Dayjs {
  const minutes = x / PX_PER_MINUTE
  return getTimelineStart().add(minutes, 'minute')
}

export function snapTime(time: Dayjs): Dayjs {
  const start = getTimelineStart()
  const minutes = time.diff(start, 'minute')
  const snapped = Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES
  return start.add(snapped, 'minute')
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}:${m.toString().padStart(2, '0')}`
}

export function getHourLabels(): { x: number; label: string }[] {
  const start = getTimelineStart()
  const end = getTimelineEnd()
  const nextDay = _baseDate.add(1, 'day')
  const labels: { x: number; label: string }[] = []
  let cursor = start
  while (cursor.isBefore(end) || cursor.isSame(end)) {
    const x = timeToX(cursor)
    const hour = cursor.hour()
    const isNextDay = cursor.isAfter(nextDay.subtract(1, 'minute'))
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    const suffix = isNextDay ? ' +1' : ''
    labels.push({ x, label: `${h12}:00 ${ampm}${suffix}` })
    cursor = cursor.add(2, 'hour')
  }
  return labels
}
