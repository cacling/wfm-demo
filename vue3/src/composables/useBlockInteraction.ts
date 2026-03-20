/**
 * useBlockInteraction — 排班块的拖拽移动和拉伸交互
 *
 * 交互流程（以拖拽为例）：
 * 1. pointerdown  → 记录初始鼠标位置和活动原始时间
 * 2. pointermove  → 计算鼠标偏移量 → 转为分钟数 → 吸附 → 实时预览
 * 3. pointerup    → 回滚到原始位置 → 调用 store.moveActivity() 做校验提交
 *
 * 为什么要"先回滚再提交"？
 * - 拖拽过程中用 updateActivityPreview 直接修改位置（绕过校验，保证流畅）
 * - 松手时先恢复原始位置，再用 moveActivity 做完整校验
 * - 如果校验不通过，活动自动回到原位（不会卡在非法位置）
 *
 * 为什么用 document 级事件而不是组件级？
 * - 鼠标可能移出块的范围，如果事件绑在块上，移出后就收不到事件了
 * - document 级事件保证无论鼠标移到哪里，都能持续追踪
 */

import dayjs from 'dayjs'
import { useScheduleStore } from '../stores/schedule'
import { PX_PER_MINUTE, snapTime } from '../utils/time'

export function useBlockInteraction() {
  const store = useScheduleStore()

  /**
   * 按下块时触发 — 初始化拖拽/拉伸状态
   * @param e       - 指针事件
   * @param blockId - 被按下的活动块 ID
   * @param mode    - 'drag'=整体移动, 'resize-left'=拉伸左边, 'resize-right'=拉伸右边
   */
  function onPointerDown(
    e: PointerEvent,
    blockId: string,
    mode: 'drag' | 'resize-left' | 'resize-right',
  ) {
    e.stopPropagation()  // 阻止冒泡到父容器的 click（否则会取消选中）
    e.preventDefault()   // 阻止浏览器默认行为（如文本选中）

    // 只处理活动块（Work 块的 id 不在 activities 中，会被过滤掉）
    const activity = store.activities.find((a) => a.id === blockId)
    if (!activity) return

    // 立即选中该块
    store.selectBlock(blockId)

    // 记录拖拽起始状态
    const startX = e.clientX         // 鼠标起始 X 坐标
    const origStart = activity.start // 活动原始开始时间
    const origEnd = activity.end     // 活动原始结束时间

    /** 鼠标移动时 → 实时更新预览位置 */
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX                // 鼠标水平偏移量（像素）
      const deltaMinutes = dx / PX_PER_MINUTE       // 转换为时间偏移量（分钟）
      const oStart = dayjs(origStart)
      const oEnd = dayjs(origEnd)

      let newStart: dayjs.Dayjs
      let newEnd: dayjs.Dayjs

      if (mode === 'drag') {
        // 整体移动：起点偏移，终点跟随（保持时长不变）
        newStart = snapTime(oStart.add(deltaMinutes, 'minute'))
        const duration = oEnd.diff(oStart, 'minute')
        newEnd = newStart.add(duration, 'minute')
      } else if (mode === 'resize-left') {
        // 拉伸左边：只改起点，终点不变
        newStart = snapTime(oStart.add(deltaMinutes, 'minute'))
        newEnd = oEnd
        if (newEnd.diff(newStart, 'minute') < 15) return  // 最小 15 分钟
      } else {
        // 拉伸右边：只改终点，起点不变
        newStart = oStart
        newEnd = snapTime(oEnd.add(deltaMinutes, 'minute'))
        if (newEnd.diff(newStart, 'minute') < 15) return
      }

      // 实时预览（不校验，保证拖拽流畅）
      store.updateActivityPreview(blockId, newStart.toISOString(), newEnd.toISOString())
    }

    /** 鼠标松开时 → 回滚并正式提交 */
    const onUp = (ev: PointerEvent) => {
      // 清理事件监听
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)

      // 第一步：回滚到原始位置（撤销预览）
      store.updateActivityPreview(blockId, origStart, origEnd)

      // 第二步：通过 store action 做校验提交
      const dx = ev.clientX - startX
      const deltaMinutes = dx / PX_PER_MINUTE

      if (mode === 'drag') {
        store.moveActivity(blockId, deltaMinutes)
      } else {
        store.resizeActivity(blockId, mode === 'resize-left' ? 'left' : 'right', deltaMinutes)
      }
    }

    // 在 document 级别监听后续事件
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  return { onPointerDown }
}
