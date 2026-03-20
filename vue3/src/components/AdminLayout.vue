<!--
  AdminLayout.vue — 管理后台布局（支持中英双语）
-->
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '../i18n'

const { t, lang, toggleLang } = useI18n()

const currentPage = ref('schedule')

const navItems = [
  { id: 'schedule',    key: 'nav_schedule',    icon: '📅' },
  { id: 'activities',  key: 'nav_activities',  icon: '🎨' },
  { id: 'shifts',      key: 'nav_shifts',      icon: '⏰' },
  { id: 'contracts',   key: 'nav_contracts',   icon: '📄' },
  { id: 'skills',      key: 'nav_skills',      icon: '🎯' },
  { id: 'groups',      key: 'nav_groups',      icon: '👥' },
  { id: 'agents',      key: 'nav_agents',      icon: '🧑' },
  { id: 'leave-types', key: 'nav_leave_types', icon: '🏖️' },
  { id: 'leaves',      key: 'nav_leaves',      icon: '📋' },
  { id: 'rules',       key: 'nav_rules',       icon: '⚙️' },
  { id: 'staffing',    key: 'nav_staffing',    icon: '📊' },
]
</script>

<template>
  <div class="h-screen flex">
    <div class="w-52 bg-gray-900 text-white flex flex-col flex-shrink-0">
      <div class="h-12 flex items-center justify-between px-4 border-b border-gray-700">
        <span class="text-sm font-bold">WFM Admin</span>
        <button
          class="text-[10px] px-1.5 py-0.5 rounded border border-gray-600 text-gray-300 hover:bg-gray-700"
          @click="toggleLang"
        >
          {{ lang === 'zh' ? 'EN' : '中' }}
        </button>
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
          <span>{{ t(item.key) }}</span>
        </button>
      </nav>
    </div>
    <div class="flex-1 overflow-hidden">
      <slot :current-page="currentPage" />
    </div>
  </div>
</template>
