import { forwardRef } from 'react'
import { useScheduleStore } from '../store'
import { ROW_HEIGHT } from '../utils/time'

export const AgentList = forwardRef<HTMLDivElement>((_, ref) => {
  const agents = useScheduleStore((s) => s.agents)

  return (
    <div
      ref={ref}
      className="overflow-hidden flex-shrink-0 border-r border-gray-200 bg-white"
      style={{ width: 240 }}
    >
      {/* Header spacer */}
      <div className="h-10 border-b border-gray-200 flex items-center px-3 gap-2">
        <input type="checkbox" className="accent-blue-500" />
        <span className="text-xs font-semibold text-gray-600 tracking-wide">Name</span>
        <span className="text-xs text-gray-400 ml-auto cursor-pointer">↕</span>
      </div>
      {/* Rows */}
      <div>
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="flex items-center px-3 gap-2 border-b border-gray-100 hover:bg-blue-50/40 transition-colors"
            style={{ height: ROW_HEIGHT }}
          >
            <input type="checkbox" className="accent-blue-500 flex-shrink-0" />
            <span className="text-sm text-gray-800 truncate flex-1">{agent.name}</span>
            {agent.icons && agent.icons.length > 0 && (
              <span className="text-xs text-gray-400">
                {agent.icons.map((icon, i) => (
                  <span key={i} className="mr-0.5">●</span>
                ))}
              </span>
            )}
            <span
              className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                agent.shift === 'AM'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {agent.shift}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
})
