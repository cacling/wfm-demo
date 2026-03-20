<!--
  TimelineHeader.vue — 顶部时间刻度

  显示内容：
  - 每 2 小时一个刻度标签（如 "4:00 AM"、"12:00 AM +1"）
  - 每个刻度位置有一条细竖线

  宽度与 TimelineBody 相同（TIMELINE_WIDTH），
  通过 ScheduleEditor 同步 scrollLeft 实现水平对齐。
-->
<script setup lang="ts">
import { getHourLabels, TIMELINE_WIDTH } from '../utils/time'

// 刻度标签是静态数据，只计算一次
const labels = getHourLabels()
</script>

<template>
  <div class="h-10 border-b border-gray-200 overflow-hidden flex-shrink-0 bg-white">
    <div class="relative" :style="{ width: TIMELINE_WIDTH + 'px', height: '40px' }">
      <!-- 刻度标签 -->
      <div
        v-for="{ x, label } in labels"
        :key="x"
        class="absolute top-0 h-full flex flex-col justify-end pb-1"
        :style="{ left: x + 'px' }"
      >
        <div class="w-px h-2 bg-gray-300" />
        <span class="text-[10px] text-gray-500 whitespace-nowrap ml-1 select-none">{{ label }}</span>
      </div>
      <!-- 刻度竖线 -->
      <div
        v-for="{ x } in labels"
        :key="'line-' + x"
        class="absolute top-0 w-px h-full bg-gray-100"
        :style="{ left: x + 'px' }"
      />
    </div>
  </div>
</template>
