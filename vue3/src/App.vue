<script setup lang="ts">
import { ref } from 'vue'
import AdminLayout from './components/AdminLayout.vue'
import ScheduleEditor from './components/ScheduleEditor.vue'
import CrudTable from './components/admin/CrudTable.vue'
import { pageConfigs } from './components/admin/pages'

const layoutRef = ref<InstanceType<typeof AdminLayout> | null>(null)
</script>

<template>
  <AdminLayout ref="layoutRef" v-slot="{ currentPage }">
    <!-- Schedule Editor (main page) -->
    <ScheduleEditor v-if="currentPage === 'schedule'" />

    <!-- CRUD pages -->
    <CrudTable
      v-else-if="pageConfigs[currentPage]"
      :key="currentPage"
      :title="pageConfigs[currentPage].title"
      :api-path="pageConfigs[currentPage].apiPath"
      :columns="pageConfigs[currentPage].columns"
      :form-fields="pageConfigs[currentPage].formFields"
    />

    <!-- Fallback -->
    <div v-else class="flex items-center justify-center h-full text-gray-400">
      Page "{{ currentPage }}" not configured
    </div>
  </AdminLayout>
</template>
