<!--
  TimelineBody.vue — 时间轴主体（Phase 2: 直接渲染 store.blocks）
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useScheduleStore } from '../stores/schedule'
import { TIMELINE_WIDTH, ROW_HEIGHT, getHourLabels, xToTime, PX_PER_MINUTE } from '../utils/time'
import { BLOCK_LABELS, type ActivityType, type DisplayBlock } from '../types'
import ScheduleBlock from './ScheduleBlock.vue'
import CurrentTimeLine from './CurrentTimeLine.vue'
import ContextMenu from './ContextMenu.vue'
import CoverageBar from './CoverageBar.vue'
import { useBlockInteraction } from '../composables/useBlockInteraction'

const emit = defineEmits<{ scroll: [] }>()

const store = useScheduleStore()
const { onPointerDown } = useBlockInteraction()

const hourLines = computed(() => {
  void store.currentDate
  return getHourLabels()
})
const bodyRef = ref<HTMLDivElement | null>(null)

defineExpose({ bodyRef })

interface MenuState {
  x: number
  y: number
  mode: 'add' | 'delete'
  agentId?: string
  timeISO?: string
  blockId?: string
  blockLabel?: string
}

const menu = ref<MenuState | null>(null)

/** 按坐席分组的块（含 Work） */
const blocksByAgent = computed(() => {
  const map = new Map<number, DisplayBlock[]>()
  for (const agent of store.agents) {
    const agentBlocks = store.blocks
      .filter((b) => b.agentId === String(agent.id))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    map.set(agent.id, agentBlocks)
  }
  return map
})

function onBlockContextMenu(e: MouseEvent, block: DisplayBlock) {
  if (block.type === 'work') {
    const scrollLeft = bodyRef.value?.scrollLeft ?? 0
    const containerRect = bodyRef.value?.getBoundingClientRect()
    const relativeX = e.clientX - (containerRect?.left ?? 0) + scrollLeft
    const time = xToTime(relativeX)
    menu.value = { x: e.clientX, y: e.clientY, mode: 'add', agentId: block.agentId, timeISO: time.toISOString() }
  } else {
    menu.value = { x: e.clientX, y: e.clientY, mode: 'delete', blockId: block.id, blockLabel: BLOCK_LABELS[block.type] || block.type }
  }
}

function handleAdd(type: ActivityType) {
  if (menu.value?.agentId && menu.value?.timeISO) {
    store.addBlock(menu.value.agentId, type, menu.value.timeISO)
  }
}

function handleDelete() {
  if (menu.value?.blockId) {
    store.deleteBlock(menu.value.blockId)
  }
}

function onKeydown(e: KeyboardEvent) {
  if ((e.key === 'Delete' || e.key === 'Backspace') && store.selectedBlockId) {
    const block = store.blocks.find((b) => b.id === store.selectedBlockId)
    if (block?.editable) store.deleteBlock(store.selectedBlockId)
  }
}

// ========== 从工具栏拖放活动到时间轴 ==========

function onDragOver(e: DragEvent) {
  if (e.dataTransfer?.types.includes('application/wfm-activity')) {
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  }
}

function onDrop(e: DragEvent) {
  const data = e.dataTransfer?.getData('application/wfm-activity')
  if (!data) return
  e.preventDefault()

  const { type } = JSON.parse(data) as { activityId: number; type: string; name: string; color: string }

  // 计算落点时间和坐席
  const scrollLeft = bodyRef.value?.scrollLeft ?? 0
  const containerRect = bodyRef.value?.getBoundingClientRect()
  const relativeX = e.clientX - (containerRect?.left ?? 0) + scrollLeft
  const relativeY = e.clientY - (containerRect?.top ?? 0) + (bodyRef.value?.scrollTop ?? 0)

  const time = xToTime(relativeX)
  const agentIndex = Math.floor(relativeY / ROW_HEIGHT)
  const agent = store.agents[agentIndex]
  if (!agent) return

  store.addBlock(String(agent.id), type as ActivityType, time.toISOString())
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div
    ref="bodyRef"
    class="flex-1 overflow-auto"
    @scroll="emit('scroll')"
    @click="store.selectBlock(null); menu = null"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <div class="relative" :style="{ width: TIMELINE_WIDTH + 'px', minHeight: '100%' }">
      <div
        v-for="{ x } in hourLines"
        :key="x"
        class="absolute top-0 bottom-0 w-px bg-gray-100"
        :style="{ left: x + 'px' }"
      />

      <CurrentTimeLine />

      <div
        v-for="agent in store.agents"
        :key="agent.id"
        class="relative border-b border-gray-100 hover:bg-blue-50/20"
        :style="{ height: ROW_HEIGHT + 'px' }"
      >
        <ScheduleBlock
          v-for="block in blocksByAgent.get(agent.id)"
          :key="block.id"
          :block="block"
          @pointerdown="onPointerDown"
          @contextmenu="onBlockContextMenu"
        />
      </div>

      <!-- 覆盖率条 -->
      <CoverageBar />
    </div>
  </div>

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
