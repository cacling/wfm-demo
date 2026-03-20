import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { timeToX, TIMELINE_START, TIMELINE_END } from '../utils/time'

export function CurrentTimeLine() {
  const [now, setNow] = useState(dayjs())

  useEffect(() => {
    const timer = setInterval(() => setNow(dayjs()), 60_000)
    return () => clearInterval(timer)
  }, [])

  if (now.isBefore(TIMELINE_START) || now.isAfter(TIMELINE_END)) return null

  const x = timeToX(now)

  return (
    <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: x }}>
      <div className="w-px h-full bg-red-400/60" style={{ borderLeft: '1px dashed rgba(239,68,68,0.5)' }} />
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-red-500 font-medium whitespace-nowrap bg-white/80 px-1 rounded">
        {now.format('h:mm A')}
      </div>
    </div>
  )
}
