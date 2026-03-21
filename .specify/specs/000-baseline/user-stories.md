# WFM 排班系统 — UserStory 清单

## 概述

本文档定义了 12 个端到端 UserStory，覆盖 WFM 排班系统的全部核心功能。每个 US 对应一组 e2e 测试用例，可通过 `./tests/run-all.sh` 一键验证。

**测试数据场景**：20 名坐席、3 个班组、4 种班次、3 种合同、6 种技能、多种休假/例外安排（详见 `backend/src/db/seed.ts`）。

---

## US01 — 创建排班方案并生成班表

### 角色
运营经理

### 故事
作为运营经理，我需要创建一个 7 天的排班方案，系统根据员工合同、班次包和已审批休假自动生成排班，以便我快速得到一版可用的班表。

### 前置条件
- 20 名坐席已配置，绑定合同和班组
- 4 种班次（早/中/晚/弹性）已配置
- 王磊（E003）3/21 有已审批全天病假
- 张明（E001）3/22 有已审批年假

### 验收标准
| # | 验收条件 | 测试用例 |
|---|---------|---------|
| 1 | 方案成功创建，包含名称、日期范围 | `plan exists and has generated data` |
| 2 | 3/20 的时间轴包含 20 名坐席 | `plan has 20 agents on 3/20` |
| 3 | 3/21 不包含王磊的排班（全天病假） | `3/21 does NOT have entry for 王磊` |
| 4 | 3/22 不包含张明的排班（年假） | `3/22 does NOT have entry for 张明` |
| 5 | 每个坐席的块列表无时间重叠 | `blocks for each agent have no overlaps on 3/20` |
| 6 | 全职坐席包含 Work + Break + Lunch 块 | `full-time agents have WORK, BREAK, and LUNCH` |
| 7 | 兼职/弹性坐席包含 Work + Break 块 | `part-time agents have WORK and BREAK` |
| 8 | 方案日期范围正确（7 天） | `plan covers 7 days` |

### 涉及功能
排班方案 CRUD、排班算法、合同→班次包→班次选择、预排休假过滤、活动模板展开

---

## US02 — 拖拽移动活动块

### 角色
调度员

### 故事
作为调度员，我需要把张明（E001）3/20 的第一个 Break 从原位置往后移 30 分钟，以便他在另一个时间段休息。

### 前置条件
- 排班方案已生成
- 张明 3/20 有 Break 块

### 验收标准
| # | 验收条件 | 测试用例 |
|---|---------|---------|
| 1 | 张明有 Break 块 | `张明 has BREAK blocks` |
| 2 | 移动操作 commit 成功 | `moving BREAK +30min commits` |
| 3 | 移动后无时间重叠 | `no overlaps after move` |
| 4 | 方案版本号递增 | `version incremented` |
| 5 | Work 块自动重建（填充新间隙） | `Work blocks rebuilt` |

### 涉及功能
EditIntent MOVE_BLOCK、15 分钟吸附、Work 自动重建、版本递增、变更记录

---

## US03 — 在 Work 区域插入 Meeting

### 角色
调度员

### 故事
作为调度员，我需要给李娜（E002）在 3/20 的一段 Work 时间中间插入一个 30 分钟的 Meeting，系统应自动把 Work 切分为两段。

### 前置条件
- 李娜 3/20 有足够长的 Work 块（≥1 小时）

### 验收标准
| # | 验收条件 | 测试用例 |
|---|---------|---------|
| 1 | 李娜有 Work 块 | `李娜 has Work blocks` |
| 2 | 插入 Meeting commit 成功 | `inserting Meeting in Work commits` |
| 3 | Meeting 块出现在时间轴上 | `Meeting exists after insert` |
| 4 | 块无重叠（Work 自动切分） | `no overlaps` |

### 涉及功能
EditIntent INSERT_ACTIVITY、活动覆盖规则（Meeting 可覆盖 Work）、Work 切分/重建、重叠处理

---

## US04 — 活动覆盖规则拒绝非法操作

### 角色
调度员

### 故事
作为调度员，当我试图把 Training 放到李娜的 Lunch 时段时，系统应拒绝该操作，因为 Training 不能覆盖 Lunch（用餐时间受保护）。

### 前置条件
- 李娜 3/20 有 Lunch 块
- 覆盖规则：Training → Lunch = canCover: false

### 验收标准
| # | 验收条件 | 测试用例 |
|---|---------|---------|
| 1 | 李娜有 Lunch 块 | `李娜 has LUNCH` |
| 2 | 操作被拒绝（status=rejected） | `TRAINING over LUNCH rejected` |
| 3 | 错误包含 ACTIVITY_COVER 规则码 | `rejection has ACTIVITY_COVER error` |
| 4 | Lunch 块位置不变 | `LUNCH unchanged` |

### 涉及功能
规则引擎 edit_preview 阶段、ACTIVITY_COVER handler、活动覆盖规则表查询

---

## US05 — 预排休假不参与排班

### 角色
运营经理

### 故事
王磊（E003）3/21 有已审批的全天病假。排班算法在生成班表时应自动跳过他这一天，不生成任何排班块。

### 前置条件
- 王磊有 3/21 全天病假（status=approved, isPrePlanned=true）

### 验收标准
| # | 验收条件 | 测试用例 |
|---|---------|---------|
| 1 | 王磊 3/21 无排班块 | `王磊 has NO blocks on 3/21` |
| 2 | 王磊 3/21 无排班条目 | `王磊 has NO schedule entry` |
| 3 | 其他坐席 3/21 正常排班 | `other agents still have entries` |
| 4 | 3/21 至少有 19 名坐席有块 | `at least 19 agents with blocks` |
| 5 | 时间轴日期正确 | `timeline date matches` |

### 涉及功能
休假申请、审批状态、排班算法休假过滤（LEAVE_FILTER 规则）

---

## US06 — 临时病假替换已排班次

### 角色
调度员

### 故事
赵敏（E004）3/20 临时请了半天假。调度员需要用 REPLACE_WITH_LEAVE 操作把她下午的排班替换为 Sick Leave。

### 前置条件
- 赵敏 3/20 有排班块

### 验收标准
| # | 验收条件 | 测试用例 |
|---|---------|---------|
| 1 | 赵敏 3/20 有排班块 | `赵敏 has blocks` |
| 2 | 替换操作 commit 成功 | `REPLACE_WITH_LEAVE commits` |
| 3 | Sick Leave 块出现 | `sick leave block exists` |
| 4 | 替换后无重叠 | `no overlaps` |

### 涉及功能
EditIntent REPLACE_WITH_LEAVE、删除时间范围内已有块、插入 Sick Leave、Work 重建

---

## US07 — 拉伸活动块时长

### 角色
调度员

### 故事
调度员需要把陈刚（E005）3/20 的第一个 Break 从 15 分钟拉伸到 30 分钟，两侧的 Work 块应自动收缩。

### 前置条件
- 陈刚 3/20 有 Break 块（原始 15 分钟）

### 验收标准
| # | 验收条件 | 测试用例 |
|---|---------|---------|
| 1 | 陈刚有 Break 块 | `陈刚 has BREAK` |
| 2 | 拉伸操作 commit 成功 | `resize BREAK to 30min commits` |
| 3 | Break 时长变为 30 分钟 | `Break is 30min` |
| 4 | 拉伸后无重叠 | `no overlaps` |

### 涉及功能
EditIntent RESIZE_RIGHT、MIN_DURATION 校验（≥15 分钟）、SHIFT_BOUNDARY 校验、Work 自动收缩

---

## US08 — 覆盖需求阻止发布

### 角色
运营经理

### 故事
运营经理配置了覆盖需求：3/20 上午 01:00-03:00 UTC 至少需要 50 名坐席在岗。发布前校验应检测到人手不足并报错。

### 前置条件
- 排班方案已生成

### 验收标准
| # | 验收条件 | 测试用例 |
|---|---------|---------|
| 1 | 添加极端覆盖需求（50 人） | `add extreme staffing req` |
| 2 | 发布校验包含 STAFFING_COVERAGE 错误 | `publish validate shows error` |
| 3 | 方案不可发布（valid=false） | `plan not publishable` |
| 4 | 删除需求后恢复正常 | `delete requirement` |

### 涉及功能
覆盖需求 CRUD、STAFFING_COVERAGE 规则 handler、publish validate 阶段、技能维度覆盖（可选）

---

## US09 — 发布排班方案并回滚

### 角色
运营经理

### 故事
运营经理发布排班方案后发现问题，需要回滚到发布前的版本。

### 验收标准
| # | 验收条件 | 测试用例 |
|---|---------|---------|
| 1 | 发布成功 | `publish` |
| 2 | 方案状态变为 published | `status=published` |
| 3 | 版本快照已创建 | `history has version` |
| 4 | 发布日志存在 | `history has publish log` |
| 5 | 回滚成功 | `rollback` |
| 6 | 状态恢复为 editing | `status=editing after rollback` |
| 7 | 回滚日志存在 | `rollback log exists` |

### 涉及功能
发布流程、版本快照（plan_versions）、状态流转、回滚恢复、发布日志（publish_logs）

---

## US10 — 批量给多人插入培训

### 角色
调度员

### 故事
调度员需要同时给 Team Alpha 的 4 名坐席在同一时段插入 30 分钟的 Training。

### 前置条件
- 4 名坐席 3/20 有可用的 Work 块

### 验收标准
| # | 验收条件 | 测试用例 |
|---|---------|---------|
| 1 | 批量操作有多个 committed | `batch insert Training for 4 agents` |
| 2 | 对应坐席有 Training 块 | `Training blocks exist` |

### 涉及功能
批量编辑 API（/changes/batch）、多人同时操作、versionNo 自增、覆盖率变化

---

## US11 — 全部 API 端点冒烟测试

### 角色
系统管理员

### 故事
系统启动后，所有主数据和配置 API 应返回正确的数据条数，确保种子数据完整。

### 验收标准
| # | 验收条件 | 测试用例 |
|---|---------|---------|
| 1 | 8 种活动类型 | `8 activities` |
| 2 | 6 种技能 | `6 skills` |
| 3 | 3 个班组 | `3 groups` |
| 4 | 20 名坐席 | `20 agents` |
| 5 | 3 种合同 | `3 contracts` |
| 6 | 3 种假期类型 | `3 leave types` |
| 7 | ≥4 条休假申请 | `4+ leaves` |
| 8 | 13 条规则定义 | `13 rules` |
| 9 | ≥4 个班次 | `4 shifts` |
| 10 | ≥3 个班次包 | `3 shift packages` |
| 11 | 健康检查正常 | `health ok` |

### 涉及功能
全部 REST CRUD 端点、种子数据完整性

---

## US12 — 主数据全链路创建与清理

### 角色
系统管理员

### 故事
管理员通过 API 创建一条完整的主数据链路：新建活动类型 → 新建班制模板 → 新建班次 → 添加活动模板 → 新建班次包 → 绑定班次到包，然后验证关联关系正确，最后清理测试数据。

### 验收标准
| # | 验收条件 | 测试用例 |
|---|---------|---------|
| 1 | 创建 COACHING 活动类型 | `create COACHING activity` |
| 2 | 创建班制模板 | `create shift pattern` |
| 3 | 创建班次 | `create shift` |
| 4 | 添加活动模板到班次 | `add activity template` |
| 5 | 创建班次包 | `create shift package` |
| 6 | 绑定班次到包 | `add shift to package` |
| 7 | 班次详情包含活动模板 | `shift has activity template` |
| 8 | 班次包包含班次 | `package has shift` |
| 9 | 活动列表包含 COACHING | `COACHING in activities list` |
| 10 | 删除后数据清理干净 | `cleanup: delete` |

### 涉及功能
活动类型 CRUD、班制模板 CRUD、班次 CRUD、班次活动模板 CRUD、班次包 CRUD、班次包绑定 CRUD

---

## 功能覆盖矩阵

| 系统功能 | US01 | US02 | US03 | US04 | US05 | US06 | US07 | US08 | US09 | US10 | US11 | US12 |
|---------|:----:|:----:|:----:|:----:|:----:|:----:|:----:|:----:|:----:|:----:|:----:|:----:|
| 方案 CRUD | ● | | | | | | | | ● | | | |
| 排班算法 | ● | | | | ● | | | | | | | |
| 时间轴查询 | ● | ● | ● | ● | ● | ● | ● | | | ● | | |
| 拖拽移动 | | ● | | | | | | | | | | |
| 拉伸调整 | | | | | | | ● | | | | | |
| 插入活动 | | | ● | ● | | | | | | ● | | |
| 覆盖规则 | | | ● | ● | | | | | | | | |
| 休假(预排) | ● | | | | ● | | | | | | | |
| 休假(临时) | | | | | | ● | | | | | | |
| Work 重建 | | ● | ● | | | ● | ● | | | | | |
| 校验(局部) | | ● | ● | ● | | | ● | | | | | |
| 校验(全局) | | ● | ● | | | ● | | ● | | | | |
| 规则引擎 | | ● | ● | ● | | ● | ● | ● | | | | |
| 覆盖需求 | | | | | | | | ● | | | | |
| 发布/回滚 | | | | | | | | | ● | | | |
| 版本管理 | | ● | | | | | | | ● | | | |
| 批量编辑 | | | | | | | | | | ● | | |
| 主数据 CRUD | | | | | | | | | | | ● | ● |
| 变更记录 | | ● | ● | | | ● | ● | | | ● | | |
| 重叠处理 | ● | ● | ● | | | ● | ● | | | | | |
