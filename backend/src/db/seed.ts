/**
 * seed.ts — 完整种子数据（28 张表）
 * 运行：bun src/db/seed.ts
 */

import { db } from './index'
import * as s from './schema'

function seed() {
  console.log('Seeding database...')

  // 按外键依赖倒序清空
  const tables = [
    s.publishLogs, s.validationResults, s.changeItems, s.changeOperations,
    s.ruleChains, s.ruleBindings, s.ruleDefinitions,
    s.planVersions, s.staffingRequirements, s.scheduleBlocks, s.scheduleEntries, s.schedulePlans,
    s.exceptions, s.leaves, s.leaveTypes, s.agentSkills, s.agents, s.groups, s.skills,
    s.activityCoverRules, s.contractPackages, s.contracts,
    s.shiftPackageItems, s.shiftPackages, s.shiftActivities, s.shifts, s.shiftPatterns, s.activities,
  ]
  for (const t of tables) db.delete(t).run()

  // ========== 1. 活动类型 ==========
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
  ]).run()
  console.log('  Cover rules: 9')

  // ========== 3. 技能 ==========
  const skillRows = db.insert(s.skills).values([
    { code: 'VOICE_CN',   name: 'Voice - Mandarin' },
    { code: 'VOICE_EN',   name: 'Voice - English' },
    { code: 'CHAT',       name: 'Online Chat' },
    { code: 'EMAIL',      name: 'Email Support' },
    { code: 'VIP',        name: 'VIP Service' },
    { code: 'COMPLAINT',  name: 'Complaint Handling' },
  ]).returning().all()
  const skill = Object.fromEntries(skillRows.map(sk => [sk.code, sk]))
  console.log(`  Skills: ${skillRows.length}`)

  // ========== 4. 班制 + 班次 ==========
  const [pMorning] = db.insert(s.shiftPatterns).values({ name: 'Morning Shift', description: '早班 06:00-14:00' }).returning().all()
  const [pMidday]  = db.insert(s.shiftPatterns).values({ name: 'Midday Shift',  description: '中班 10:00-18:00' }).returning().all()
  const [pEvening] = db.insert(s.shiftPatterns).values({ name: 'Evening Shift', description: '晚班 14:00-22:00' }).returning().all()

  const [shMorning] = db.insert(s.shifts).values({ patternId: pMorning.id, name: 'Morning 06-14', startTime: '06:00', endTime: '14:00', durationMinutes: 480 }).returning().all()
  const [shMidday]  = db.insert(s.shifts).values({ patternId: pMidday.id,  name: 'Midday 10-18',  startTime: '10:00', endTime: '18:00', durationMinutes: 480 }).returning().all()
  const [shEvening] = db.insert(s.shifts).values({ patternId: pEvening.id, name: 'Evening 14-22', startTime: '14:00', endTime: '22:00', durationMinutes: 480 }).returning().all()

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
  console.log('  Shifts: 3 (with activity templates)')

  // ========== 5. 班次包 ==========
  const [fullPkg]    = db.insert(s.shiftPackages).values({ name: 'Full-time Package' }).returning().all()
  const [morningPkg] = db.insert(s.shiftPackages).values({ name: 'Morning-only Package' }).returning().all()

  db.insert(s.shiftPackageItems).values([
    { packageId: fullPkg.id,    shiftId: shMorning.id },
    { packageId: fullPkg.id,    shiftId: shMidday.id },
    { packageId: fullPkg.id,    shiftId: shEvening.id },
    { packageId: morningPkg.id, shiftId: shMorning.id },
  ]).run()
  console.log('  Shift packages: 2')

  // ========== 6. 合同 ==========
  const [fullContract] = db.insert(s.contracts).values({
    name: 'Full-time 8h', minHoursDay: 6, maxHoursDay: 10, minHoursWeek: 35, maxHoursWeek: 45,
    minBreakMinutes: 15, lunchRequired: true, lunchMinMinutes: 30,
  }).returning().all()
  const [partContract] = db.insert(s.contracts).values({
    name: 'Part-time 6h', minHoursDay: 4, maxHoursDay: 7, minHoursWeek: 20, maxHoursWeek: 35,
    minBreakMinutes: 10, lunchRequired: false, lunchMinMinutes: 0,
  }).returning().all()

  db.insert(s.contractPackages).values([
    { contractId: fullContract.id, packageId: fullPkg.id },
    { contractId: partContract.id, packageId: morningPkg.id },
  ]).run()
  console.log('  Contracts: 2')

  // ========== 7. 假期类型 ==========
  db.insert(s.leaveTypes).values([
    { code: 'ANNUAL',   name: 'Annual Leave',   isPaid: true,  maxDaysYear: 15, color: '#60a5fa' },
    { code: 'SICK',     name: 'Sick Leave',      isPaid: true,  maxDaysYear: 10, color: '#ef4444' },
    { code: 'PERSONAL', name: 'Personal Leave',  isPaid: false, maxDaysYear: 5,  color: '#a78bfa' },
  ]).run()
  console.log('  Leave types: 3')

  // ========== 8. 班组 ==========
  const [groupA] = db.insert(s.groups).values({ name: 'Team Alpha', maxStartDiffMinutes: 30, maxEndDiffMinutes: 30 }).returning().all()
  const [groupB] = db.insert(s.groups).values({ name: 'Team Beta',  maxStartDiffMinutes: 60, maxEndDiffMinutes: 60 }).returning().all()
  console.log('  Groups: 2')

  // ========== 9. 员工 ==========
  const agentData = [
    { name: 'George Gray',      employeeNo: 'E001', groupId: groupA.id, contractId: fullContract.id },
    { name: 'Katie Printy',     employeeNo: 'E002', groupId: groupA.id, contractId: fullContract.id },
    { name: 'Don Davidson',     employeeNo: 'E003', groupId: groupA.id, contractId: fullContract.id },
    { name: 'Dayaram Devdas',   employeeNo: 'E004', groupId: groupA.id, contractId: fullContract.id },
    { name: 'Phillip Gonzalez', employeeNo: 'E005', groupId: groupA.id, contractId: fullContract.id },
    { name: 'Patricia Cook',    employeeNo: 'E006', groupId: groupB.id, contractId: fullContract.id },
    { name: 'Dave Donaldson',   employeeNo: 'E007', groupId: groupB.id, contractId: fullContract.id },
    { name: 'Fran Fredrickson', employeeNo: 'E008', groupId: groupB.id, contractId: fullContract.id },
    { name: 'Stephen Conant',   employeeNo: 'E009', groupId: groupB.id, contractId: fullContract.id },
    { name: 'Abigail Gill',    employeeNo: 'E010', groupId: groupB.id, contractId: fullContract.id },
    { name: 'Alex Altherr',    employeeNo: 'E011', groupId: groupA.id, contractId: partContract.id },
    { name: 'Siska Charles',   employeeNo: 'E012', groupId: groupA.id, contractId: partContract.id },
    { name: 'Aaron Abel',      employeeNo: 'E013', groupId: groupB.id, contractId: fullContract.id },
    { name: 'Maria Santos',    employeeNo: 'E014', groupId: groupB.id, contractId: fullContract.id },
    { name: 'James Wilson',    employeeNo: 'E015', groupId: groupA.id, contractId: fullContract.id },
  ]
  const agentRows = db.insert(s.agents).values(agentData).returning().all()
  console.log(`  Agents: ${agentRows.length}`)

  // ========== 10. 员工技能 ==========
  const skillAssignments: { agentId: number; skillId: number; proficiency: number }[] = []
  for (const ag of agentRows) {
    // 所有人都有中文语音
    skillAssignments.push({ agentId: ag.id, skillId: skill.VOICE_CN.id, proficiency: 100 })
    // 前 5 个有英文语音
    if (ag.id <= agentRows[4].id) {
      skillAssignments.push({ agentId: ag.id, skillId: skill.VOICE_EN.id, proficiency: 80 })
    }
    // 偶数有在线聊天
    if (ag.id % 2 === 0) {
      skillAssignments.push({ agentId: ag.id, skillId: skill.CHAT.id, proficiency: 90 })
    }
    // 前 3 个有 VIP
    if (ag.id <= agentRows[2].id) {
      skillAssignments.push({ agentId: ag.id, skillId: skill.VIP.id, proficiency: 100 })
    }
  }
  db.insert(s.agentSkills).values(skillAssignments).run()
  console.log(`  Agent skills: ${skillAssignments.length}`)

  // ========== 11. 规则定义（12 条，覆盖 4 阶段） ==========
  const ruleDefs = db.insert(s.ruleDefinitions).values([
    // generate 阶段
    { code: 'LEAVE_FILTER',          name: 'Leave Filter',              category: 'plan',     stage: 'generate',     scopeType: 'global', severityDefault: 'info' },
    { code: 'CONTRACT_SHIFT_AVAIL',  name: 'Contract Shift Availability', category: 'contract', stage: 'generate',  scopeType: 'contract', severityDefault: 'error' },
    { code: 'STAFFING_MINIMUM',      name: 'Staffing Minimum',          category: 'staffing', stage: 'generate',     scopeType: 'plan',   severityDefault: 'warning' },
    // edit_preview 阶段
    { code: 'SNAP_ALIGNMENT',        name: 'Snap Alignment',            category: 'activity', stage: 'edit_preview', scopeType: 'global', severityDefault: 'info' },
    { code: 'MIN_DURATION',          name: 'Minimum Duration',          category: 'activity', stage: 'edit_preview', scopeType: 'global', severityDefault: 'error', paramSchema: '{"minMinutes":15}' },
    { code: 'SHIFT_BOUNDARY',        name: 'Shift Boundary',            category: 'activity', stage: 'edit_preview', scopeType: 'global', severityDefault: 'error' },
    { code: 'ACTIVITY_COVER',        name: 'Activity Cover Rule',       category: 'activity', stage: 'edit_preview', scopeType: 'activity', severityDefault: 'error' },
    // edit_commit 阶段
    { code: 'CONTRACT_DAILY_HOURS',  name: 'Contract Daily Hours',      category: 'contract', stage: 'edit_commit',  scopeType: 'contract', severityDefault: 'error' },
    { code: 'MEAL_REQUIRED',         name: 'Meal Required',             category: 'contract', stage: 'edit_commit',  scopeType: 'contract', severityDefault: 'warning' },
    { code: 'MIN_BREAK',             name: 'Minimum Break',             category: 'contract', stage: 'edit_commit',  scopeType: 'contract', severityDefault: 'warning' },
    { code: 'GROUP_SYNC',            name: 'Group Sync',                category: 'group',    stage: 'edit_commit',  scopeType: 'group',  severityDefault: 'warning' },
    // publish 阶段
    { code: 'WEEK_HOURS',            name: 'Weekly Hours Check',        category: 'contract', stage: 'publish',      scopeType: 'contract', severityDefault: 'error' },
  ]).returning().all()
  const ruleDef = Object.fromEntries(ruleDefs.map(r => [r.code, r]))
  console.log(`  Rule definitions: ${ruleDefs.length}`)

  // ========== 12. 规则绑定（全部默认启用） ==========
  const bindings = db.insert(s.ruleBindings).values(
    ruleDefs.map(rd => ({
      definitionId: rd.id,
      scopeType: rd.scopeType,
      scopeId: null,
      priority: 100,
      enabled: true,
      params: null,
    })),
  ).returning().all()
  console.log(`  Rule bindings: ${bindings.length}`)

  // ========== 13. 规则链（按阶段编排） ==========
  const stages = ['generate', 'edit_preview', 'edit_commit', 'publish']
  let chainCount = 0
  for (const stage of stages) {
    const stageBindings = bindings.filter((b, i) => ruleDefs[i].stage === stage)
    stageBindings.forEach((b, order) => {
      db.insert(s.ruleChains).values({
        stage,
        executionOrder: order + 1,
        bindingId: b.id,
        stopOnError: stage === 'publish',
      }).run()
      chainCount++
    })
  }
  console.log(`  Rule chains: ${chainCount}`)

  console.log('Seed complete! (28 tables)')
}

seed()
