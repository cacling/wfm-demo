<!--
  AgentList.vue — 左侧冻结坐席列表（Phase 2: 从 store.agents 渲染）
-->
<script setup lang="ts">
import { useScheduleStore } from '../stores/schedule'
import { ROW_HEIGHT } from '../utils/time'
import { storeToRefs } from 'pinia'
import { useI18n } from '../i18n'

const { agents } = storeToRefs(useScheduleStore())
const { t } = useI18n()
</script>

<template>
  <div class="overflow-hidden flex-shrink-0 border-r border-gray-200 bg-white" :style="{ width: '240px' }">
    <div class="h-10 border-b border-gray-200 flex items-center px-3 gap-2">
      <input type="checkbox" class="accent-blue-500" />
      <span class="text-xs font-semibold text-gray-600 tracking-wide">{{ t('name') }}</span>
      <span class="text-xs text-gray-400 ml-auto cursor-pointer">↕</span>
    </div>
    <div>
      <div
        v-for="agent in agents"
        :key="agent.id"
        class="flex items-center px-3 gap-2 border-b border-gray-100 hover:bg-blue-50/40 transition-colors"
        :style="{ height: ROW_HEIGHT + 'px' }"
      >
        <input type="checkbox" class="accent-blue-500 flex-shrink-0" />
        <span class="text-sm text-gray-800 truncate flex-1">{{ agent.name }}</span>
        <span
          v-if="agent.groupName"
          class="text-[10px] text-gray-400 truncate max-w-[50px]"
          :title="agent.groupName"
        >
          {{ agent.groupName }}
        </span>
        <span class="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 truncate max-w-[60px]"
          :title="agent.shift"
        >
          {{ agent.shift.split(' ')[0] }}
        </span>
      </div>
    </div>
  </div>
</template>
