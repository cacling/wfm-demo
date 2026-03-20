<!--
  ContractTime.vue — 右侧工时汇总列

  显示每个坐席的班次总时长（shiftEnd - shiftStart），格式为 "H:MM"。
  行高与 TimelineBody 保持一致（ROW_HEIGHT），确保纵向滚动对齐。
  overflow:hidden，由 ScheduleEditor 同步 scrollTop。
-->
<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import { useScheduleStore } from '../stores/schedule'
import { formatDuration, ROW_HEIGHT } from '../utils/time'
import { storeToRefs } from 'pinia'

const store = useScheduleStore()
const { agents } = storeToRefs(store)

/** 计算每个坐席的班次总时长（分钟） */
const totals = computed(() =>
  agents.value.map((agent) => ({
    id: agent.id,
    minutes: dayjs(agent.shiftEnd).diff(dayjs(agent.shiftStart), 'minute'),
  })),
)
</script>

<template>
  <div class="overflow-hidden flex-shrink-0 border-l border-gray-200 bg-white" :style="{ width: '110px' }">
    <!-- 表头 -->
    <div class="h-10 border-b border-gray-200 flex items-center justify-center">
      <span class="text-[10px] font-semibold text-gray-500 tracking-wide">Contract time</span>
    </div>
    <!-- 每个坐席的工时 -->
    <div>
      <div
        v-for="t in totals"
        :key="t.id"
        class="flex items-center justify-center border-b border-gray-100"
        :style="{ height: ROW_HEIGHT + 'px' }"
      >
        <span class="text-sm font-medium text-gray-700 tabular-nums">{{ formatDuration(t.minutes) }}</span>
      </div>
    </div>
  </div>
</template>
