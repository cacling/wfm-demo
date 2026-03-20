<!--
  CurrentTimeLine.vue — 当前时间参考线

  功能：
  - 在时间轴上显示一条红色虚线，标记当前时间
  - 顶部显示时间文字（如 "3:15 PM"）
  - 每 60 秒自动更新位置
  - 如果当前时间不在时间轴范围内，不渲染

  使用 pointer-events:none 确保不影响排班块的交互。
-->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import dayjs from 'dayjs'
import { timeToX, TIMELINE_START, TIMELINE_END } from '../utils/time'

const now = ref(dayjs())
let timer: ReturnType<typeof setInterval>

// 每分钟更新一次当前时间
onMounted(() => {
  timer = setInterval(() => { now.value = dayjs() }, 60_000)
})
onUnmounted(() => clearInterval(timer))

// 判断当前时间是否在时间轴可见范围内
const visible = ref(true)
const x = ref(0)

function update() {
  const n = now.value
  visible.value = !n.isBefore(TIMELINE_START) && !n.isAfter(TIMELINE_END)
  if (visible.value) x.value = timeToX(n)
}
update()
</script>

<template>
  <div v-if="visible" class="absolute top-0 bottom-0 z-20 pointer-events-none" :style="{ left: x + 'px' }">
    <!-- 红色虚线 -->
    <div class="w-px h-full" style="border-left: 1px dashed rgba(239,68,68,0.5)" />
    <!-- 时间标签 -->
    <div class="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-red-500 font-medium whitespace-nowrap bg-white/80 px-1 rounded">
      {{ now.format('h:mm A') }}
    </div>
  </div>
</template>
