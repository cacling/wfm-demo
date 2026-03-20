import { useEffect, useRef } from 'react'
import { BLOCK_COLORS, BLOCK_LABELS, type ActivityType } from '../types'

const ACTIVITY_TYPES: ActivityType[] = ['break', 'meeting', 'training', 'offline', 'other']

interface ContextMenuProps {
  x: number
  y: number
  mode: 'add' | 'delete'
  blockLabel?: string
  onAdd?: (type: ActivityType) => void
  onDelete?: () => void
  onClose: () => void
}

export function ContextMenu({ x, y, mode, blockLabel, onAdd, onDelete, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Adjust position to stay within viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: 50,
  }

  return (
    <div
      ref={ref}
      style={style}
      className="bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px] text-sm"
    >
      {mode === 'add' && (
        <>
          <div className="px-3 py-1.5 text-[10px] text-gray-400 font-semibold tracking-wide uppercase">
            Add Activity
          </div>
          {ACTIVITY_TYPES.map((type) => (
            <button
              key={type}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-blue-50 transition-colors text-left"
              onClick={() => {
                onAdd?.(type)
                onClose()
              }}
            >
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: BLOCK_COLORS[type] }}
              />
              <span className="text-gray-700">{BLOCK_LABELS[type]}</span>
            </button>
          ))}
        </>
      )}
      {mode === 'delete' && (
        <button
          className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-red-50 transition-colors text-left text-red-600"
          onClick={() => {
            onDelete?.()
            onClose()
          }}
        >
          <span>✕</span>
          <span>Delete {blockLabel}</span>
        </button>
      )}
    </div>
  )
}
