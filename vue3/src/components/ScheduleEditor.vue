<!--
  ScheduleEditor.vue — 排班编辑器主容器

  页面布局：
  ┌─────────────────────────────────────────────┐
  │  Toolbar（标题 + 图例）                       │
  ├──────────┬──────────────────┬────────────────┤
  │ leftRef  │ headerRef        │ rightRef       │
  │ 坐席列表  │ 时间刻度          │ 工时汇总        │
  │          ├──────────────────┤                │
  │          │ TimelineBody     │                │
  │          │ 时间轴主体（可滚动） │                │
  └──────────┴──────────────────┴────────────────┘

  滚动同步：
  - TimelineBody 滚动时 → emit('scroll') → onBodyScroll()
  - onBodyScroll 同步 headerRef（水平）、leftRef/rightRef（垂直）
-->
<script setup lang="ts">
import { ref } from 'vue'
import AgentList from './AgentList.vue'
import TimelineHeader from './TimelineHeader.vue'
import TimelineBody from './TimelineBody.vue'
import ContractTime from './ContractTime.vue'
import { BLOCK_COLORS, BLOCK_LABELS } from '../types'

// ========== 滚动同步 ref ==========
const headerRef = ref<HTMLDivElement | null>(null)   // 顶部时间刻度容器
const leftRef = ref<HTMLDivElement | null>(null)     // 左侧坐席列表容器
const rightRef = ref<HTMLDivElement | null>(null)    // 右侧工时汇总容器
const timelineBodyRef = ref<InstanceType<typeof TimelineBody> | null>(null) // TimelineBody 组件实例

/** TimelineBody 滚动时，同步其他区域的滚动位置 */
function onBodyScroll() {
  const body = timelineBodyRef.value?.bodyRef  // 通过 defineExpose 暴露的 DOM ref
  if (!body) return
  if (headerRef.value) headerRef.value.scrollLeft = body.scrollLeft
  if (leftRef.value) leftRef.value.scrollTop = body.scrollTop
  if (rightRef.value) rightRef.value.scrollTop = body.scrollTop
}

// 生成图例数据（顶部工具栏右侧的颜色标注）
const legendItems = Object.entries(BLOCK_COLORS).map(([type, color]) => ({
  type,
  color,
  label: BLOCK_LABELS[type as keyof typeof BLOCK_LABELS],
}))
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <!-- 顶部工具栏：标题 + 图例 -->
    <div class="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-4 flex-shrink-0">
      <h1 class="text-sm font-bold text-gray-800">WFM Schedule Editor (Vue 3)</h1>
      <div class="flex-1" />
      <!-- 颜色图例 -->
      <div class="flex items-center gap-3">
        <div v-for="item in legendItems" :key="item.type" class="flex items-center gap-1">
          <div class="w-3 h-3 rounded-sm" :style="{ backgroundColor: item.color }" />
          <span class="text-[10px] text-gray-500">{{ item.label }}</span>
        </div>
      </div>
    </div>

    <!-- 主体三栏布局 -->
    <div class="flex-1 flex overflow-hidden">
      <!-- 左栏：坐席列表（垂直滚动同步） -->
      <div ref="leftRef" class="overflow-hidden flex-shrink-0 border-r border-gray-200 bg-white" style="width: 240px">
        <AgentList />
      </div>

      <!-- 中栏：时间刻度 + 时间轴主体 -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- 时间刻度（水平滚动同步） -->
        <div ref="headerRef" class="overflow-hidden flex-shrink-0">
          <TimelineHeader />
        </div>
        <!-- 时间轴主体（唯一可滚动区域） -->
        <TimelineBody ref="timelineBodyRef" @scroll="onBodyScroll" />
      </div>

      <!-- 右栏：工时汇总（垂直滚动同步） -->
      <div ref="rightRef" class="overflow-hidden flex-shrink-0 border-l border-gray-200 bg-white" style="width: 110px">
        <ContractTime />
      </div>
    </div>
  </div>
</template>
