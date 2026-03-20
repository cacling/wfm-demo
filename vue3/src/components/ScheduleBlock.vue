<!--
  ScheduleBlock.vue — 单个排班块的渲染和交互

  两种状态：
  - 活动块（editable=true）：可拖拽移动、左右拉伸、右键菜单删除、hover 显示 × 按钮
  - Work 块（editable=false）：仅显示，不可编辑，右键可新增活动

  定位方式：绝对定位在父行内
  - left = timeToX(开始时间)  → 起始像素位置
  - width = 时长(分钟) × PX_PER_MINUTE → 块宽度

  事件：
  - @pointerdown → 向上 emit，由 useBlockInteraction 处理拖拽/拉伸
  - @contextmenu → 向上 emit，由 TimelineBody 处理右键菜单
  - @click.stop  → 阻止冒泡，防止触发父容器的取消选中
-->
<script setup lang="ts">
import dayjs from 'dayjs'
import { computed } from 'vue'
import { BLOCK_COLORS, BLOCK_LABELS, type DisplayBlock } from '../types'
import { timeToX, PX_PER_MINUTE } from '../utils/time'
import { useScheduleStore } from '../stores/schedule'

const props = defineProps<{
  block: DisplayBlock  // 要渲染的展示块数据
}>()

const emit = defineEmits<{
  /** 按下块时触发（由 useBlockInteraction 处理） */
  pointerdown: [e: PointerEvent, blockId: string, mode: 'drag' | 'resize-left' | 'resize-right']
  /** 右键点击时触发（由 TimelineBody 处理） */
  contextmenu: [e: MouseEvent, block: DisplayBlock]
}>()

const store = useScheduleStore()

// ========== 计算属性：将时间数据转换为渲染参数 ==========
const start = computed(() => dayjs(props.block.start))
const end = computed(() => dayjs(props.block.end))
const x = computed(() => timeToX(start.value))                              // 块的左边位置（像素）
const width = computed(() => end.value.diff(start.value, 'minute') * PX_PER_MINUTE) // 块的宽度（像素）
const color = computed(() => BLOCK_COLORS[props.block.type])                // 背景颜色
const isSelected = computed(() => store.selectedBlockId === props.block.id) // 是否被选中

/** 阻止浏览器默认右键菜单，改用自定义菜单 */
function onContextMenu(e: MouseEvent) {
  e.preventDefault()
  emit('contextmenu', e, props.block)
}
</script>

<template>
  <!-- 外层容器：绝对定位 + group（用于 hover 时显示子元素） -->
  <div
    class="absolute top-1 group"
    :style="{ left: x + 'px', width: Math.max(width, 4) + 'px', height: 'calc(100% - 8px)' }"
  >
    <!-- 块主体：背景色 + 圆角 + 交互样式 -->
    <div
      class="h-full rounded-[3px] relative overflow-hidden select-none"
      :class="[
        block.editable ? 'cursor-grab active:cursor-grabbing hover:brightness-110' : 'cursor-default',
        isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : '',
      ]"
      :style="{ backgroundColor: color }"
      :title="`${BLOCK_LABELS[block.type]}\n${start.format('HH:mm')} - ${end.format('HH:mm')}`"
      @click.stop
      @pointerdown="block.editable && emit('pointerdown', $event, block.id, 'drag')"
      @contextmenu="onContextMenu"
    >
      <!-- 块内文字标签（仅当宽度 > 60px 时显示，避免拥挤） -->
      <span
        v-if="width > 60"
        class="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white/90 drop-shadow-sm pointer-events-none"
      >
        {{ BLOCK_LABELS[block.type] }}
      </span>

      <!-- hover 时右上角的 × 删除按钮（仅活动块显示） -->
      <button
        v-if="block.editable"
        class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] leading-none
          flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-red-600"
        @click.stop="store.deleteActivity(block.id)"
      >
        ✕
      </button>
    </div>

    <!-- 左侧拉伸手柄（hover 时显示，拖拽可调整开始时间） -->
    <div
      v-if="block.editable"
      class="absolute left-0 top-0 w-2 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 z-10"
      @pointerdown="emit('pointerdown', $event, block.id, 'resize-left')"
    >
      <div class="w-0.5 h-full bg-white/60 ml-0.5 rounded" />
    </div>

    <!-- 右侧拉伸手柄（hover 时显示，拖拽可调整结束时间） -->
    <div
      v-if="block.editable"
      class="absolute right-0 top-0 w-2 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 z-10"
      @pointerdown="emit('pointerdown', $event, block.id, 'resize-right')"
    >
      <div class="w-0.5 h-full bg-white/60 ml-auto mr-0.5 rounded" />
    </div>
  </div>
</template>
