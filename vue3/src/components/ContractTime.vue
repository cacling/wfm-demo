<!--
  ContractTime.vue — 右侧工时汇总（Phase 2: 从 agent.shiftStart/End 计算）
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useScheduleStore } from '../stores/schedule'
import { formatDuration, ROW_HEIGHT } from '../utils/time'
import { storeToRefs } from 'pinia'

const store = useScheduleStore()
const { agents } = storeToRefs(store)

const totals = computed(() =>
  agents.value.map((agent) => {
    const [sh, sm] = agent.shiftStart.split(':').map(Number)
    const [eh, em] = agent.shiftEnd.split(':').map(Number)
    const minutes = (eh * 60 + em) - (sh * 60 + sm)
    return { id: agent.id, minutes: minutes > 0 ? minutes : minutes + 1440 }
  }),
)
</script>

<template>
  <div class="overflow-hidden flex-shrink-0 border-l border-gray-200 bg-white" :style="{ width: '110px' }">
    <div class="h-10 border-b border-gray-200 flex items-center justify-center">
      <span class="text-[10px] font-semibold text-gray-500 tracking-wide">Contract time</span>
    </div>
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
