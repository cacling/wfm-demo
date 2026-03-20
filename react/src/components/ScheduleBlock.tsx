import { memo } from 'react'
import dayjs from 'dayjs'
import { BLOCK_COLORS, BLOCK_LABELS, type DisplayBlock } from '../types'
import { timeToX, PX_PER_MINUTE } from '../utils/time'
import { useScheduleStore } from '../store'

interface Props {
  block: DisplayBlock
  onPointerDown: (
    e: React.PointerEvent,
    blockId: string,
    mode: 'drag' | 'resize-left' | 'resize-right',
  ) => void
  onContextMenu: (e: React.MouseEvent, block: DisplayBlock) => void
}

export const ScheduleBlockView = memo(function ScheduleBlockView({
  block,
  onPointerDown,
  onContextMenu,
}: Props) {
  const selectedBlockId = useScheduleStore((s) => s.selectedBlockId)
  const deleteActivity = useScheduleStore((s) => s.deleteActivity)
  const start = dayjs(block.start)
  const end = dayjs(block.end)
  const x = timeToX(start)
  const width = end.diff(start, 'minute') * PX_PER_MINUTE
  const color = BLOCK_COLORS[block.type]
  const isSelected = selectedBlockId === block.id

  return (
    <div
      className="absolute top-1 group"
      style={{
        left: x,
        width: Math.max(width, 4),
        height: 'calc(100% - 8px)',
      }}
    >
      {/* Main block body */}
      <div
        className={`h-full rounded-[3px] relative overflow-hidden select-none
          ${block.editable ? 'cursor-grab active:cursor-grabbing hover:brightness-110' : 'cursor-default'}
          ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
        `}
        style={{ backgroundColor: color }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => block.editable && onPointerDown(e, block.id, 'drag')}
        onContextMenu={(e) => {
          e.preventDefault()
          onContextMenu(e, block)
        }}
        title={`${BLOCK_LABELS[block.type]}\n${start.format('HH:mm')} - ${end.format('HH:mm')}`}
      >
        {/* Label if wide enough */}
        {width > 60 && (
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white/90 drop-shadow-sm pointer-events-none">
            {BLOCK_LABELS[block.type]}
          </span>
        )}

        {/* Hover delete button for activities */}
        {block.editable && (
          <button
            className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] leading-none
              flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20
              hover:bg-red-600"
            onClick={(e) => {
              e.stopPropagation()
              deleteActivity(block.id)
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Left resize handle */}
      {block.editable && (
        <div
          className="absolute left-0 top-0 w-2 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 z-10"
          onPointerDown={(e) => onPointerDown(e, block.id, 'resize-left')}
        >
          <div className="w-0.5 h-full bg-white/60 ml-0.5 rounded" />
        </div>
      )}

      {/* Right resize handle */}
      {block.editable && (
        <div
          className="absolute right-0 top-0 w-2 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 z-10"
          onPointerDown={(e) => onPointerDown(e, block.id, 'resize-right')}
        >
          <div className="w-0.5 h-full bg-white/60 ml-auto mr-0.5 rounded" />
        </div>
      )}
    </div>
  )
})
