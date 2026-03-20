<!--
  TimelineHeader.vue — 顶部时间刻度
-->
<script setup lang="ts">
import { computed } from 'vue'
import { getHourLabels, TIMELINE_WIDTH } from '../utils/time'
import { useScheduleStore } from '../stores/schedule'

const store = useScheduleStore()

// 当 currentDate 变化时重新计算刻度（确保基准日期正确）
const labels = computed(() => {
  // 依赖 store.currentDate 触发重算
  void store.currentDate
  return getHourLabels()
})
</script>

<template>
  <div class="h-10 border-b border-gray-200 overflow-hidden flex-shrink-0 bg-white">
    <div class="relative" :style="{ width: TIMELINE_WIDTH + 'px', height: '40px' }">
      <div
        v-for="{ x, label } in labels"
        :key="x"
        class="absolute top-0 h-full flex flex-col justify-end pb-1"
        :style="{ left: x + 'px' }"
      >
        <div class="w-px h-2 bg-gray-300" />
        <span class="text-[10px] text-gray-500 whitespace-nowrap ml-1 select-none">{{ label }}</span>
      </div>
      <div
        v-for="{ x } in labels"
        :key="'line-' + x"
        class="absolute top-0 w-px h-full bg-gray-100"
        :style="{ left: x + 'px' }"
      />
    </div>
  </div>
</template>
