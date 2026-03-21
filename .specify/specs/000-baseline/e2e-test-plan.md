# WFM 排班系统 — E2E 测试计划

## 1. 测试概述

| 项目 | 说明 |
|------|------|
| 测试框架 | Bun test（内置测试运行器） |
| 测试类型 | API 端到端测试 |
| 后端地址 | http://127.0.0.1:3210/api |
| 运行命令 | `./tests/run-all.sh` |
| 测试文件 | `tests/e2e/us01-us12.test.ts` |
| 总用例数 | 68 |
| 通过标准 | 全部 68 个用例 PASS |

## 2. 测试数据设计

### 2.1 坐席（20 人）

| 工号 | 姓名 | 班组 | 合同 | 特殊技能 | 休假/例外 |
|------|------|------|------|---------|----------|
| E001 | 张明 | Alpha | 全职 8h | VIP | 3/22 年假 |
| E002 | 李娜 | Alpha | 全职 8h | 英语 | 无 |
| E003 | 王磊 | Alpha | 全职 8h | 英语+聊天 | 3/21 全天病假 |
| E004 | 赵敏 | Alpha | 全职 8h | — | 3/20 临时半天假 |
| E005 | 陈刚 | Alpha | 全职 8h | 投诉 | 无 |
| E006 | 刘洋 | Alpha | 兼职 6h | 聊天 | 无 |
| E007 | 黄芳 | Alpha | 兼职 6h | 邮件 | 无 |
| E008 | 周杰 | Alpha | 全职 8h | VIP+英语 | 3/23 培训例外 |
| E009 | 吴婷 | Beta | 全职 8h | — | 无 |
| E010 | 郑浩 | Beta | 全职 8h | 英语 | 无 |
| E011 | 孙丽 | Beta | 全职 8h | 聊天+投诉 | 无 |
| E012 | 马超 | Beta | 全职 8h | 投诉 | 3/24 事假(待审批) |
| E013 | 林小红 | Beta | 兼职 6h | 聊天 | 无 |
| E014 | 杨波 | Beta | 全职 8h | — | 无 |
| E015 | 许文强 | Beta | 全职 8h | VIP | 无 |
| E016 | 高明 | Gamma | 全职 8h | 英语+VIP | 无 |
| E017 | 方琳 | Gamma | 全职 8h | 全技能 | 无 |
| E018 | 韩磊 | Gamma | 全职 8h | — | 无 |
| E019 | 曹雪 | Gamma | 弹性 7h | 邮件 | 无 |
| E020 | 丁伟 | Gamma | 全职 8h | 投诉+聊天 | 无 |

### 2.2 差异化维度

| 维度 | 差异项 |
|------|--------|
| 合同 | 全职 8h（15人）、兼职 6h（3人）、弹性 7h（1人） |
| 班组 | Alpha（8人，时差 ≤120min）、Beta（7人，≤240min）、Gamma（5人，≤60min） |
| 班次 | 早班 06-14、中班 10-18、晚班 14-22、弹性 08-15 |
| 技能 | 中文语音（全员）、英语（5人）、VIP（4人）、聊天（5人）、邮件（2人）、投诉（4人） |
| 休假 | 年假 1 人、病假 1 人（全天）、事假 1 人（半天临时）、待审批 1 人 |
| 例外 | 培训 1 人（3/23） |

### 2.3 活动覆盖规则

| 源活动 | 目标活动 | 可覆盖 | 测试场景 |
|--------|---------|--------|---------|
| Meeting | Work | ✓ | US03 |
| Training | Work | ✓ | US10 |
| Offline | Work | ✓ | — |
| Sick Leave | Work/Break/Lunch/Meeting/Training/Offline | ✓ | US06 |
| Training | Lunch | ✗ | **US04（拒绝场景）** |
| Meeting | Lunch | ✗ | — |

## 3. 测试执行流程

```
┌──────────────┐
│ run-all.sh   │
├──────────────┤
│ 1. 停已有进程 │
│ 2. 清库+推schema│
│ 3. 跑 seed.ts │
│ 4. 启动后端   │
│ 5. 串行跑 12  │
│    个测试文件  │
│ 6. 停后端     │
│ 7. 输出结果   │
└──────────────┘
```

### 测试顺序（串行，有依赖）

```
US01 (创建方案) ← 所有后续测试依赖此方案
  ↓
US02 (移动块) → 修改了张明的 Break 位置
US03 (插入 Meeting) → 李娜新增 Meeting 块
US04 (覆盖拒绝) → 验证后不改数据
US05 (预排休假) → 只读验证
US06 (临时休假) → 赵敏新增 Sick Leave
US07 (拉伸) → 陈刚 Break 扩到 30min
  ↓
US08 (覆盖需求) → 创建+删除需求，不影响排班数据
US09 (发布回滚) → 发布后回滚，恢复 editing 状态
US10 (批量培训) → 4 人新增 Training
  ↓
US11 (冒烟测试) → 只读
US12 (主数据链路) → 创建后清理
```

## 4. 测试基础设施

### 4.1 文件结构

```
tests/
├── e2e/
│   ├── helpers.ts              ← API 调用辅助函数
│   ├── setup.ts                ← 全局 setup（创建方案，确保可编辑状态）
│   ├── us01-create-plan.test.ts    (8 tests)
│   ├── us02-move-block.test.ts     (5 tests)
│   ├── us03-insert-meeting.test.ts (4 tests)
│   ├── us04-cover-rejected.test.ts (4 tests)
│   ├── us05-preplanned-leave.test.ts (5 tests)
│   ├── us06-temp-sick-leave.test.ts  (4 tests)
│   ├── us07-resize-block.test.ts   (4 tests)
│   ├── us08-staffing-check.test.ts (4 tests)
│   ├── us09-publish-rollback.test.ts (7 tests)
│   ├── us10-batch-training.test.ts (2 tests)
│   ├── us11-i18n.test.ts          (11 tests)
│   └── us12-master-data-chain.test.ts (10 tests)
└── run-all.sh                  ← 一键执行脚本
```

### 4.2 helpers.ts 关键函数

| 函数 | 用途 |
|------|------|
| `api(path)` | GET 请求 |
| `post(path, body)` | POST 请求 |
| `put(path, body)` | PUT 请求 |
| `del(path)` | DELETE 请求 |
| `getTimeline(planId, date)` | 获取时间轴数据 |
| `getAgentBlocks(timeline, agentId)` | 获取某坐席的块（已排序） |
| `hasNoOverlaps(blocks)` | 检查块列表无时间重叠 |
| `commitEdit(planId, opts)` | 提交编辑意图（自动获取 versionNo、转换字段名） |

### 4.3 setup.ts 逻辑

```
ensurePlanExists()
  ├── 检查是否已有方案
  │   ├── 有 → 检查状态
  │   │   └── published → 自动 rollback 到 editing
  │   └── 无 → 创建 7 天方案 + 生成排班 + 添加覆盖需求
  └── 返回 PLAN_ID = 1
```

## 5. API 响应格式速查

### 5.1 时间轴

```
GET /plans/:id/timeline?date=YYYY-MM-DD
→ {
    planId, date,
    agents: [{ id, name, shift, shiftStart, shiftEnd, groupName, contractName }],
    blocks: [{ id, entryId, agentId, activityId, type, name, color, start, end, source, locked, editable }]
  }
```

### 5.2 编辑提交

```
POST /plans/:id/changes/commit
← { intentType, assignmentId, blockId?, activityId?, targetRange?, versionNo, confirmWarnings }
→ { operationId, status: "committed"|"rejected", versionNo, validation: {valid,errors,warnings,infos}, updatedBlocks, refreshScope }
```

### 5.3 校验结果

```
POST /plans/:id/validate ← { date }
POST /plans/:id/publish/validate
→ { valid: boolean, errors: [{level,ruleCode,message,confirmable}], warnings: [...], infos: [...] }
```

### 5.4 发布/回滚

```
POST /plans/:id/publish ← { operatorId }
→ { ok, versionNo, publishedAt }

POST /plans/:id/rollback ← { versionNo }
→ { ok, restoredVersion }

GET /plans/:id/history
→ { versions: [{id,versionNo,createdAt}], logs: [{id,planId,versionNo,action,createdAt}] }
```

## 6. 环境要求

| 依赖 | 版本 |
|------|------|
| Bun | ≥ 1.3 |
| Node.js | ≥ 22（前端 npm） |
| Chrome | ≥ 146（UI 测试可选） |

### 代理绕过

测试脚本已配置 `NO_PROXY=localhost,127.0.0.1`，helpers.ts 使用 `127.0.0.1` 避免代理拦截。

## 7. 故障排查

| 症状 | 原因 | 解决 |
|------|------|------|
| 所有测试 null is not an object | fetch 走了代理 | 设置 `NO_PROXY=localhost` |
| FOREIGN KEY constraint failed | 编辑后删除块触发外键 | schema 已修复（change_items 无外键约束） |
| VERSION_CONFLICT | 多个测试修改了同一方案 | setup.ts 自动获取最新 versionNo |
| status=published 导致编辑被拒 | US09 发布后未回滚 | setup.ts 自动 rollback |
| Assignment not found | entryId 不正确 | commitEdit 从 timeline blocks 自动解析 |
