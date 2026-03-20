/** 时间吸附到 15 分钟粒度 */
import dayjs from 'dayjs'

const SNAP_MINUTES = 15

export function snapTime(iso: string): string {
  const d = dayjs(iso)
  const minutes = d.minute()
  const snapped = Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES
  return d.startOf('hour').add(snapped, 'minute').toISOString()
}
