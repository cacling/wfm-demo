import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react'
import { useScheduleStore } from '../store'
import { TIMELINE_WIDTH, ROW_HEIGHT, getHourLabels, xToTime } from '../utils/time'
import { ScheduleBlockView } from './ScheduleBlock'
import { CurrentTimeLine } from './CurrentTimeLine'
import { ContextMenu } from './ContextMenu'
import { useBlockInteraction } from '../hooks/useBlockInteraction'
import { BLOCK_LABELS, type ActivityType, type DisplayBlock } from '../types'

interface Props {
  onScroll: () => void
}

interface MenuState {
  x: number
  y: number
  mode: 'add' | 'delete'
  agentId?: string
  timeISO?: string
  blockId?: string
  blockLabel?: string
}

export const TimelineBody = forwardRef<HTMLDivElement, Props>(({ onScroll }, ref) => {
  const agents = useScheduleStore((s) => s.agents)
  const activities = useScheduleStore((s) => s.activities)
  const getDisplayBlocks = useScheduleStore((s) => s.getDisplayBlocks)
  const selectBlock = useScheduleStore((s) => s.selectBlock)
  const deleteActivity = useScheduleStore((s) => s.deleteActivity)
  const addActivity = useScheduleStore((s) => s.addActivity)
  const selectedBlockId = useScheduleStore((s) => s.selectedBlockId)
  const { onPointerDown } = useBlockInteraction()

  const [menu, setMenu] = useState<MenuState | null>(null)

  const hourLines = useMemo(() => getHourLabels(), [])

  const allBlocks = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getDisplayBlocks>>()
    for (const agent of agents) {
      map.set(agent.id, getDisplayBlocks(agent.id))
    }
    return map
  }, [agents, activities, getDisplayBlocks])

  // Keyboard delete
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockId) {
        const isActivity = useScheduleStore.getState().activities.some((a) => a.id === selectedBlockId)
        if (isActivity) {
          deleteActivity(selectedBlockId)
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [selectedBlockId, deleteActivity])

  // Right-click on block
  const onBlockContextMenu = useCallback((e: React.MouseEvent, block: DisplayBlock) => {
    if (block.type === 'work') {
      // Right-click on Work → add activity at this time
      const scrollContainer = (ref as React.RefObject<HTMLDivElement>)?.current
      const scrollLeft = scrollContainer?.scrollLeft ?? 0
      const containerRect = scrollContainer?.getBoundingClientRect()
      const relativeX = e.clientX - (containerRect?.left ?? 0) + scrollLeft
      const time = xToTime(relativeX)

      setMenu({
        x: e.clientX,
        y: e.clientY,
        mode: 'add',
        agentId: block.agentId,
        timeISO: time.toISOString(),
      })
    } else {
      // Right-click on activity → delete
      setMenu({
        x: e.clientX,
        y: e.clientY,
        mode: 'delete',
        blockId: block.id,
        blockLabel: BLOCK_LABELS[block.type],
      })
    }
  }, [ref])

  const handleAdd = useCallback((type: ActivityType) => {
    if (menu?.agentId && menu?.timeISO) {
      addActivity(menu.agentId, type, menu.timeISO)
    }
  }, [menu, addActivity])

  const handleDelete = useCallback(() => {
    if (menu?.blockId) {
      deleteActivity(menu.blockId)
    }
  }, [menu, deleteActivity])

  return (
    <>
      <div
        ref={ref}
        className="flex-1 overflow-auto"
        onScroll={onScroll}
        onClick={() => {
          selectBlock(null)
          setMenu(null)
        }}
      >
        <div className="relative" style={{ width: TIMELINE_WIDTH, minHeight: '100%' }}>
          {hourLines.map(({ x }) => (
            <div
              key={x}
              className="absolute top-0 bottom-0 w-px bg-gray-100"
              style={{ left: x }}
            />
          ))}

          <CurrentTimeLine />

          {agents.map((agent) => {
            const blocks = allBlocks.get(agent.id) || []
            return (
              <div
                key={agent.id}
                className="relative border-b border-gray-100 hover:bg-blue-50/20"
                style={{ height: ROW_HEIGHT }}
              >
                {blocks.map((block) => (
                  <ScheduleBlockView
                    key={block.id}
                    block={block}
                    onPointerDown={onPointerDown}
                    onContextMenu={onBlockContextMenu}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          mode={menu.mode}
          blockLabel={menu.blockLabel}
          onAdd={handleAdd}
          onDelete={handleDelete}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  )
})
