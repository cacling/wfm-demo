import { AgentList } from './AgentList'
import { TimelineHeader } from './TimelineHeader'
import { TimelineBody } from './TimelineBody'
import { ContractTime } from './ContractTime'
import { useScrollSync } from '../hooks/useScrollSync'
import { BLOCK_COLORS, BLOCK_LABELS } from '../types'

export function ScheduleEditor() {
  const { headerRef, bodyRef, leftRef, rightRef, onBodyScroll } = useScrollSync()

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-4 flex-shrink-0">
        <h1 className="text-sm font-bold text-gray-800">WFM Schedule Editor</h1>
        <div className="flex-1" />
        {/* Legend */}
        <div className="flex items-center gap-3">
          {Object.entries(BLOCK_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-gray-500">
                {BLOCK_LABELS[type as keyof typeof BLOCK_LABELS]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Agent list */}
        <AgentList ref={leftRef} />

        {/* Center: Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <TimelineHeader ref={headerRef} />
          <TimelineBody ref={bodyRef} onScroll={onBodyScroll} />
        </div>

        {/* Right: Contract time */}
        <ContractTime ref={rightRef} />
      </div>
    </div>
  )
}
