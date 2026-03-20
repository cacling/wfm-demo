<!--
  ActivityToolbar.vue — 活动类型工具栏

  NICE 风格：从工具栏拖拽活动图标到时间轴上的 Work 区域，直接创建新活动块。
  使用 HTML5 Drag and Drop API，拖拽时携带 activityType 数据。
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../api'
import { useI18n } from '../i18n'

const { t } = useI18n()

interface ActivityDef {
  id: number
  name: string
  color: string
  icon: string
}

const activities = ref<ActivityDef[]>([])

onMounted(async () => {
  try {
    const all = await api.getActivities()
    // 排除 Work 和 Day Off（不需要手动拖入）
    activities.value = all.filter((a: any) => a.name !== 'Work' && a.name !== 'Day Off')
  } catch (e) {
    console.error('Failed to load activities:', e)
  }
})

function onDragStart(e: DragEvent, activity: ActivityDef) {
  if (!e.dataTransfer) return
  e.dataTransfer.setData('application/wfm-activity', JSON.stringify({
    activityId: activity.id,
    type: activity.name.toLowerCase().replace(' ', '_'),
    name: activity.name,
    color: activity.color,
  }))
  e.dataTransfer.effectAllowed = 'copy'
}
</script>

<template>
  <div class="flex items-center gap-1 px-2">
    <span class="text-[10px] text-gray-400 mr-1">{{ t('drag') }}</span>
    <div
      v-for="act in activities"
      :key="act.id"
      class="flex items-center gap-1 px-2 py-1 rounded cursor-grab active:cursor-grabbing
        hover:ring-2 hover:ring-offset-1 hover:ring-blue-300 transition-all select-none"
      :style="{ backgroundColor: act.color + '30', borderLeft: `3px solid ${act.color}` }"
      draggable="true"
      @dragstart="onDragStart($event, act)"
      :title="`Drag to add ${act.name}`"
    >
      <div class="w-2.5 h-2.5 rounded-sm" :style="{ backgroundColor: act.color }" />
      <span class="text-[10px] font-medium text-gray-700">{{ act.name }}</span>
    </div>
  </div>
</template>
