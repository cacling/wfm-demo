<!--
  ScheduleEditor.vue — 排班编辑器主容器（Phase 2: 从 API 加载数据）
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AgentList from './AgentList.vue'
import TimelineHeader from './TimelineHeader.vue'
import TimelineBody from './TimelineBody.vue'
import ContractTime from './ContractTime.vue'
import { BLOCK_COLORS, BLOCK_LABELS } from '../types'
import { useScheduleStore } from '../stores/schedule'
import { api } from '../api'
import ValidationDialog from './ValidationDialog.vue'
import ActivityToolbar from './ActivityToolbar.vue'
import DateNav from './DateNav.vue'

const store = useScheduleStore()
const validationResult = ref<any>(null)

const headerRef = ref<HTMLDivElement | null>(null)
const leftRef = ref<HTMLDivElement | null>(null)
const rightRef = ref<HTMLDivElement | null>(null)
const timelineBodyRef = ref<InstanceType<typeof TimelineBody> | null>(null)

function onBodyScroll() {
  const body = timelineBodyRef.value?.bodyRef
  if (!body) return
  if (headerRef.value) headerRef.value.scrollLeft = body.scrollLeft
  if (leftRef.value) leftRef.value.scrollTop = body.scrollTop
  if (rightRef.value) rightRef.value.scrollTop = body.scrollTop
}

async function runValidation() {
  if (!store.currentPlanId || !store.currentDate) return
  try {
    const result = await api.validatePlan(store.currentPlanId, store.currentDate)
    validationResult.value = result
  } catch (e) {
    console.error('Validation failed:', e)
  }
}

const legendItems = Object.entries(BLOCK_COLORS).map(([type, color]) => ({
  type,
  color,
  label: BLOCK_LABELS[type as keyof typeof BLOCK_LABELS],
}))

// 初始化：确保有排班方案，然后加载时间轴
onMounted(async () => {
  try {
    let plans = await api.getPlans()

    if (plans.length === 0) {
      // 自动创建一个 3 天的方案并生成排班
      const plan = await api.createPlan({
        name: 'Demo Plan',
        startDate: '2026-03-20',
        endDate: '2026-03-22',
      })
      await api.generatePlan(plan.id)
      plans = [plan]
    }

    // 加载第一个方案的第一天
    const plan = plans[0]
    await store.loadTimeline(plan.id, plan.startDate)
  } catch (e) {
    console.error('Failed to load timeline:', e)
  }
})
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <!-- 顶部工具栏 -->
    <div class="bg-white border-b border-gray-200 flex-shrink-0">
      <!-- 第一行：标题 + 日期导航 + 操作按钮 + 图例 -->
      <div class="h-10 flex items-center px-4 gap-3">
        <h1 class="text-sm font-bold text-gray-800">WFM Schedule Editor</h1>
        <DateNav />
        <div class="flex-1" />
        <button
          class="px-3 py-1 text-xs rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          @click="runValidation"
        >
          Validate
        </button>
        <div v-if="store.loading" class="text-xs text-blue-500">Loading...</div>
        <div class="flex items-center gap-2">
          <div v-for="item in legendItems" :key="item.type" class="flex items-center gap-1">
            <div class="w-2.5 h-2.5 rounded-sm" :style="{ backgroundColor: item.color }" />
            <span class="text-[9px] text-gray-400">{{ item.label }}</span>
          </div>
        </div>
      </div>
      <!-- 第二行：活动工具栏（拖拽源） -->
      <div class="h-8 border-t border-gray-100 flex items-center">
        <ActivityToolbar />
      </div>
    </div>

    <!-- 主体三栏布局 -->
    <div class="flex-1 flex overflow-hidden">
      <div ref="leftRef" class="overflow-hidden flex-shrink-0 border-r border-gray-200 bg-white" style="width: 240px">
        <AgentList />
      </div>

      <div class="flex-1 flex flex-col overflow-hidden">
        <div ref="headerRef" class="overflow-hidden flex-shrink-0">
          <TimelineHeader />
        </div>
        <TimelineBody ref="timelineBodyRef" @scroll="onBodyScroll" />
      </div>

      <div ref="rightRef" class="overflow-hidden flex-shrink-0 border-l border-gray-200 bg-white" style="width: 110px">
        <ContractTime />
      </div>
    </div>
  </div>

  <!-- 校验结果弹窗 -->
  <ValidationDialog
    v-if="validationResult"
    :result="validationResult"
    @close="validationResult = null"
    @confirm="validationResult = null"
  />
</template>
