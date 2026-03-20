<!--
  CoverageBar.vue — 人力覆盖率可视化条

  在时间轴底部展示每个时段有多少人在 Work 状态。
  颜色深浅表示覆盖程度。
-->
<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import { useScheduleStore } from '../stores/schedule'
import { getTimelineStart, PX_PER_MINUTE, TIMELINE_WIDTH } from '../utils/time'

const store = useScheduleStore()

/** 按 30 分钟切片统计 Work 人数 */
const coverageSlots = computed(() => {
  if (!store.currentDate || store.blocks.length === 0) return []

  const start = getTimelineStart()
  const slots: { x: number; width: number; count: number }[] = []
  const slotMinutes = 30

  for (let offset = 0; offset < 28 * 60; offset += slotMinutes) {
    const slotStart = start.add(offset, 'minute')
    const slotEnd = slotStart.add(slotMinutes, 'minute')

    let count = 0
    const seen = new Set<string>()

    for (const block of store.blocks) {
      if (block.type !== 'work') continue
      if (seen.has(block.agentId)) continue

      const bStart = dayjs(block.start)
      const bEnd = dayjs(block.end)
      if (bStart.isBefore(slotEnd) && bEnd.isAfter(slotStart)) {
        count++
        seen.add(block.agentId)
      }
    }

    slots.push({
      x: offset * PX_PER_MINUTE,
      width: slotMinutes * PX_PER_MINUTE,
      count,
    })
  }

  return slots
})

const maxCount = computed(() => Math.max(...coverageSlots.value.map((s) => s.count), 1))
</script>

<template>
  <div class="h-6 relative bg-gray-50 border-t border-gray-200" :style="{ width: TIMELINE_WIDTH + 'px' }">
    <div
      v-for="(slot, i) in coverageSlots"
      :key="i"
      class="absolute top-0 h-full flex items-center justify-center text-[8px] font-medium border-r border-gray-100"
      :style="{
        left: slot.x + 'px',
        width: slot.width + 'px',
        backgroundColor: `rgba(74, 222, 128, ${slot.count / maxCount * 0.6 + 0.1})`,
        color: slot.count > 0 ? '#166534' : '#9ca3af',
      }"
      :title="`${slot.count} agents working`"
    >
      {{ slot.count || '' }}
    </div>
  </div>
</template>
