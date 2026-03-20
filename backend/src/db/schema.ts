/**
 * schema.ts — WFM 排班系统数据库 Schema（Drizzle ORM + SQLite）
 *
 * 共 20 张表，分四层：
 * 第一层：主数据与规则（activities, shift_patterns, shifts, shift_activities,
 *         shift_packages, shift_package_items, contracts, contract_packages, activity_cover_rules）
 * 第二层：人员与状态（agents, groups, leaves, exceptions）
 * 第三层：排班结果（schedule_plans, schedule_entries, schedule_blocks, staffing_requirements）
 * 第四层：编辑与校验（schedule_changes, validation_results）
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

// =============================================
// 第一层：主数据与规则
// =============================================

/** 活动类型定义（Work/Break/Meeting/Training...） */
export const activities = sqliteTable('activities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').notNull().default('#4ade80'),
  priority: integer('priority').notNull().default(0),  // 越高优先级越高
  isPaid: integer('is_paid', { mode: 'boolean' }).notNull().default(true),
  isCoverable: integer('is_coverable', { mode: 'boolean' }).notNull().default(true),  // 能否被覆盖
  canCover: integer('can_cover', { mode: 'boolean' }).notNull().default(false),        // 能否覆盖别人
  icon: text('icon'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

/** 班制/班次模板 */
export const shiftPatterns = sqliteTable('shift_patterns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

/** 具体班次 */
export const shifts = sqliteTable('shifts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patternId: integer('pattern_id').references(() => shiftPatterns.id),
  name: text('name').notNull(),
  startTime: text('start_time').notNull(),   // HH:mm 格式
  endTime: text('end_time').notNull(),       // HH:mm 格式，可跨天如 "02:00"
  durationMinutes: integer('duration_minutes').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

/** 班次内的活动片段模板（定义班次的内部结构） */
export const shiftActivities = sqliteTable('shift_activities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  shiftId: integer('shift_id').notNull().references(() => shifts.id),
  activityId: integer('activity_id').notNull().references(() => activities.id),
  offsetMinutes: integer('offset_minutes').notNull(),    // 相对班次开始的偏移
  durationMinutes: integer('duration_minutes').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

/** 班次包（班次的集合容器） */
export const shiftPackages = sqliteTable('shift_packages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

/** 班次包 ↔ 班次 关联 */
export const shiftPackageItems = sqliteTable('shift_package_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  packageId: integer('package_id').notNull().references(() => shiftPackages.id),
  shiftId: integer('shift_id').notNull().references(() => shifts.id),
})

/** 合同（排班约束集合） */
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
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

/** 合同 ↔ 班次包 关联 */
export const contractPackages = sqliteTable('contract_packages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  contractId: integer('contract_id').notNull().references(() => contracts.id),
  packageId: integer('package_id').notNull().references(() => shiftPackages.id),
})

/** 活动覆盖规则 */
export const activityCoverRules = sqliteTable('activity_cover_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceActivityId: integer('source_activity_id').notNull().references(() => activities.id),
  targetActivityId: integer('target_activity_id').notNull().references(() => activities.id),
  canCover: integer('can_cover', { mode: 'boolean' }).notNull().default(false),
})

// =============================================
// 第二层：人员与状态
// =============================================

/** 班组 */
export const groups = sqliteTable('groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  maxStartDiffMinutes: integer('max_start_diff_minutes').default(30),
  maxEndDiffMinutes: integer('max_end_diff_minutes').default(30),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

/** 员工/座席 */
export const agents = sqliteTable('agents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  employeeNo: text('employee_no').notNull(),
  groupId: integer('group_id').references(() => groups.id),
  contractId: integer('contract_id').references(() => contracts.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

/** 休假申请 */
export const leaves = sqliteTable('leaves', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  agentId: integer('agent_id').notNull().references(() => agents.id),
  leaveType: text('leave_type').notNull(),    // annual / sick / personal / other
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  isFullDay: integer('is_full_day', { mode: 'boolean' }).notNull().default(true),
  status: text('status').notNull().default('pending'),  // pending / approved / rejected
  isPrePlanned: integer('is_pre_planned', { mode: 'boolean' }).notNull().default(true),
  note: text('note'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

/** 例外安排（会议/培训等非常规活动） */
export const exceptions = sqliteTable('exceptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  agentId: integer('agent_id').notNull().references(() => agents.id),
  activityId: integer('activity_id').notNull().references(() => activities.id),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  note: text('note'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// =============================================
// 第三层：排班结果
// =============================================

/** 排班方案 */
export const schedulePlans = sqliteTable('schedule_plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  startDate: text('start_date').notNull(),   // YYYY-MM-DD
  endDate: text('end_date').notNull(),
  status: text('status').notNull().default('draft'),  // draft / published
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

/** 排班条目（员工某天的班次分配） */
export const scheduleEntries = sqliteTable('schedule_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  planId: integer('plan_id').notNull().references(() => schedulePlans.id),
  agentId: integer('agent_id').notNull().references(() => agents.id),
  date: text('date').notNull(),              // YYYY-MM-DD
  shiftId: integer('shift_id').references(() => shifts.id),
})

/** 排班活动块（时间轴上的最终渲染块） */
export const scheduleBlocks = sqliteTable('schedule_blocks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entryId: integer('entry_id').notNull().references(() => scheduleEntries.id),
  activityId: integer('activity_id').notNull().references(() => activities.id),
  startTime: text('start_time').notNull(),   // ISO datetime
  endTime: text('end_time').notNull(),
})

/** 人力覆盖需求 */
export const staffingRequirements = sqliteTable('staffing_requirements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  planId: integer('plan_id').notNull().references(() => schedulePlans.id),
  date: text('date').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  minAgents: integer('min_agents').notNull(),
})

// =============================================
// 第四层：编辑与校验
// =============================================

/** 编辑历史记录 */
export const scheduleChanges = sqliteTable('schedule_changes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  planId: integer('plan_id').notNull().references(() => schedulePlans.id),
  agentId: integer('agent_id').notNull().references(() => agents.id),
  date: text('date').notNull(),
  changeType: text('change_type').notNull(),  // add / update / delete
  beforeJson: text('before_json'),
  afterJson: text('after_json'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

/** 校验结果 */
export const validationResults = sqliteTable('validation_results', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  planId: integer('plan_id').notNull().references(() => schedulePlans.id),
  agentId: integer('agent_id').references(() => agents.id),
  date: text('date'),
  level: text('level').notNull(),             // error / warning / info
  ruleType: text('rule_type').notNull(),      // contract / cover / group_sync / staffing / activity_priority
  message: text('message').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})
