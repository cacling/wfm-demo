import { forwardRef } from 'react'
import { getHourLabels, TIMELINE_WIDTH, PX_PER_HOUR } from '../utils/time'

export const TimelineHeader = forwardRef<HTMLDivElement>((_, ref) => {
  const labels = getHourLabels()

  return (
    <div
      ref={ref}
      className="h-10 border-b border-gray-200 overflow-hidden flex-shrink-0 bg-white"
    >
      <div className="relative" style={{ width: TIMELINE_WIDTH, height: 40 }}>
        {labels.map(({ x, label }) => (
          <div
            key={x}
            className="absolute top-0 h-full flex flex-col justify-end pb-1"
            style={{ left: x }}
          >
            <div className="w-px h-2 bg-gray-300" />
            <span className="text-[10px] text-gray-500 whitespace-nowrap ml-1 select-none">
              {label}
            </span>
          </div>
        ))}
        {/* Fine grid lines every 2 hours */}
        {labels.map(({ x }) => (
          <div
            key={`line-${x}`}
            className="absolute top-0 w-px h-full bg-gray-100"
            style={{ left: x }}
          />
        ))}
      </div>
    </div>
  )
})
