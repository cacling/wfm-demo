# WFM Schedule Editor — Demo

## 项目简介

WFM（Workforce Management）排班时间轴编辑器 Demo。提供 React 和 Vue 3 两套完全等价的实现，核心交互为"冻结人员列表 + 横向时间轴 + 活动块拖拽编辑 + Work 自动填充"。

## 项目结构

```
wfm-demo/
├── react/          ← React 18 实现（端口 3200）
├── vue3/           ← Vue 3 实现（端口 3201）
├── CLAUDE.md       ← 本文件
└── package.sh      ← 打包脚本
```

两套实现功能完全一致，共享相同的数据模型和业务逻辑，仅 UI 框架层不同。

## 技术栈对比

| 职责 | React 版（`react/`） | Vue 3 版（`vue3/`） |
|------|---------------------|---------------------|
| 框架 | React 18 + TypeScript | Vue 3 + TypeScript |
| 构建 | Vite + @vitejs/plugin-react | Vite + @vitejs/plugin-vue |
| 样式 | Tailwind CSS v4 | Tailwind CSS v4 |
| 状态管理 | Zustand | Pinia |
| 时间处理 | dayjs | dayjs |
| 测试 | Puppeteer-core + Chrome 146 | Puppeteer-core + Chrome 146 |

### 代码映射关系

| 职责 | React 版 | Vue 3 版 | 变化说明 |
|------|---------|---------|---------|
| 类型定义 | `types.ts` | `types.ts` | 直接复用 |
| 时间工具 | `utils/time.ts` | `utils/time.ts` | 直接复用 |
| 派生规则 | `utils/rules.ts` | `utils/rules.ts` | 直接复用 |
| Mock 数据 | `mock-data.ts` | `mock-data.ts` | 直接复用 |
| 状态管理 | `store.ts`（Zustand `create`） | `stores/schedule.ts`（Pinia `defineStore`） | API 不同，逻辑一致 |
| 拖拽交互 | `hooks/useBlockInteraction.ts` | `composables/useBlockInteraction.ts` | `useCallback` → 普通函数 |
| 滚动同步 | `hooks/useScrollSync.ts` | `composables/useScrollSync.ts` | `useRef` → `ref()` |
| 组件 | `components/*.tsx`（JSX） | `components/*.vue`（SFC template） | 模板语法转换 |

**复用率约 40%**（4 个纯逻辑文件直接复用），其余 60% 为框架层面的机械转换。

### 关键实现差异

| 模式 | React | Vue 3 |
|------|-------|-------|
| 响应式 | `useState` + `useMemo` | `ref()` + `computed()` |
| 派生计算 | 手动写 deps 数组 | 自动依赖追踪 |
| Store 读写 | `useScheduleStore.getState()`（避免闭包过期） | 直接访问 store 实例（Pinia 是响应式的） |
| 组件暴露 ref | `forwardRef` + `useImperativeHandle` | `defineExpose` |
| 模板渲染 | JSX 内联逻辑 | `v-for` / `v-if` 指令 |
| 右键菜单挂载 | 条件渲染在组件树内 | `<Teleport to="body">` |

## 依赖与许可证

### React 版运行时依赖

| 包 | 版本 | 协议 |
|---|------|------|
| react / react-dom | ^19.2.4 | MIT |
| dayjs | ^1.11.20 | MIT |
| zustand | ^5.0.12 | MIT |

### Vue 3 版运行时依赖

| 包 | 版本 | 协议 |
|---|------|------|
| vue | ^3.x | MIT |
| dayjs | ^1.11.20 | MIT |
| pinia | ^3.x | MIT |

### 共用开发依赖

| 包 | 协议 | 说明 |
|---|------|------|
| tailwindcss / @tailwindcss/vite | MIT | 原子化 CSS |
| vite | MIT | 构建工具 |
| @vitejs/plugin-react / plugin-vue | MIT | Vite 框架插件 |
| typescript | Apache-2.0 | 类型系统 |
| eslint + plugins | MIT | 代码检查 |
| puppeteer-core | Apache-2.0 | Chrome 自动化测试 |

### 商用合规性

所有依赖均为 **MIT** 或 **Apache-2.0** 协议，商用无风险。无 GPL/AGPL/SSPL 等 copyleft 传染性协议。合规事项：生产构建时保留第三方许可声明即可。

## 关键命令

```bash
# React 版
cd react && npx vite --port 3200      # http://localhost:3200
cd react && node test-drag.mjs         # 拖拽测试
cd react && node test-context-menu.mjs # 增删测试

# Vue 3 版
cd vue3 && npx vite                    # http://localhost:3201（vite.config.ts 已配置端口）

# 打包
./package.sh                           # 打包全部源码为 zip
```

## 核心架构

### 数据模型：知行分离

系统只持久化两类数据，Work 块由算法实时派生：

```
Agent（坐席）
├── id, name, shift (AM/MD)
├── shiftStart, shiftEnd        ← 班次时间边界
│
Activity（活动块）              ← 只存非 Work 活动
├── id, agentId, type           ← break | meeting | training | offline | other
├── start, end                  ← ISO datetime
│
DisplayBlock（展示块）          ← 运行时派生，不存储
├── = Activity 原样输出（editable: true）
└── + Work 块自动填充间隙（editable: false）
```

**核心逻辑**：`deriveDisplayBlocks(agent, activities)` 按时间排序活动块，用 Work 填充班次内所有间隙。移动/删除/新增活动块时，Work 块自动重新计算，保证时间轴无缝连续。

### 三层分离（两套实现共用）

```
渲染层（components/）
  ├── ScheduleEditor    → 三栏布局容器
  ├── AgentList         → 左侧冻结人员列表
  ├── TimelineHeader    → 顶部时间刻度
  ├── TimelineBody      → 中间时间轴主体（行 + 块 + 右键菜单）
  ├── ScheduleBlock     → 单个块渲染（颜色、标签、选中态、× 按钮）
  ├── ContractTime      → 右侧工时汇总
  ├── CurrentTimeLine   → 当前时间红色参考线
  └── ContextMenu       → 右键菜单（新增/删除）

交互层（hooks/ 或 composables/）
  ├── useBlockInteraction → 拖拽移动 + 左右拉伸（document 级 pointer 事件）
  └── useScrollSync       → 三区域滚动同步

规则层（utils/ + store）
  ├── time.ts           → 时间↔像素映射、吸附、刻度生成
  ├── rules.ts          → deriveDisplayBlocks、工时计算
  └── store             → 状态管理（moveActivity、resizeActivity、addActivity、deleteActivity）
```

## 交互功能

| 操作 | 方式 | 约束 |
|------|------|------|
| 拖拽移动 | 按住活动块拖拽 | 15 分钟吸附；不超出班次边界；不与其他活动重叠 |
| 拉伸调整 | hover 块两端出现手柄，拖拽调整 | 最小 15 分钟；同上约束 |
| 右键新增 | 右键 Work 区域 → 选择活动类型 | 在点击时间点插入 30 分钟默认块 |
| 右键删除 | 右键活动块 → Delete | 删除后自动变回 Work |
| 键盘删除 | 点击选中 → Delete / Backspace | 同上 |
| Hover × 删除 | 悬停活动块右上角 × 按钮 | 同上 |
| 选中高亮 | 点击活动块 | 蓝色 ring 选中框 |
| 滚动同步 | 中间区域滚动时 | 左侧/右侧纵向同步，顶部横向同步 |

## 时间轴配置

| 参数 | 值 | 位置 |
|------|---|------|
| 时间轴范围 | 2:00 AM → 次日 6:00 AM（28 小时） | `utils/time.ts` |
| 像素密度 | 80px / 小时 | `PX_PER_HOUR` |
| 吸附粒度 | 15 分钟 | `SNAP_MINUTES` |
| 行高 | 44px | `ROW_HEIGHT` |

## 变更指南

### 修改时间轴范围或密度

修改 `src/utils/time.ts` 中的常量即可，两套实现共用同一文件，改一处两边生效。

### 新增活动类型

1. `src/types.ts` → `ActivityType` 联合类型中追加，`BLOCK_COLORS` 和 `BLOCK_LABELS` 中追加映射
2. 右键菜单自动包含新类型，无需额外改动

### 新增坐席 / Mock 数据

修改 `src/mock-data.ts`，追加 `agents` 和 `activities` 数组条目。

### 新增业务规则

- React 版：`src/store.ts` 的 `moveActivity` / `resizeActivity` / `addActivity`
- Vue 3 版：`src/stores/schedule.ts` 的对应函数

## 编码约定

### 通用

- **文件名**：kebab-case
- **类型导入**：`import { type Xxx }` 语法
- **事件处理**：拖拽/拉伸使用 `document.addEventListener` 全局监听，不依赖框架事件冒泡

### React 版

- 组件用 `memo` 包裹纯渲染组件
- Store 在事件监听器中通过 `useScheduleStore.getState()` 读写，避免闭包过期

### Vue 3 版

- 组件使用 `<script setup lang="ts">` SFC 风格
- Store 通过 `storeToRefs()` 解构响应式状态，action 直接调用
- 需要暴露 DOM ref 时使用 `defineExpose`
