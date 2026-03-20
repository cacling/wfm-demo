import dayjs, { type Dayjs } from 'dayjs'

// Timeline: 2:00 AM today → 6:00 AM next day = 28 hours
const today = dayjs().startOf('day')
export const TIMELINE_START = today.add(2, 'hour')
export const TIMELINE_END = today.add(1, 'day').add(6, 'hour')
export const TIMELINE_HOURS = TIMELINE_END.diff(TIMELINE_START, 'hour')
export const TIMELINE_MINUTES = TIMELINE_END.diff(TIMELINE_START, 'minute')

export const PX_PER_HOUR = 80
export const PX_PER_MINUTE = PX_PER_HOUR / 60
export const TIMELINE_WIDTH = TIMELINE_HOURS * PX_PER_HOUR
export const SNAP_MINUTES = 15
export const ROW_HEIGHT = 44

export function timeToX(time: Dayjs): number {
  return time.diff(TIMELINE_START, 'minute') * PX_PER_MINUTE
}

export function xToTime(x: number): Dayjs {
  const minutes = x / PX_PER_MINUTE
  return TIMELINE_START.add(minutes, 'minute')
}

export function snapTime(time: Dayjs): Dayjs {
  const minutes = time.diff(TIMELINE_START, 'minute')
  const snapped = Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES
  return TIMELINE_START.add(snapped, 'minute')
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}:${m.toString().padStart(2, '0')}`
}

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
