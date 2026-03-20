<!--
  CurrentTimeLine.vue — 当前时间参考线
-->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import dayjs from 'dayjs'
import { timeToX, getTimelineStart, getTimelineEnd } from '../utils/time'

const now = ref(dayjs())
let timer: ReturnType<typeof setInterval>

onMounted(() => {
  timer = setInterval(() => { now.value = dayjs() }, 60_000)
})
onUnmounted(() => clearInterval(timer))

const visible = ref(true)
const x = ref(0)

function update() {
  const n = now.value
  visible.value = !n.isBefore(getTimelineStart()) && !n.isAfter(getTimelineEnd())
  if (visible.value) x.value = timeToX(n)
}
update()
</script>

<template>
  <div v-if="visible" class="absolute top-0 bottom-0 z-20 pointer-events-none" :style="{ left: x + 'px' }">
    <div class="w-px h-full" style="border-left: 1px dashed rgba(239,68,68,0.5)" />
    <div class="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-red-500 font-medium whitespace-nowrap bg-white/80 px-1 rounded">
      {{ now.format('h:mm A') }}
    </div>
  </div>
</template>
