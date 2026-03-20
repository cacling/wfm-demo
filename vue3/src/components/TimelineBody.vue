<!--
  TimelineBody.vue — 时间轴主体区域

  职责：
  1. 渲染所有坐席的排班行（每行包含多个 ScheduleBlock）
  2. 渲染垂直网格线和当前时间线
  3. 管理右键菜单（新增/删除活动）
  4. 监听键盘事件（Delete/Backspace 删除选中活动）
  5. 通过 defineExpose 暴露 bodyRef 给父组件做滚动同步

  数据流：
  store.activities 变化 → computed allBlocks 重新计算
  → 每行的 DisplayBlock[] 包含自动填充的 Work 块
  → ScheduleBlock 组件渲染每个块
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useScheduleStore } from '../stores/schedule'
import { TIMELINE_WIDTH, ROW_HEIGHT, getHourLabels, xToTime } from '../utils/time'
import { BLOCK_LABELS, type ActivityType, type DisplayBlock } from '../types'
import ScheduleBlock from './ScheduleBlock.vue'
import CurrentTimeLine from './CurrentTimeLine.vue'
import ContextMenu from './ContextMenu.vue'
import { useBlockInteraction } from '../composables/useBlockInteraction'

const emit = defineEmits<{ scroll: [] }>()

const store = useScheduleStore()
const { onPointerDown } = useBlockInteraction()  // 拖拽/拉伸交互

const hourLines = getHourLabels()  // 时间刻度网格线位置（静态，只算一次）
const bodyRef = ref<HTMLDivElement | null>(null)  // 滚动容器的 DOM ref

// 暴露 bodyRef 给父组件（ScheduleEditor）用于滚动同步
defineExpose({ bodyRef })

// ========== 右键菜单状态 ==========

interface MenuState {
  x: number          // 菜单屏幕 X 坐标
  y: number          // 菜单屏幕 Y 坐标
  mode: 'add' | 'delete'  // 菜单类型
  agentId?: string   // 新增时：目标坐席 ID
  timeISO?: string   // 新增时：点击位置对应的时间
  blockId?: string   // 删除时：目标活动 ID
  blockLabel?: string // 删除时：显示的活动类型名称
}

const menu = ref<MenuState | null>(null)

// ========== 派生展示块 ==========

/**
 * computed: 当 store.activities 变化时自动重新计算所有坐席的展示块
 * 包括自动填充的 Work 块 — 这是整个 WFM 编辑器的核心机制
 */
const allBlocks = computed(() => {
  const map = new Map<string, DisplayBlock[]>()
  for (const agent of store.agents) {
    map.set(agent.id, store.getDisplayBlocks(agent.id))
  }
  return map
})

// ========== 右键菜单处理 ==========

/**
 * 右键点击排班块时：
 * - 点击 Work 块 → 显示"新增活动"菜单（计算点击位置对应的时间）
 * - 点击活动块   → 显示"删除"菜单
 */
function onBlockContextMenu(e: MouseEvent, block: DisplayBlock) {
  if (block.type === 'work') {
    // 计算点击位置在时间轴上对应的时间
    const scrollLeft = bodyRef.value?.scrollLeft ?? 0
    const containerRect = bodyRef.value?.getBoundingClientRect()
    const relativeX = e.clientX - (containerRect?.left ?? 0) + scrollLeft  // 加上滚动偏移
    const time = xToTime(relativeX)
    menu.value = { x: e.clientX, y: e.clientY, mode: 'add', agentId: block.agentId, timeISO: time.toISOString() }
  } else {
    menu.value = { x: e.clientX, y: e.clientY, mode: 'delete', blockId: block.id, blockLabel: BLOCK_LABELS[block.type] }
  }
}

/** 右键菜单选择活动类型后 → 在对应位置新增 30 分钟活动 */
function handleAdd(type: ActivityType) {
  if (menu.value?.agentId && menu.value?.timeISO) {
    store.addActivity(menu.value.agentId, type, menu.value.timeISO)
  }
}

/** 右键菜单点击删除 → 移除活动，该时间段自动变回 Work */
function handleDelete() {
  if (menu.value?.blockId) {
    store.deleteActivity(menu.value.blockId)
  }
}

// ========== 键盘快捷键 ==========

/** Delete / Backspace 键删除当前选中的活动 */
function onKeydown(e: KeyboardEvent) {
  if ((e.key === 'Delete' || e.key === 'Backspace') && store.selectedBlockId) {
    const isActivity = store.activities.some((a) => a.id === store.selectedBlockId)
    if (isActivity) store.deleteActivity(store.selectedBlockId)
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <!-- 可滚动的时间轴容器 -->
  <div
    ref="bodyRef"
    class="flex-1 overflow-auto"
    @scroll="emit('scroll')"
    @click="store.selectBlock(null); menu = null"
  >
    <!-- 时间轴内容区（宽度 = 总小时数 × 每小时像素数） -->
    <div class="relative" :style="{ width: TIMELINE_WIDTH + 'px', minHeight: '100%' }">
      <!-- 垂直网格线（每 2 小时一条） -->
      <div
        v-for="{ x } in hourLines"
        :key="x"
        class="absolute top-0 bottom-0 w-px bg-gray-100"
        :style="{ left: x + 'px' }"
      />

      <!-- 当前时间参考线（红色虚线） -->
      <CurrentTimeLine />

      <!-- 坐席行：每行渲染该坐席的所有展示块 -->
      <div
        v-for="agent in store.agents"
        :key="agent.id"
        class="relative border-b border-gray-100 hover:bg-blue-50/20"
        :style="{ height: ROW_HEIGHT + 'px' }"
      >
        <ScheduleBlock
          v-for="block in allBlocks.get(agent.id)"
          :key="block.id"
          :block="block"
          @pointerdown="onPointerDown"
          @contextmenu="onBlockContextMenu"
        />
      </div>
    </div>
  </div>

  <!-- 右键菜单（Teleport 到 body 避免被 overflow:hidden 裁切） -->
  <Teleport to="body">
    <ContextMenu
      v-if="menu"
      :x="menu.x"
      :y="menu.y"
      :mode="menu.mode"
      :block-label="menu.blockLabel"
      @add="handleAdd"
      @delete="handleDelete"
      @close="menu = null"
    />
  </Teleport>
</template>
