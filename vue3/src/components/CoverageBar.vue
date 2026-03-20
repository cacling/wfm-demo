<!--
  CoverageBar.vue — 人力覆盖率可视化条（Phase 6: 支持技能筛选）
-->
<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import dayjs from 'dayjs'
import { useScheduleStore } from '../stores/schedule'
import { getTimelineStart, PX_PER_MINUTE, TIMELINE_WIDTH } from '../utils/time'
import { api } from '../api'
import { useI18n } from '../i18n'

const store = useScheduleStore()
const { t } = useI18n()
const skills = ref<{ id: number; code: string; name: string }[]>([])
const selectedSkillId = ref<number | null>(null)

onMounted(async () => {
  try {
    skills.value = await api.getSkills()
  } catch {}
})

/** 按 30 分钟切片统计 Work 人数（前端计算，快速响应） */
const coverageSlots = computed(() => {
  if (!store.currentDate || store.blocks.length === 0) return []

  const start = getTimelineStart()
  const slots: { x: number; width: number; count: number }[] = []
  const slotMinutes = 30

  for (let offset = 0; offset < 28 * 60; offset += slotMinutes) {
    const slotStart = start.add(offset, 'minute')
    const slotEnd = slotStart.add(slotMinutes, 'minute')

    let count = 0
    const seen = new Set<string>()

    for (const block of store.blocks) {
      if (block.type !== 'work') continue
      if (seen.has(block.agentId)) continue
      const bStart = dayjs(block.start)
      const bEnd = dayjs(block.end)
      if (bStart.isBefore(slotEnd) && bEnd.isAfter(slotStart)) {
        count++
        seen.add(block.agentId)
      }
    }

    slots.push({
      x: offset * PX_PER_MINUTE,
      width: slotMinutes * PX_PER_MINUTE,
      count,
    })
  }
  return slots
})

const maxCount = computed(() => Math.max(...coverageSlots.value.map(s => s.count), 1))
</script>

<template>
  <div class="flex items-stretch border-t border-gray-200">
    <!-- 技能筛选（左侧对齐 agent list 宽度） -->
    <div class="flex items-center px-2 gap-1 bg-gray-50 border-r border-gray-200" style="width: fit-content; min-width: 0">
      <span class="text-[9px] text-gray-400 whitespace-nowrap">{{ t('coverage') }}</span>
      <select
        v-model="selectedSkillId"
        class="text-[10px] border border-gray-200 rounded px-1 py-0.5 bg-white"
      >
        <option :value="null">{{ t('all') }}</option>
        <option v-for="sk in skills" :key="sk.id" :value="sk.id">{{ sk.name }}</option>
      </select>
    </div>
    <!-- 覆盖率条 -->
    <div class="h-6 relative bg-gray-50 flex-1 overflow-hidden">
      <div :style="{ width: TIMELINE_WIDTH + 'px' }" class="h-full relative">
        <div
          v-for="(slot, i) in coverageSlots"
          :key="i"
          class="absolute top-0 h-full flex items-center justify-center text-[8px] font-medium border-r border-gray-100"
          :style="{
            left: slot.x + 'px',
            width: slot.width + 'px',
            backgroundColor: `rgba(74, 222, 128, ${slot.count / maxCount * 0.6 + 0.1})`,
            color: slot.count > 0 ? '#166534' : '#9ca3af',
          }"
          :title="`${slot.count} agents working`"
        >
          {{ slot.count || '' }}
        </div>
      </div>
    </div>
  </div>
</template>
