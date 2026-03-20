<!--
  AdminLayout.vue — 管理后台布局（左侧导航 + 右侧内容）
-->
<script setup lang="ts">
import { ref } from 'vue'

const currentPage = ref('schedule')

const navItems = [
  { id: 'schedule',   label: 'Schedule Editor', icon: '📅' },
  { id: 'activities', label: 'Activities',       icon: '🎨' },
  { id: 'shifts',     label: 'Shifts & Patterns', icon: '⏰' },
  { id: 'contracts',  label: 'Contracts',        icon: '📄' },
  { id: 'skills',     label: 'Skills',           icon: '🎯' },
  { id: 'groups',     label: 'Groups',           icon: '👥' },
  { id: 'agents',     label: 'Agents',           icon: '🧑' },
  { id: 'leave-types',label: 'Leave Types',      icon: '🏖️' },
  { id: 'leaves',     label: 'Leave Requests',   icon: '📋' },
  { id: 'rules',      label: 'Rule Engine',      icon: '⚙️' },
  { id: 'staffing',   label: 'Staffing Reqs',    icon: '📊' },
]

defineExpose({ currentPage })
</script>

<template>
  <div class="h-screen flex">
    <!-- Sidebar -->
    <div class="w-52 bg-gray-900 text-white flex flex-col flex-shrink-0">
      <div class="h-12 flex items-center px-4 border-b border-gray-700">
        <span class="text-sm font-bold">WFM Admin</span>
      </div>
      <nav class="flex-1 py-2 overflow-auto">
        <button
          v-for="item in navItems"
          :key="item.id"
          class="w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors"
          :class="currentPage === item.id ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'"
          @click="currentPage = item.id"
        >
          <span>{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </button>
      </nav>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-hidden">
      <slot :current-page="currentPage" />
    </div>
  </div>
</template>
