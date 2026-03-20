/**
 * useScrollSync — 多区域滚动同步
 *
 * 页面分为 4 个滚动区域：
 * ┌──────────┬──────────────────┬──────────┐
 * │          │   headerRef      │          │
 * │ leftRef  ├──────────────────┤ rightRef │
 * │          │   bodyRef        │          │
 * └──────────┴──────────────────┴──────────┘
 *
 * 同步规则：
 * - bodyRef 水平滚动 → headerRef 跟随（时间刻度对齐）
 * - bodyRef 垂直滚动 → leftRef + rightRef 跟随（行对齐）
 *
 * 只有 bodyRef 可滚动，其他区域的 overflow 设为 hidden，
 * 通过 JS 同步 scrollLeft / scrollTop。
 */

import { ref } from 'vue'

export function useScrollSync() {
  const headerRef = ref<HTMLDivElement | null>(null)  // 顶部时间刻度
  const bodyRef = ref<HTMLDivElement | null>(null)     // 中间时间轴主体（唯一可滚动区域）
  const leftRef = ref<HTMLDivElement | null>(null)     // 左侧坐席列表
  const rightRef = ref<HTMLDivElement | null>(null)    // 右侧工时汇总

  /** bodyRef 滚动时调用，同步其他区域的滚动位置 */
  function onBodyScroll() {
    const body = bodyRef.value
    if (!body) return
    if (headerRef.value) headerRef.value.scrollLeft = body.scrollLeft   // 水平同步
    if (leftRef.value) leftRef.value.scrollTop = body.scrollTop         // 垂直同步
    if (rightRef.value) rightRef.value.scrollTop = body.scrollTop       // 垂直同步
  }

  return { headerRef, bodyRef, leftRef, rightRef, onBodyScroll }
}
