<!--
  AgentList.vue — 左侧冻结坐席列表

  显示内容（每行）：
  - 勾选框（预留批量操作）
  - 坐席姓名
  - 图标标识（如耳机、电话）
  - 班次标签（AM=绿色，MD=蓝色）

  行高与 TimelineBody 保持一致（ROW_HEIGHT），确保纵向滚动对齐。
  overflow:hidden，由 ScheduleEditor 通过同步 scrollTop 实现纵向滚动。
-->
<script setup lang="ts">
import { useScheduleStore } from '../stores/schedule'
import { ROW_HEIGHT } from '../utils/time'
import { storeToRefs } from 'pinia'

// storeToRefs 保持响应式（直接解构 store 会丢失响应性）
const { agents } = storeToRefs(useScheduleStore())
</script>

<template>
  <div class="overflow-hidden flex-shrink-0 border-r border-gray-200 bg-white" :style="{ width: '240px' }">
    <!-- 表头 -->
    <div class="h-10 border-b border-gray-200 flex items-center px-3 gap-2">
      <input type="checkbox" class="accent-blue-500" />
      <span class="text-xs font-semibold text-gray-600 tracking-wide">Name</span>
      <span class="text-xs text-gray-400 ml-auto cursor-pointer">↕</span>
    </div>
    <!-- 坐席行 -->
    <div>
      <div
        v-for="agent in agents"
        :key="agent.id"
        class="flex items-center px-3 gap-2 border-b border-gray-100 hover:bg-blue-50/40 transition-colors"
        :style="{ height: ROW_HEIGHT + 'px' }"
      >
        <input type="checkbox" class="accent-blue-500 flex-shrink-0" />
        <span class="text-sm text-gray-800 truncate flex-1">{{ agent.name }}</span>
        <!-- 图标标识 -->
        <template v-if="agent.icons?.length">
          <span class="text-xs text-gray-400">
            <span v-for="(_, i) in agent.icons" :key="i" class="mr-0.5">●</span>
          </span>
        </template>
        <!-- 班次标签 -->
        <span
          class="text-xs font-bold px-1.5 py-0.5 rounded"
          :class="agent.shift === 'AM' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'"
        >
          {{ agent.shift }}
        </span>
      </div>
    </div>
  </div>
</template>
