/**
 * seed.ts — 完整场景种子数据（e2e 测试 + 演示）
 *
 * 20 名坐席，3 个班组，4 种班次，3 种合同，6 种技能
 * 含预排休假、临时休假、例外安排、覆盖需求
 */

import { db } from './index'
import * as s from './schema'

function seed() {
  console.log('Seeding database...')

  // 清空所有表
  const tables = [
    s.publishLogs, s.validationResults, s.changeItems, s.changeOperations,
    s.ruleChains, s.ruleBindings, s.ruleDefinitions,
    s.planVersions, s.staffingRequirements, s.scheduleBlocks, s.scheduleEntries, s.schedulePlans,
    s.exceptions, s.leaves, s.leaveTypes, s.agentSkills, s.agents, s.groups, s.skills,
    s.activityCoverRules, s.contractPackages, s.contracts,
    s.shiftPackageItems, s.shiftPackages, s.shiftActivities, s.shifts, s.shiftPatterns, s.activities,
  ]
  for (const t of tables) db.delete(t).run()

  // ========== 1. 活动类型（8 种） ==========
  const actRows = db.insert(s.activities).values([
    { code: 'WORK',       name: 'Work',       color: '#4ade80', priority: 10, isPaid: true,  isCoverable: true,  canCover: false, icon: 'phone' },
    { code: 'BREAK',      name: 'Break',      color: '#facc15', priority: 20, isPaid: true,  isCoverable: false, canCover: true,  icon: 'coffee' },
    { code: 'LUNCH',      name: 'Lunch',      color: '#fb923c', priority: 30, isPaid: false, isCoverable: false, canCover: true,  icon: 'utensils' },
    { code: 'MEETING',    name: 'Meeting',    color: '#3b82f6', priority: 40, isPaid: true,  isCoverable: true,  canCover: true,  icon: 'users' },
    { code: 'TRAINING',   name: 'Training',   color: '#818cf8', priority: 40, isPaid: true,  isCoverable: true,  canCover: true,  icon: 'book' },
    { code: 'OFFLINE',    name: 'Offline',    color: '#f97316', priority: 15, isPaid: true,  isCoverable: true,  canCover: true,  icon: 'monitor' },
    { code: 'SICK_LEAVE', name: 'Sick Leave', color: '#ef4444', priority: 90, isPaid: true,  isCoverable: false, canCover: true,  icon: 'heart' },
    { code: 'DAY_OFF',    name: 'Day Off',    color: '#9ca3af', priority: 99, isPaid: false, isCoverable: false, canCover: true,  icon: 'calendar-off' },
  ]).returning().all()
  const act = Object.fromEntries(actRows.map(a => [a.code, a]))
  console.log(`  Activities: ${actRows.length}`)

  // ========== 2. 覆盖规则 ==========
  db.insert(s.activityCoverRules).values([
    { sourceActivityId: act.MEETING.id,    targetActivityId: act.WORK.id,     canCover: true },
    { sourceActivityId: act.TRAINING.id,   targetActivityId: act.WORK.id,     canCover: true },
    { sourceActivityId: act.OFFLINE.id,    targetActivityId: act.WORK.id,     canCover: true },
    { sourceActivityId: act.SICK_LEAVE.id, targetActivityId: act.WORK.id,     canCover: true },
    { sourceActivityId: act.SICK_LEAVE.id, targetActivityId: act.BREAK.id,    canCover: true },
    { sourceActivityId: act.SICK_LEAVE.id, targetActivityId: act.LUNCH.id,    canCover: true },
    { sourceActivityId: act.SICK_LEAVE.id, targetActivityId: act.MEETING.id,  canCover: true },
    { sourceActivityId: act.SICK_LEAVE.id, targetActivityId: act.TRAINING.id, canCover: true },
    { sourceActivityId: act.SICK_LEAVE.id, targetActivityId: act.OFFLINE.id,  canCover: true },
    // Training 不能覆盖 Lunch（US4 测试场景）
    { sourceActivityId: act.TRAINING.id,   targetActivityId: act.LUNCH.id,    canCover: false },
    // Meeting 不能覆盖 Lunch
    { sourceActivityId: act.MEETING.id,    targetActivityId: act.LUNCH.id,    canCover: false },
  ]).run()
  console.log('  Cover rules: 11')

  // ========== 3. 技能（6 种） ==========
  const skillRows = db.insert(s.skills).values([
    { code: 'VOICE_CN',   name: '中文语音' },
    { code: 'VOICE_EN',   name: '英文语音' },
    { code: 'CHAT',       name: '在线聊天' },
    { code: 'EMAIL',      name: '邮件支持' },
    { code: 'VIP',        name: 'VIP 服务' },
    { code: 'COMPLAINT',  name: '投诉处理' },
  ]).returning().all()
  const sk = Object.fromEntries(skillRows.map(s => [s.code, s]))
  console.log(`  Skills: ${skillRows.length}`)

  // ========== 4. 班制 + 班次（4 种） ==========
  const [pMorning] = db.insert(s.shiftPatterns).values({ name: '早班', description: '06:00-14:00' }).returning().all()
  const [pMidday]  = db.insert(s.shiftPatterns).values({ name: '中班', description: '10:00-18:00' }).returning().all()
  const [pEvening] = db.insert(s.shiftPatterns).values({ name: '晚班', description: '14:00-22:00' }).returning().all()
  const [pFlex]    = db.insert(s.shiftPatterns).values({ name: '弹性班', description: '08:00-15:00' }).returning().all()

  const [shMorning] = db.insert(s.shifts).values({ patternId: pMorning.id, name: '早班 06-14', startTime: '06:00', endTime: '14:00', durationMinutes: 480 }).returning().all()
  const [shMidday]  = db.insert(s.shifts).values({ patternId: pMidday.id,  name: '中班 10-18', startTime: '10:00', endTime: '18:00', durationMinutes: 480 }).returning().all()
  const [shEvening] = db.insert(s.shifts).values({ patternId: pEvening.id, name: '晚班 14-22', startTime: '14:00', endTime: '22:00', durationMinutes: 480 }).returning().all()
  const [shFlex]    = db.insert(s.shifts).values({ patternId: pFlex.id,    name: '弹性 08-15', startTime: '08:00', endTime: '15:00', durationMinutes: 420 }).returning().all()

  // 班次活动模板（Work→Break→Work→Lunch→Work→Break→Work）
  for (const sh of [shMorning, shMidday, shEvening]) {
    db.insert(s.shiftActivities).values([
      { shiftId: sh.id, activityId: act.WORK.id,  offsetMinutes: 0,   durationMinutes: 120, sortOrder: 1 },
      { shiftId: sh.id, activityId: act.BREAK.id, offsetMinutes: 120, durationMinutes: 15,  sortOrder: 2 },
      { shiftId: sh.id, activityId: act.WORK.id,  offsetMinutes: 135, durationMinutes: 105, sortOrder: 3 },
      { shiftId: sh.id, activityId: act.LUNCH.id, offsetMinutes: 240, durationMinutes: 30,  sortOrder: 4 },
      { shiftId: sh.id, activityId: act.WORK.id,  offsetMinutes: 270, durationMinutes: 105, sortOrder: 5 },
      { shiftId: sh.id, activityId: act.BREAK.id, offsetMinutes: 375, durationMinutes: 15,  sortOrder: 6 },
      { shiftId: sh.id, activityId: act.WORK.id,  offsetMinutes: 390, durationMinutes: 90,  sortOrder: 7 },
    ]).run()
  }
  // 弹性班（无 Lunch，只有 Break）
  db.insert(s.shiftActivities).values([
    { shiftId: shFlex.id, activityId: act.WORK.id,  offsetMinutes: 0,   durationMinutes: 120, sortOrder: 1 },
    { shiftId: shFlex.id, activityId: act.BREAK.id, offsetMinutes: 120, durationMinutes: 15,  sortOrder: 2 },
    { shiftId: shFlex.id, activityId: act.WORK.id,  offsetMinutes: 135, durationMinutes: 150, sortOrder: 3 },
    { shiftId: shFlex.id, activityId: act.BREAK.id, offsetMinutes: 285, durationMinutes: 15,  sortOrder: 4 },
    { shiftId: shFlex.id, activityId: act.WORK.id,  offsetMinutes: 300, durationMinutes: 120, sortOrder: 5 },
  ]).run()
  console.log('  Shifts: 4 (Morning/Midday/Evening/Flex)')

  // ========== 5. 班次包（3 种） ==========
  const [pkgFull]    = db.insert(s.shiftPackages).values({ name: '全班次包' }).returning().all()
  const [pkgMorning] = db.insert(s.shiftPackages).values({ name: '早班包' }).returning().all()
  const [pkgFlex]    = db.insert(s.shiftPackages).values({ name: '弹性包' }).returning().all()

  db.insert(s.shiftPackageItems).values([
    { packageId: pkgFull.id,    shiftId: shMorning.id },
    { packageId: pkgFull.id,    shiftId: shMidday.id },
    { packageId: pkgFull.id,    shiftId: shEvening.id },
    { packageId: pkgMorning.id, shiftId: shMorning.id },
    { packageId: pkgFlex.id,    shiftId: shFlex.id },
  ]).run()
  console.log('  Shift packages: 3')

  // ========== 6. 合同（3 种） ==========
  const [ctFull] = db.insert(s.contracts).values({
    name: '全职 8h', minHoursDay: 6, maxHoursDay: 10, minHoursWeek: 35, maxHoursWeek: 45,
    minBreakMinutes: 15, lunchRequired: true, lunchMinMinutes: 30,
  }).returning().all()
  const [ctPart] = db.insert(s.contracts).values({
    name: '兼职 6h', minHoursDay: 4, maxHoursDay: 7, minHoursWeek: 20, maxHoursWeek: 35,
    minBreakMinutes: 10, lunchRequired: false, lunchMinMinutes: 0,
  }).returning().all()
  const [ctFlex] = db.insert(s.contracts).values({
    name: '弹性 7h', minHoursDay: 5, maxHoursDay: 8, minHoursWeek: 28, maxHoursWeek: 40,
    minBreakMinutes: 15, lunchRequired: false, lunchMinMinutes: 0,
  }).returning().all()

  db.insert(s.contractPackages).values([
    { contractId: ctFull.id, packageId: pkgFull.id },
    { contractId: ctPart.id, packageId: pkgMorning.id },
    { contractId: ctFlex.id, packageId: pkgFlex.id },
  ]).run()
  console.log('  Contracts: 3 (全职/兼职/弹性)')

  // ========== 7. 假期类型 ==========
  const ltRows = db.insert(s.leaveTypes).values([
    { code: 'ANNUAL',   name: '年假',   isPaid: true,  maxDaysYear: 15, color: '#60a5fa' },
    { code: 'SICK',     name: '病假',   isPaid: true,  maxDaysYear: 10, color: '#ef4444' },
    { code: 'PERSONAL', name: '事假',   isPaid: false, maxDaysYear: 5,  color: '#a78bfa' },
  ]).returning().all()
  const lt = Object.fromEntries(ltRows.map(l => [l.code, l]))
  console.log('  Leave types: 3')

  // ========== 8. 班组（3 个，不同约束） ==========
  const [grpAlpha] = db.insert(s.groups).values({ name: 'Team Alpha', maxStartDiffMinutes: 120, maxEndDiffMinutes: 120 }).returning().all()
  const [grpBeta]  = db.insert(s.groups).values({ name: 'Team Beta',  maxStartDiffMinutes: 240, maxEndDiffMinutes: 240 }).returning().all()
  const [grpGamma] = db.insert(s.groups).values({ name: 'Team Gamma', maxStartDiffMinutes: 60,  maxEndDiffMinutes: 60  }).returning().all()
  console.log('  Groups: 3 (Alpha/Beta/Gamma)')

  // ========== 9. 坐席（20 人） ==========
  const agentData = [
    // Team Alpha（8 人）
    { name: '张明',   employeeNo: 'E001', groupId: grpAlpha.id, contractId: ctFull.id },
    { name: '李娜',   employeeNo: 'E002', groupId: grpAlpha.id, contractId: ctFull.id },
    { name: '王磊',   employeeNo: 'E003', groupId: grpAlpha.id, contractId: ctFull.id },
    { name: '赵敏',   employeeNo: 'E004', groupId: grpAlpha.id, contractId: ctFull.id },
    { name: '陈刚',   employeeNo: 'E005', groupId: grpAlpha.id, contractId: ctFull.id },
    { name: '刘洋',   employeeNo: 'E006', groupId: grpAlpha.id, contractId: ctPart.id },
    { name: '黄芳',   employeeNo: 'E007', groupId: grpAlpha.id, contractId: ctPart.id },
    { name: '周杰',   employeeNo: 'E008', groupId: grpAlpha.id, contractId: ctFull.id },
    // Team Beta（7 人）
    { name: '吴婷',   employeeNo: 'E009', groupId: grpBeta.id,  contractId: ctFull.id },
    { name: '郑浩',   employeeNo: 'E010', groupId: grpBeta.id,  contractId: ctFull.id },
    { name: '孙丽',   employeeNo: 'E011', groupId: grpBeta.id,  contractId: ctFull.id },
    { name: '马超',   employeeNo: 'E012', groupId: grpBeta.id,  contractId: ctFull.id },
    { name: '林小红', employeeNo: 'E013', groupId: grpBeta.id,  contractId: ctPart.id },
    { name: '杨波',   employeeNo: 'E014', groupId: grpBeta.id,  contractId: ctFull.id },
    { name: '许文强', employeeNo: 'E015', groupId: grpBeta.id,  contractId: ctFull.id },
    // Team Gamma（5 人）
    { name: '高明',   employeeNo: 'E016', groupId: grpGamma.id, contractId: ctFull.id },
    { name: '方琳',   employeeNo: 'E017', groupId: grpGamma.id, contractId: ctFull.id },
    { name: '韩磊',   employeeNo: 'E018', groupId: grpGamma.id, contractId: ctFull.id },
    { name: '曹雪',   employeeNo: 'E019', groupId: grpGamma.id, contractId: ctFlex.id },
    { name: '丁伟',   employeeNo: 'E020', groupId: grpGamma.id, contractId: ctFull.id },
  ]
  const agentRows = db.insert(s.agents).values(agentData).returning().all()
  const ag = Object.fromEntries(agentRows.map(a => [a.employeeNo, a]))
  console.log(`  Agents: ${agentRows.length}`)

  // ========== 10. 技能分配（差异化） ==========
  const skillBindings = [
    // 所有人有中文语音
    ...agentRows.map(a => ({ agentId: a.id, skillId: sk.VOICE_CN.id, proficiency: 100 })),
    // 英语：李娜、郑浩、高明、周杰
    { agentId: ag.E002.id, skillId: sk.VOICE_EN.id, proficiency: 90 },
    { agentId: ag.E010.id, skillId: sk.VOICE_EN.id, proficiency: 80 },
    { agentId: ag.E016.id, skillId: sk.VOICE_EN.id, proficiency: 95 },
    { agentId: ag.E008.id, skillId: sk.VOICE_EN.id, proficiency: 85 },
    // VIP：张明、周杰、许文强、高明
    { agentId: ag.E001.id, skillId: sk.VIP.id, proficiency: 100 },
    { agentId: ag.E008.id, skillId: sk.VIP.id, proficiency: 100 },
    { agentId: ag.E015.id, skillId: sk.VIP.id, proficiency: 90 },
    { agentId: ag.E016.id, skillId: sk.VIP.id, proficiency: 100 },
    // 在线聊天：刘洋、林小红、丁伟
    { agentId: ag.E006.id, skillId: sk.CHAT.id, proficiency: 100 },
    { agentId: ag.E013.id, skillId: sk.CHAT.id, proficiency: 90 },
    { agentId: ag.E020.id, skillId: sk.CHAT.id, proficiency: 85 },
    // 邮件：黄芳、曹雪
    { agentId: ag.E007.id, skillId: sk.EMAIL.id, proficiency: 100 },
    { agentId: ag.E019.id, skillId: sk.EMAIL.id, proficiency: 90 },
    // 投诉：陈刚、马超、丁伟
    { agentId: ag.E005.id, skillId: sk.COMPLAINT.id, proficiency: 100 },
    { agentId: ag.E012.id, skillId: sk.COMPLAINT.id, proficiency: 95 },
    { agentId: ag.E020.id, skillId: sk.COMPLAINT.id, proficiency: 80 },
    // 方琳：全技能
    { agentId: ag.E017.id, skillId: sk.VOICE_EN.id, proficiency: 85 },
    { agentId: ag.E017.id, skillId: sk.CHAT.id, proficiency: 90 },
    { agentId: ag.E017.id, skillId: sk.EMAIL.id, proficiency: 80 },
    { agentId: ag.E017.id, skillId: sk.VIP.id, proficiency: 75 },
    { agentId: ag.E017.id, skillId: sk.COMPLAINT.id, proficiency: 70 },
    // 王磊：多技能
    { agentId: ag.E003.id, skillId: sk.VOICE_EN.id, proficiency: 70 },
    { agentId: ag.E003.id, skillId: sk.CHAT.id, proficiency: 80 },
    // 孙丽：多技能
    { agentId: ag.E011.id, skillId: sk.CHAT.id, proficiency: 85 },
    { agentId: ag.E011.id, skillId: sk.COMPLAINT.id, proficiency: 75 },
  ]
  db.insert(s.agentSkills).values(skillBindings).run()
  console.log(`  Agent skills: ${skillBindings.length}`)

  // ========== 11. 休假申请 ==========
  db.insert(s.leaves).values([
    // 张明：3/22 年假（预排，已审批）
    { agentId: ag.E001.id, leaveTypeId: lt.ANNUAL.id, startTime: '2026-03-22T00:00:00Z', endTime: '2026-03-22T23:59:59Z', isFullDay: true, status: 'approved', isPrePlanned: true },
    // 王磊：3/21 全天病假（预排，已审批） — US5 场景
    { agentId: ag.E003.id, leaveTypeId: lt.SICK.id, startTime: '2026-03-21T00:00:00Z', endTime: '2026-03-21T23:59:59Z', isFullDay: true, status: 'approved', isPrePlanned: true },
    // 赵敏：3/20 下午半天事假（临时，已审批） — US6 场景
    { agentId: ag.E004.id, leaveTypeId: lt.PERSONAL.id, startTime: '2026-03-20T04:00:00Z', endTime: '2026-03-20T08:00:00Z', isFullDay: false, status: 'approved', isPrePlanned: false },
    // 马超：3/24 事假（预排，待审批 → 不应参与排班）
    { agentId: ag.E012.id, leaveTypeId: lt.PERSONAL.id, startTime: '2026-03-24T00:00:00Z', endTime: '2026-03-24T23:59:59Z', isFullDay: true, status: 'pending', isPrePlanned: true },
  ]).run()
  console.log('  Leaves: 4 (2 approved pre-planned, 1 approved temp, 1 pending)')

  // ========== 12. 例外安排 ==========
  db.insert(s.exceptions).values([
    // 周杰：3/23 上午培训 — US12 场景
    { agentId: ag.E008.id, activityId: act.TRAINING.id, startTime: '2026-03-23T02:00:00Z', endTime: '2026-03-23T04:00:00Z', note: '新系统培训' },
  ]).run()
  console.log('  Exceptions: 1')

  // ========== 13. 规则定义 ==========
  const ruleDefs = db.insert(s.ruleDefinitions).values([
    { code: 'LEAVE_FILTER',          name: '休假过滤',        category: 'plan',     stage: 'generate',     scopeType: 'global',   severityDefault: 'info' },
    { code: 'CONTRACT_SHIFT_AVAIL',  name: '合同班次可用性',  category: 'contract', stage: 'generate',     scopeType: 'contract', severityDefault: 'error' },
    { code: 'STAFFING_MINIMUM',      name: '最低人数',        category: 'staffing', stage: 'generate',     scopeType: 'plan',     severityDefault: 'warning' },
    { code: 'SNAP_ALIGNMENT',        name: '时间吸附',        category: 'activity', stage: 'edit_preview', scopeType: 'global',   severityDefault: 'info' },
    { code: 'MIN_DURATION',          name: '最小时长',        category: 'activity', stage: 'edit_preview', scopeType: 'global',   severityDefault: 'error', paramSchema: '{"minMinutes":15}' },
    { code: 'SHIFT_BOUNDARY',        name: '班次边界',        category: 'activity', stage: 'edit_preview', scopeType: 'global',   severityDefault: 'error' },
    { code: 'ACTIVITY_COVER',        name: '活动覆盖规则',    category: 'activity', stage: 'edit_preview', scopeType: 'activity', severityDefault: 'error' },
    { code: 'CONTRACT_DAILY_HOURS',  name: '合同日工时',      category: 'contract', stage: 'edit_commit',  scopeType: 'contract', severityDefault: 'error' },
    { code: 'MEAL_REQUIRED',         name: '午餐必须',        category: 'contract', stage: 'edit_commit',  scopeType: 'contract', severityDefault: 'warning' },
    { code: 'MIN_BREAK',             name: '最小休息',        category: 'contract', stage: 'edit_commit',  scopeType: 'contract', severityDefault: 'warning' },
    { code: 'GROUP_SYNC',            name: '班组同步',        category: 'group',    stage: 'edit_commit',  scopeType: 'group',    severityDefault: 'warning' },
    { code: 'STAFFING_COVERAGE',     name: '覆盖率校验',      category: 'staffing', stage: 'edit_commit',  scopeType: 'plan',     severityDefault: 'error' },
    { code: 'WEEK_HOURS',            name: '周工时检查',      category: 'contract', stage: 'publish',      scopeType: 'contract', severityDefault: 'error' },
  ]).returning().all()
  console.log(`  Rule definitions: ${ruleDefs.length}`)

  // ========== 14. 规则绑定 + 编排 ==========
  const bindings = db.insert(s.ruleBindings).values(
    ruleDefs.map(rd => ({ definitionId: rd.id, scopeType: rd.scopeType, scopeId: null, priority: 100, enabled: true, params: null })),
  ).returning().all()

  const stages = ['generate', 'edit_preview', 'edit_commit', 'publish']
  let chainCount = 0
  for (const stage of stages) {
    const stageBindings = bindings.filter((_, i) => ruleDefs[i].stage === stage)
    stageBindings.forEach((b, order) => {
      db.insert(s.ruleChains).values({ stage, executionOrder: order + 1, bindingId: b.id, stopOnError: stage === 'publish' }).run()
      chainCount++
    })
  }
  console.log(`  Rule bindings: ${bindings.length}, chains: ${chainCount}`)

  console.log('Seed complete!')
}

seed()
