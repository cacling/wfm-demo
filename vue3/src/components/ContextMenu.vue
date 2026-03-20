<!--
  ContextMenu.vue — 右键菜单组件

  两种模式：
  - mode='add'    → 显示活动类型列表（Break/Meeting/Training/Offline/Other）
  - mode='delete' → 显示删除按钮

  关闭方式：
  - 点击菜单外部区域
  - 按 Escape 键
  - 选择菜单项后自动关闭

  通过 Teleport 挂载到 body 上，避免被父容器的 overflow:hidden 裁切。
-->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { BLOCK_COLORS, BLOCK_LABELS, type ActivityType } from '../types'
import { useI18n } from '../i18n'

const { t } = useI18n()

/** 可添加的活动类型列表 */
const ACTIVITY_TYPES: ActivityType[] = ['break', 'meeting', 'training', 'offline', 'other']

const props = defineProps<{
  x: number            // 菜单屏幕 X 坐标
  y: number            // 菜单屏幕 Y 坐标
  mode: 'add' | 'delete'
  blockLabel?: string  // 删除模式下显示的活动类型名称
}>()

const emit = defineEmits<{
  add: [type: ActivityType]  // 选择新增某种活动
  delete: []                 // 确认删除
  close: []                  // 关闭菜单
}>()

const menuRef = ref<HTMLDivElement | null>(null)

/** 点击菜单外部 → 关闭 */
function onClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    emit('close')
  }
}

/** Escape 键 → 关闭 */
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

// 组件挂载时注册全局事件，卸载时清理
onMounted(() => {
  document.addEventListener('mousedown', onClickOutside)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onClickOutside)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    ref="menuRef"
    class="bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px] text-sm fixed z-50"
    :style="{ left: x + 'px', top: y + 'px' }"
  >
    <!-- 新增活动模式：列出所有可选活动类型 -->
    <template v-if="mode === 'add'">
      <div class="px-3 py-1.5 text-[10px] text-gray-400 font-semibold tracking-wide uppercase">
        {{ t('add_activity') }}
      </div>
      <button
        v-for="type in ACTIVITY_TYPES"
        :key="type"
        class="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-blue-50 transition-colors text-left"
        @click="emit('add', type); emit('close')"
      >
        <!-- 颜色标识圆点 -->
        <div class="w-3 h-3 rounded-sm flex-shrink-0" :style="{ backgroundColor: BLOCK_COLORS[type] }" />
        <span class="text-gray-700">{{ BLOCK_LABELS[type] }}</span>
      </button>
    </template>

    <!-- 删除模式：显示删除按钮 -->
    <template v-if="mode === 'delete'">
      <button
        class="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-red-50 transition-colors text-left text-red-600"
        @click="emit('delete'); emit('close')"
      >
        <span>✕</span>
        <span>{{ t('delete') }} {{ blockLabel }}</span>
      </button>
    </template>
  </div>
</template>
