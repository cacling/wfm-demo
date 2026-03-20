import { useCallback } from 'react'
import dayjs from 'dayjs'
import { useScheduleStore } from '../store'
import { PX_PER_MINUTE, snapTime } from '../utils/time'

export function useBlockInteraction() {
  const onPointerDown = useCallback(
    (
      e: React.PointerEvent,
      blockId: string,
      mode: 'drag' | 'resize-left' | 'resize-right',
    ) => {
      e.stopPropagation()
      e.preventDefault()

      const store = useScheduleStore.getState()
      const activity = store.activities.find((a) => a.id === blockId)
      if (!activity) return // work blocks are not interactive

      store.selectBlock(blockId)

      const startX = e.clientX
      const origStart = activity.start
      const origEnd = activity.end

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX
        const deltaMinutes = dx / PX_PER_MINUTE
        const oStart = dayjs(origStart)
        const oEnd = dayjs(origEnd)

        let newStart: dayjs.Dayjs
        let newEnd: dayjs.Dayjs

        if (mode === 'drag') {
          newStart = snapTime(oStart.add(deltaMinutes, 'minute'))
          const duration = oEnd.diff(oStart, 'minute')
          newEnd = newStart.add(duration, 'minute')
        } else if (mode === 'resize-left') {
          newStart = snapTime(oStart.add(deltaMinutes, 'minute'))
          newEnd = oEnd
          if (newEnd.diff(newStart, 'minute') < 15) return
        } else {
          newStart = oStart
          newEnd = snapTime(oEnd.add(deltaMinutes, 'minute'))
          if (newEnd.diff(newStart, 'minute') < 15) return
        }

        // Live preview: directly update the activity in store
        useScheduleStore.setState((state) => ({
          activities: state.activities.map((a) =>
            a.id === blockId
              ? { ...a, start: newStart.toISOString(), end: newEnd.toISOString() }
              : a,
          ),
        }))
      }

      const onUp = (ev: PointerEvent) => {
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)

        // Revert to original, then validate & commit via store action
        useScheduleStore.setState((state) => ({
          activities: state.activities.map((a) =>
            a.id === blockId
              ? { ...a, start: origStart, end: origEnd }
              : a,
          ),
        }))

        const dx = ev.clientX - startX
        const deltaMinutes = dx / PX_PER_MINUTE
        const s = useScheduleStore.getState()

        if (mode === 'drag') {
          s.moveActivity(blockId, deltaMinutes)
        } else {
          s.resizeActivity(blockId, mode === 'resize-left' ? 'left' : 'right', deltaMinutes)
        }
      }

      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
    },
    [],
  )

  return { onPointerDown }
}
