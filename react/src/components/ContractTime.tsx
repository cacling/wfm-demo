import { forwardRef, useMemo } from 'react'
import dayjs from 'dayjs'
import { useScheduleStore } from '../store'
import { formatDuration, ROW_HEIGHT } from '../utils/time'

export const ContractTime = forwardRef<HTMLDivElement>((_, ref) => {
  const agents = useScheduleStore((s) => s.agents)
  const activities = useScheduleStore((s) => s.activities)

  const totals = useMemo(() => {
    return agents.map((agent) => {
      const shiftMinutes = dayjs(agent.shiftEnd).diff(dayjs(agent.shiftStart), 'minute')
      return { id: agent.id, minutes: shiftMinutes }
    })
  }, [agents, activities])

  return (
    <div
      ref={ref}
      className="overflow-hidden flex-shrink-0 border-l border-gray-200 bg-white"
      style={{ width: 110 }}
    >
      <div className="h-10 border-b border-gray-200 flex items-center justify-center">
        <span className="text-[10px] font-semibold text-gray-500 tracking-wide">
          Contract time
        </span>
      </div>
      <div>
        {totals.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-center border-b border-gray-100"
            style={{ height: ROW_HEIGHT }}
          >
            <span className="text-sm font-medium text-gray-700 tabular-nums">
              {formatDuration(t.minutes)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
})
