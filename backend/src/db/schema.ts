/**
 * schema.ts — WFM 排班系统完整数据库 Schema（Drizzle ORM + SQLite）
 *
 * 共 28 张表，分五个子域：
 *
 * 一、主数据配置（10 表）
 *   activities, activity_cover_rules, shift_patterns, shifts, shift_activities,
 *   shift_packages, shift_package_items, contracts, contract_packages, skills
 *
 * 二、人员与状态（6 表）
 *   groups, agents, agent_skills, leave_types, leaves, exceptions
 *
 * 三、排班计划（5 表）
 *   schedule_plans, schedule_entries, schedule_blocks, staffing_requirements, plan_versions
 *
 * 四、规则中心（3 表）
 *   rule_definitions, rule_bindings, rule_chains
 *
 * 五、编辑事务与审计（4 表）
 *   change_operations, change_items, validation_results, publish_logs
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

const ts = () => text('created_at').notNull().$defaultFn(() => new Date().toISOString())

// ===========================================================
// 一、主数据配置
// ===========================================================

/** 活动类型（Work/Break/Lunch/Meeting/Training...） */
export const activities = sqliteTable('activities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(),              // 唯一编码如 WORK, BREAK, LUNCH
  name: text('name').notNull(),
  color: text('color').notNull().default('#4ade80'),
  icon: text('icon'),
  priority: integer('priority').notNull().default(0),
  isPaid: integer('is_paid', { mode: 'boolean' }).notNull().default(true),
  isCoverable: integer('is_coverable', { mode: 'boolean' }).notNull().default(true),
  canCover: integer('can_cover', { mode: 'boolean' }).notNull().default(false),
  createdAt: ts(),
})

/** 活动覆盖规则（A 能否覆盖 B） */
export const activityCoverRules = sqliteTable('activity_cover_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceActivityId: integer('source_activity_id').notNull().references(() => activities.id),
  targetActivityId: integer('target_activity_id').notNull().references(() => activities.id),
  canCover: integer('can_cover', { mode: 'boolean' }).notNull().default(false),
})

/** 班制/班次模板 */
export const shiftPatterns = sqliteTable('shift_patterns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: ts(),
})

/** 具体班次 */
export const shifts = sqliteTable('shifts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patternId: integer('pattern_id').references(() => shiftPatterns.id),
  name: text('name').notNull(),
  startTime: text('start_time').notNull(),     // HH:mm
  endTime: text('end_time').notNull(),         // HH:mm
  durationMinutes: integer('duration_minutes').notNull(),
  createdAt: ts(),
})

/** 班次内活动模板 */
export const shiftActivities = sqliteTable('shift_activities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  shiftId: integer('shift_id').notNull().references(() => shifts.id),
  activityId: integer('activity_id').notNull().references(() => activities.id),
  offsetMinutes: integer('offset_minutes').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

/** 班次包 */
export const shiftPackages = sqliteTable('shift_packages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  createdAt: ts(),
})

/** 班次包 ↔ 班次 */
export const shiftPackageItems = sqliteTable('shift_package_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  packageId: integer('package_id').notNull().references(() => shiftPackages.id),
  shiftId: integer('shift_id').notNull().references(() => shifts.id),
})

/** 合同（排班约束集） */
export const contracts = sqliteTable('contracts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  minHoursDay: real('min_hours_day').notNull().default(4),
  maxHoursDay: real('max_hours_day').notNull().default(10),
  minHoursWeek: real('min_hours_week').notNull().default(20),
  maxHoursWeek: real('max_hours_week').notNull().default(40),
  minBreakMinutes: integer('min_break_minutes').notNull().default(15),
  lunchRequired: integer('lunch_required', { mode: 'boolean' }).notNull().default(true),
  lunchMinMinutes: integer('lunch_min_minutes').notNull().default(30),
  createdAt: ts(),
})

/** 合同 ↔ 班次包 */
export const contractPackages = sqliteTable('contract_packages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  contractId: integer('contract_id').notNull().references(() => contracts.id),
  packageId: integer('package_id').notNull().references(() => shiftPackages.id),
})

/** 技能定义 */
export const skills = sqliteTable('skills', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(),
  name: text('name').notNull(),
  createdAt: ts(),
})

// ===========================================================
// 二、人员与状态
// ===========================================================

/** 班组 */
export const groups = sqliteTable('groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  maxStartDiffMinutes: integer('max_start_diff_minutes').default(30),
  maxEndDiffMinutes: integer('max_end_diff_minutes').default(30),
  createdAt: ts(),
})

/** 员工/座席 */
export const agents = sqliteTable('agents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  employeeNo: text('employee_no').notNull(),
  groupId: integer('group_id').references(() => groups.id),
  contractId: integer('contract_id').references(() => contracts.id),
  createdAt: ts(),
})

/** 员工技能绑定 */
export const agentSkills = sqliteTable('agent_skills', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  agentId: integer('agent_id').notNull().references(() => agents.id),
  skillId: integer('skill_id').notNull().references(() => skills.id),
  proficiency: integer('proficiency').notNull().default(100), // 0-100
})

/** 假期类型 */
export const leaveTypes = sqliteTable('leave_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(),
  name: text('name').notNull(),
  isPaid: integer('is_paid', { mode: 'boolean' }).notNull().default(true),
  maxDaysYear: integer('max_days_year'),
  color: text('color').default('#9ca3af'),
  createdAt: ts(),
})

/** 休假申请 */
export const leaves = sqliteTable('leaves', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  agentId: integer('agent_id').notNull().references(() => agents.id),
  leaveTypeId: integer('leave_type_id').references(() => leaveTypes.id),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  isFullDay: integer('is_full_day', { mode: 'boolean' }).notNull().default(true),
  status: text('status').notNull().default('pending'),  // pending / approved / rejected
  isPrePlanned: integer('is_pre_planned', { mode: 'boolean' }).notNull().default(true),
  note: text('note'),
  approvedBy: text('approved_by'),
  approvedAt: text('approved_at'),
  createdAt: ts(),
})

/** 例外安排 */
export const exceptions = sqliteTable('exceptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  agentId: integer('agent_id').notNull().references(() => agents.id),
  activityId: integer('activity_id').notNull().references(() => activities.id),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  note: text('note'),
  createdAt: ts(),
})

// ===========================================================
// 三、排班计划
// ===========================================================

/** 排班方案 */
export const schedulePlans = sqliteTable('schedule_plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  status: text('status').notNull().default('draft'),  // draft / generated / editing / published / archived
  versionNo: integer('version_no').notNull().default(1),
  publishedAt: text('published_at'),
  publishedBy: text('published_by'),
  createdAt: ts(),
})

/** 排班条目（员工某天分配） */
export const scheduleEntries = sqliteTable('schedule_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  planId: integer('plan_id').notNull().references(() => schedulePlans.id),
  agentId: integer('agent_id').notNull().references(() => agents.id),
  date: text('date').notNull(),
  shiftId: integer('shift_id').references(() => shifts.id),
  status: text('status').notNull().default('editable'), // editable / locked / published
})

/** 排班活动块 */
export const scheduleBlocks = sqliteTable('schedule_blocks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entryId: integer('entry_id').notNull().references(() => scheduleEntries.id),
  activityId: integer('activity_id').notNull().references(() => activities.id),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  source: text('source').notNull().default('algorithm'), // algorithm / manual / leave / exception
  locked: integer('locked', { mode: 'boolean' }).notNull().default(false),
})

/** 人力覆盖需求 */
export const staffingRequirements = sqliteTable('staffing_requirements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  planId: integer('plan_id').notNull().references(() => schedulePlans.id),
  date: text('date').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  minAgents: integer('min_agents').notNull(),
  skillId: integer('skill_id').references(() => skills.id),
  channel: text('channel'),
})

/** 方案版本快照 */
export const planVersions = sqliteTable('plan_versions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  planId: integer('plan_id').notNull().references(() => schedulePlans.id),
  versionNo: integer('version_no').notNull(),
  snapshotJson: text('snapshot_json').notNull(), // JSON 序列化的完整排班数据
  createdAt: ts(),
})

// ===========================================================
// 四、规则中心
// ===========================================================

/** 规则定义（系统内置规则模板） */
export const ruleDefinitions = sqliteTable('rule_definitions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(),           // 如 ACTIVITY_COVER, CONTRACT_DAILY_HOURS
  name: text('name').notNull(),
  category: text('category').notNull(),   // activity / contract / group / staffing / plan
  stage: text('stage').notNull(),         // generate / edit_preview / edit_commit / publish
  scopeType: text('scope_type').notNull(),// global / activity / contract / group / plan
  severityDefault: text('severity_default').notNull().default('error'), // error / warning / info
  paramSchema: text('param_schema'),      // JSON Schema 描述可配置参数
  description: text('description'),
  createdAt: ts(),
})

/** 规则绑定（把规则挂到具体范围） */
export const ruleBindings = sqliteTable('rule_bindings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  definitionId: integer('definition_id').notNull().references(() => ruleDefinitions.id),
  scopeType: text('scope_type').notNull(),  // global / activity / contract / group / plan
  scopeId: integer('scope_id'),              // 具体对象 ID（global 时为 null）
  priority: integer('priority').notNull().default(100),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  params: text('params'),                    // JSON 参数覆盖
  effectiveStart: text('effective_start'),
  effectiveEnd: text('effective_end'),
  createdAt: ts(),
})

/** 规则编排（按阶段和顺序执行） */
export const ruleChains = sqliteTable('rule_chains', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  stage: text('stage').notNull(),           // generate / edit_preview / edit_commit / publish
  executionOrder: integer('execution_order').notNull(),
  bindingId: integer('binding_id').notNull().references(() => ruleBindings.id),
  stopOnError: integer('stop_on_error', { mode: 'boolean' }).notNull().default(false),
})

// ===========================================================
// 五、编辑事务与审计
// ===========================================================

/** 变更操作（一次编辑事务） */
export const changeOperations = sqliteTable('change_operations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  planId: integer('plan_id').notNull().references(() => schedulePlans.id),
  operatorId: text('operator_id'),
  operatorName: text('operator_name'),
  intentType: text('intent_type').notNull(), // INSERT_ACTIVITY / MOVE_BLOCK / RESIZE / COVER / REPLACE_LEAVE / DELETE
  saveMode: text('save_mode').notNull().default('commit'), // preview / commit
  status: text('status').notNull().default('created'), // created / validated / rejected / confirmed / committed
  clientRequestId: text('client_request_id'),
  versionNo: integer('version_no'),
  createdAt: ts(),
})

/** 变更明细（本次事务影响的具体条目，blockId 不设外键以支持删除场景） */
export const changeItems = sqliteTable('change_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  operationId: integer('operation_id').notNull().references(() => changeOperations.id),
  assignmentId: integer('assignment_id'), // 不设外键（entry 可能被 rollback 删除）
  blockId: integer('block_id'), // 不设外键（block 可能被后续操作删除）
  changeType: text('change_type').notNull(), // add / update / delete
  beforeJson: text('before_json'),
  afterJson: text('after_json'),
})

/** 校验结果 */
export const validationResults = sqliteTable('validation_results', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  operationId: integer('operation_id').references(() => changeOperations.id),
  planId: integer('plan_id').notNull().references(() => schedulePlans.id),
  agentId: integer('agent_id').references(() => agents.id),
  date: text('date'),
  level: text('level').notNull(),             // error / warning / info
  ruleCode: text('rule_code').notNull(),      // 标准规则编码
  message: text('message').notNull(),
  targetType: text('target_type'),            // plan / assignment / block / coverage_slot
  targetId: integer('target_id'),
  timeRange: text('time_range'),              // JSON {startTime, endTime}
  confirmable: integer('confirmable', { mode: 'boolean' }).notNull().default(false),
  createdAt: ts(),
})

/** 发布记录 */
export const publishLogs = sqliteTable('publish_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  planId: integer('plan_id').notNull().references(() => schedulePlans.id),
  versionNo: integer('version_no').notNull(),
  operatorId: text('operator_id'),
  operatorName: text('operator_name'),
  action: text('action').notNull(),            // publish / rollback
  note: text('note'),
  createdAt: ts(),
})
