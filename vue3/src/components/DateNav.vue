<!--
  DateNav.vue — 日期切换导航
-->
<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import { useScheduleStore } from '../stores/schedule'

const store = useScheduleStore()

const displayDate = computed(() => {
  if (!store.currentDate) return ''
  return dayjs(store.currentDate).format('ddd, MMM D, YYYY')
})

function prev() {
  if (!store.currentPlanId || !store.currentDate) return
  const d = dayjs(store.currentDate).subtract(1, 'day').format('YYYY-MM-DD')
  store.loadTimeline(store.currentPlanId, d)
}

function next() {
  if (!store.currentPlanId || !store.currentDate) return
  const d = dayjs(store.currentDate).add(1, 'day').format('YYYY-MM-DD')
  store.loadTimeline(store.currentPlanId, d)
}
</script>

<template>
  <div class="flex items-center gap-1">
    <button
      class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 text-sm"
      @click="prev"
    >←</button>
    <span class="text-xs font-medium text-gray-700 min-w-[140px] text-center">{{ displayDate }}</span>
    <button
      class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 text-sm"
      @click="next"
    >→</button>
  </div>
</template>
