<!--
  ValidationDialog.vue — 校验结果弹窗

  显示 3 级校验结果：
  - Error（红色）— 严重错误，必须修复
  - Warning（黄色）— 告警，可确认后继续
  - Info（蓝色）— 提示信息
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '../i18n'

const { t } = useI18n()

interface ValidationItem {
  agentId: number | null
  agentName?: string
  date: string
  level: 'error' | 'warning' | 'info'
  ruleType: string
  message: string
}

const props = defineProps<{
  result: {
    valid: boolean
    errors: ValidationItem[]
    warnings: ValidationItem[]
    infos: ValidationItem[]
  }
}>()

const emit = defineEmits<{
  close: []
  confirm: []  // 强制保存（忽略 warning）
}>()

const total = computed(() =>
  props.result.errors.length + props.result.warnings.length + props.result.infos.length,
)

const levelConfig = {
  error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500', labelKey: 'error_label' },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', dot: 'bg-yellow-500', labelKey: 'warning_label' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500', labelKey: 'info_label' },
}

const allItems = computed(() => [
  ...props.result.errors.map((i: any) => ({ ...i, config: levelConfig.error })),
  ...props.result.warnings.map((i: any) => ({ ...i, config: levelConfig.warning })),
  ...props.result.infos.map((i: any) => ({ ...i, config: levelConfig.info })),
])
</script>

<template>
  <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50" @click.self="emit('close')">
    <div class="bg-white rounded-lg shadow-xl w-[520px] max-h-[80vh] flex flex-col">
      <!-- Header -->
      <div class="px-5 py-4 border-b border-gray-200 flex items-center gap-3">
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
          :class="result.valid ? 'bg-green-500' : 'bg-red-500'"
        >
          {{ result.valid ? '✓' : '!' }}
        </div>
        <div>
          <h2 class="text-sm font-bold text-gray-800">
            {{ result.valid ? t('validation_passed') : t('validation_issues') }}
          </h2>
          <p class="text-xs text-gray-500">
            {{ result.errors.length }} {{ t('errors') }}, {{ result.warnings.length }} {{ t('warnings') }}, {{ result.infos.length }} {{ t('infos') }}
          </p>
        </div>
      </div>

      <!-- Items -->
      <div class="flex-1 overflow-auto px-5 py-3 space-y-2">
        <div
          v-for="(item, idx) in allItems"
          :key="idx"
          class="rounded-md border px-3 py-2 text-xs"
          :class="[item.config.bg, item.config.border]"
        >
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full flex-shrink-0" :class="item.config.dot" />
            <span class="font-semibold" :class="item.config.text">{{ t(item.config.labelKey) }}</span>
            <span v-if="item.agentName" class="text-gray-500">{{ item.agentName }}</span>
            <span class="text-gray-400 ml-auto">{{ item.ruleType }}</span>
          </div>
          <p class="mt-1 text-gray-700">{{ item.message }}</p>
        </div>

        <div v-if="total === 0" class="text-center text-gray-400 py-6 text-sm">
          {{ t('all_checks_passed') }}
        </div>
      </div>

      <!-- Footer -->
      <div class="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
        <button
          class="px-4 py-1.5 text-sm rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
          @click="emit('close')"
        >
          {{ t('close') }}
        </button>
        <button
          v-if="result.warnings.length > 0 && result.errors.length === 0"
          class="px-4 py-1.5 text-sm rounded-md bg-yellow-500 text-white hover:bg-yellow-600"
          @click="emit('confirm')"
        >
          {{ t('accept_warnings') }}
        </button>
      </div>
    </div>
  </div>
</template>
