# WFM Schedule Editor — Demo

## 项目简介

WFM（Workforce Management）排班时间轴编辑器 Demo。基于 Vue 3 + DOM 自研方案实现，核心交互为"冻结人员列表 + 横向时间轴 + 活动块拖拽编辑 + Work 自动填充"。

## 项目结构

```
wfm-demo/
├── vue3/           ← Vue 3 实现（端口 3201）
├── AGENTS.md       ← 本文件
└── package.sh      ← 打包脚本
```

## 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Vue 3 + TypeScript + Vite |
| 样式 | Tailwind CSS v4（`@tailwindcss/vite` 插件） |
| 状态管理 | Pinia |
| 时间处理 | dayjs |
| 测试 | Puppeteer-core + Chrome 146 headless |

## 依赖与许可证

### 运行时依赖（打包进产品）

| 包 | 版本 | 协议 |
|---|------|------|
| vue | ^3.x | MIT |
| dayjs | ^1.11.20 | MIT |
| pinia | ^3.x | MIT |

### 开发依赖（不打包进产品）

| 包 | 协议 | 说明 |
|---|------|------|
| tailwindcss / @tailwindcss/vite | MIT | 原子化 CSS |
| vite | MIT | 构建工具 |
| @vitejs/plugin-vue | MIT | Vite Vue 插件 |
| typescript | Apache-2.0 | 类型系统 |
| eslint + plugins | MIT | 代码检查 |
| puppeteer-core | Apache-2.0 | Chrome 自动化测试 |

### 商用合规性

所有依赖均为 **MIT** 或 **Apache-2.0** 协议，商用无风险。无 GPL/AGPL/SSPL 等 copyleft 传染性协议。合规事项：生产构建时保留第三方许可声明即可。

## 关键命令

```bash
cd vue3 && npm install         # 安装依赖
cd vue3 && npm run dev         # 启动开发服务器（http://localhost:3201）

./package.sh                   # 打包全部源码为 zip
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

### 三层分离

```
渲染层（components/）
  ├── ScheduleEditor.vue  → 三栏布局容器
  ├── AgentList.vue       → 左侧冻结人员列表
  ├── TimelineHeader.vue  → 顶部时间刻度
  ├── TimelineBody.vue    → 中间时间轴主体（行 + 块 + 右键菜单）
  ├── ScheduleBlock.vue   → 单个块渲染（颜色、标签、选中态、× 按钮）
  ├── ContractTime.vue    → 右侧工时汇总
  ├── CurrentTimeLine.vue → 当前时间红色参考线
  └── ContextMenu.vue     → 右键菜单（新增/删除）

交互层（composables/）
  ├── useBlockInteraction → 拖拽移动 + 左右拉伸（document 级 pointer 事件）
  └── useScrollSync       → 三区域滚动同步

规则层（utils/ + stores/）
  ├── time.ts             → 时间↔像素映射、吸附、刻度生成
  ├── rules.ts            → deriveDisplayBlocks、工时计算
  └── stores/schedule.ts  → Pinia store（moveActivity、resizeActivity、addActivity、deleteActivity）
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

修改 `vue3/src/utils/time.ts` 中的常量即可，所有组件自动适配。

### 新增活动类型

1. `vue3/src/types.ts` → `ActivityType` 联合类型中追加，`BLOCK_COLORS` 和 `BLOCK_LABELS` 中追加映射
2. 右键菜单自动包含新类型，无需额外改动

### 新增坐席 / Mock 数据

修改 `vue3/src/mock-data.ts`，追加 `agents` 和 `activities` 数组条目。

### 新增业务规则

在 `vue3/src/stores/schedule.ts` 的 `moveActivity` / `resizeActivity` / `addActivity` 中追加校验逻辑。

## 编码约定

- **文件名**：kebab-case
- **组件**：`<script setup lang="ts">` SFC 风格
- **Store**：通过 `storeToRefs()` 解构响应式状态，action 直接调用
- **DOM ref 暴露**：需要时使用 `defineExpose`
- **事件处理**：拖拽/拉伸使用 `document.addEventListener` 全局监听，不依赖框架事件冒泡
- **类型导入**：`import { type Xxx }` 语法
