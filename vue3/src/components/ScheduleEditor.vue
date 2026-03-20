<!--
  ScheduleEditor.vue — 排班编辑器主容器（Phase 6: 完整功能）
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
const publishStatus = ref<string>('')

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

async function runPublishValidate() {
  if (!store.currentPlanId) return
  try {
    const result = await api.publishValidate(store.currentPlanId)
    validationResult.value = result
  } catch (e) {
    console.error('Publish validate failed:', e)
  }
}

async function doPublish() {
  if (!store.currentPlanId) return
  try {
    await api.publish(store.currentPlanId)
    publishStatus.value = 'Published!'
    setTimeout(() => { publishStatus.value = '' }, 3000)
    // 刷新
    await store.loadTimeline(store.currentPlanId, store.currentDate)
  } catch (e: any) {
    publishStatus.value = `Error: ${e.message}`
  }
}

async function doRollback() {
  if (!store.currentPlanId) return
  try {
    const history = await api.getHistory(store.currentPlanId)
    if (history.versions.length === 0) { publishStatus.value = 'No versions to rollback'; return }
    const latest = history.versions[history.versions.length - 1]
    await api.rollback(store.currentPlanId, latest.versionNo)
    publishStatus.value = `Rolled back to v${latest.versionNo}`
    setTimeout(() => { publishStatus.value = '' }, 3000)
    await store.loadTimeline(store.currentPlanId, store.currentDate)
  } catch (e: any) {
    publishStatus.value = `Error: ${e.message}`
  }
}

const legendItems = Object.entries(BLOCK_COLORS).map(([type, color]) => ({
  type, color,
  label: BLOCK_LABELS[type as keyof typeof BLOCK_LABELS],
}))

onMounted(async () => {
  try {
    let plans = await api.getPlans()
    if (plans.length === 0) {
      const plan = await api.createPlan({ name: 'Demo Plan', startDate: '2026-03-20', endDate: '2026-03-22' })
      await api.generatePlan(plan.id)
      plans = [plan]
    }
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
      <!-- 第一行 -->
      <div class="h-10 flex items-center px-4 gap-2">
        <h1 class="text-sm font-bold text-gray-800">WFM Schedule Editor</h1>
        <DateNav />
        <span v-if="store.versionNo" class="text-[10px] text-gray-400">v{{ store.versionNo }}</span>
        <div class="flex-1" />
        <!-- 操作按钮组 -->
        <button class="px-2.5 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600" @click="runValidation">Validate</button>
        <button class="px-2.5 py-1 text-xs rounded bg-indigo-500 text-white hover:bg-indigo-600" @click="runPublishValidate">Pre-publish Check</button>
        <button class="px-2.5 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700" @click="doPublish">Publish</button>
        <button class="px-2.5 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-50" @click="doRollback">Rollback</button>
        <span v-if="publishStatus" class="text-xs text-green-600 font-medium">{{ publishStatus }}</span>
        <div v-if="store.loading" class="text-xs text-blue-500">Loading...</div>
        <!-- 图例 -->
        <div class="flex items-center gap-2 ml-2">
          <div v-for="item in legendItems" :key="item.type" class="flex items-center gap-1">
            <div class="w-2.5 h-2.5 rounded-sm" :style="{ backgroundColor: item.color }" />
            <span class="text-[9px] text-gray-400">{{ item.label }}</span>
          </div>
        </div>
      </div>
      <!-- 第二行：活动工具栏 -->
      <div class="h-8 border-t border-gray-100 flex items-center">
        <ActivityToolbar />
      </div>
    </div>

    <!-- 主体三栏 -->
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

  <ValidationDialog
    v-if="validationResult"
    :result="validationResult"
    @close="validationResult = null"
    @confirm="validationResult = null"
  />
</template>
