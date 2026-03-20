/**
 * useBlockInteraction — 拖拽/拉伸交互（Phase 2: 适配新 store API）
 */

import dayjs from 'dayjs'
import { useScheduleStore } from '../stores/schedule'
import { PX_PER_MINUTE, snapTime } from '../utils/time'

export function useBlockInteraction() {
  const store = useScheduleStore()

  function onPointerDown(
    e: PointerEvent,
    blockId: string,
    mode: 'drag' | 'resize-left' | 'resize-right',
  ) {
    e.stopPropagation()
    e.preventDefault()

    const block = store.blocks.find((b) => b.id === blockId)
    if (!block || !block.editable) return

    store.selectBlock(blockId)

    const startX = e.clientX
    const origStart = block.start
    const origEnd = block.end

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

      store.updateBlockPreview(blockId, newStart.toISOString(), newEnd.toISOString())
    }

    const onUp = async (ev: PointerEvent) => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)

      // 回滚到原始位置（后端 commit 成功后会重新加载）
      store.updateBlockPreview(blockId, origStart, origEnd)

      const dx = ev.clientX - startX
      const deltaMinutes = dx / PX_PER_MINUTE

      if (mode === 'drag') {
        await store.moveBlock(blockId, deltaMinutes)
      } else {
        await store.resizeBlock(blockId, mode === 'resize-left' ? 'left' : 'right', deltaMinutes)
      }
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  return { onPointerDown }
}
