<!--
  CrudTable.vue — 通用 CRUD 表格组件

  Props:
  - title: 页面标题
  - apiPath: REST API 路径（如 /activities）
  - columns: 列定义 { key, label, width? }
  - formFields: 表单字段 { key, label, type, options? }
-->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

const BASE = 'http://localhost:3210/api'

const props = defineProps<{
  title: string
  apiPath: string
  columns: { key: string; label: string; width?: string }[]
  formFields: { key: string; label: string; type: 'text' | 'number' | 'boolean' | 'select' | 'color'; options?: { value: any; label: string }[] }[]
}>()

const rows = ref<any[]>([])
const loading = ref(false)
const showForm = ref(false)
const editingId = ref<number | null>(null)
const formData = ref<Record<string, any>>({})

async function fetchData() {
  loading.value = true
  try {
    const res = await fetch(`${BASE}${props.apiPath}`)
    rows.value = await res.json()
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = null
  formData.value = {}
  // Set defaults for boolean fields
  for (const f of props.formFields) {
    if (f.type === 'boolean') formData.value[f.key] = false
    if (f.type === 'number') formData.value[f.key] = 0
    if (f.type === 'color') formData.value[f.key] = '#4ade80'
  }
  showForm.value = true
}

function openEdit(row: any) {
  editingId.value = row.id
  formData.value = { ...row }
  showForm.value = true
}

async function save() {
  const method = editingId.value ? 'PUT' : 'POST'
  const url = editingId.value
    ? `${BASE}${props.apiPath}/${editingId.value}`
    : `${BASE}${props.apiPath}`
  await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData.value),
  })
  showForm.value = false
  await fetchData()
}

async function remove(id: number) {
  await fetch(`${BASE}${props.apiPath}/${id}`, { method: 'DELETE' })
  await fetchData()
}

function displayValue(row: any, col: { key: string }) {
  const val = row[col.key]
  if (val === true) return '✓'
  if (val === false) return '✗'
  if (val === null || val === undefined) return '-'
  return val
}

onMounted(fetchData)
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <div class="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
      <h2 class="text-sm font-bold text-gray-800">{{ title }}</h2>
      <span class="text-xs text-gray-400">{{ rows.length }} records</span>
      <div class="flex-1" />
      <button
        class="px-3 py-1 text-xs rounded-md bg-blue-500 text-white hover:bg-blue-600"
        @click="openCreate"
      >+ Add</button>
      <button
        class="px-3 py-1 text-xs rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
        @click="fetchData"
      >Refresh</button>
    </div>

    <!-- Table -->
    <div class="flex-1 overflow-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 sticky top-0">
          <tr>
            <th class="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-12">ID</th>
            <th
              v-for="col in columns"
              :key="col.key"
              class="text-left px-3 py-2 text-xs font-semibold text-gray-500"
              :style="col.width ? { width: col.width } : {}"
            >{{ col.label }}</th>
            <th class="text-right px-3 py-2 text-xs font-semibold text-gray-500 w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.id"
            class="border-b border-gray-100 hover:bg-blue-50/30"
          >
            <td class="px-3 py-2 text-gray-400">{{ row.id }}</td>
            <td v-for="col in columns" :key="col.key" class="px-3 py-2 text-gray-700">
              <div
                v-if="col.key === 'color'"
                class="flex items-center gap-2"
              >
                <div class="w-4 h-4 rounded" :style="{ backgroundColor: row[col.key] }" />
                <span>{{ row[col.key] }}</span>
              </div>
              <span v-else>{{ displayValue(row, col) }}</span>
            </td>
            <td class="px-3 py-2 text-right">
              <button class="text-blue-500 hover:underline text-xs mr-2" @click="openEdit(row)">Edit</button>
              <button class="text-red-500 hover:underline text-xs" @click="remove(row.id)">Del</button>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td :colspan="columns.length + 2" class="px-3 py-8 text-center text-gray-400">No data</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Form Dialog -->
    <div v-if="showForm" class="fixed inset-0 bg-black/30 flex items-center justify-center z-50" @click.self="showForm = false">
      <div class="bg-white rounded-lg shadow-xl w-[440px] max-h-[80vh] overflow-auto">
        <div class="px-5 py-4 border-b border-gray-200">
          <h3 class="text-sm font-bold text-gray-800">{{ editingId ? 'Edit' : 'Create' }} {{ title }}</h3>
        </div>
        <div class="px-5 py-4 space-y-3">
          <div v-for="field in formFields" :key="field.key">
            <label class="block text-xs font-medium text-gray-600 mb-1">{{ field.label }}</label>
            <input
              v-if="field.type === 'text'"
              v-model="formData[field.key]"
              class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
            />
            <input
              v-else-if="field.type === 'number'"
              v-model.number="formData[field.key]"
              type="number"
              class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
            />
            <input
              v-else-if="field.type === 'color'"
              v-model="formData[field.key]"
              type="color"
              class="w-16 h-8 border border-gray-300 rounded cursor-pointer"
            />
            <label v-else-if="field.type === 'boolean'" class="flex items-center gap-2">
              <input v-model="formData[field.key]" type="checkbox" class="accent-blue-500" />
              <span class="text-sm text-gray-700">{{ field.label }}</span>
            </label>
            <select
              v-else-if="field.type === 'select'"
              v-model="formData[field.key]"
              class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
            >
              <option v-for="opt in field.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
        </div>
        <div class="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button class="px-4 py-1.5 text-sm rounded-md border border-gray-300 text-gray-600" @click="showForm = false">Cancel</button>
          <button class="px-4 py-1.5 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600" @click="save">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>
