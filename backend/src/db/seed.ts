/**
 * seed.ts — 种子数据
 *
 * 运行方式：bun src/db/seed.ts
 * 会清空所有表并重新插入示例数据
 */

import { db } from './index'
import * as s from './schema'
import { sql } from 'drizzle-orm'

async function seed() {
  console.log('Seeding database...')

  // 清空所有表（按外键依赖顺序倒序删）
  const tables = [
    s.validationResults, s.scheduleChanges, s.staffingRequirements,
    s.scheduleBlocks, s.scheduleEntries, s.schedulePlans,
    s.exceptions, s.leaves, s.agents, s.groups,
    s.activityCoverRules, s.contractPackages, s.contracts,
    s.shiftPackageItems, s.shiftPackages, s.shiftActivities,
    s.shifts, s.shiftPatterns, s.activities,
  ]
  for (const table of tables) {
    db.delete(table).run()
  }

  // ========== 1. 活动类型 ==========
  const [work, brk, lunch, meeting, training, offline, sickLeave, dayOff] = db.insert(s.activities).values([
    { name: 'Work',       color: '#4ade80', priority: 10, isPaid: true,  isCoverable: true,  canCover: false, icon: 'phone' },
    { name: 'Break',      color: '#facc15', priority: 20, isPaid: true,  isCoverable: false, canCover: true,  icon: 'coffee' },
    { name: 'Lunch',      color: '#fb923c', priority: 30, isPaid: false, isCoverable: false, canCover: true,  icon: 'utensils' },
    { name: 'Meeting',    color: '#3b82f6', priority: 40, isPaid: true,  isCoverable: true,  canCover: true,  icon: 'users' },
    { name: 'Training',   color: '#818cf8', priority: 40, isPaid: true,  isCoverable: true,  canCover: true,  icon: 'book' },
    { name: 'Offline',    color: '#f97316', priority: 15, isPaid: true,  isCoverable: true,  canCover: true,  icon: 'monitor' },
    { name: 'Sick Leave', color: '#ef4444', priority: 90, isPaid: true,  isCoverable: false, canCover: true,  icon: 'heart' },
    { name: 'Day Off',    color: '#9ca3af', priority: 99, isPaid: false, isCoverable: false, canCover: true,  icon: 'calendar-off' },
  ]).returning().all()

  console.log(`  Activities: ${[work, brk, lunch, meeting, training, offline, sickLeave, dayOff].length}`)

  // ========== 2. 活动覆盖规则 ==========
  // Meeting/Training 可以覆盖 Work
  // Sick Leave 可以覆盖一切（除了 Day Off）
  // Break/Lunch 不能被普通活动覆盖
  db.insert(s.activityCoverRules).values([
    { sourceActivityId: meeting.id,   targetActivityId: work.id,    canCover: true },
    { sourceActivityId: training.id,  targetActivityId: work.id,    canCover: true },
    { sourceActivityId: offline.id,   targetActivityId: work.id,    canCover: true },
    { sourceActivityId: sickLeave.id, targetActivityId: work.id,    canCover: true },
    { sourceActivityId: sickLeave.id, targetActivityId: brk.id,     canCover: true },
    { sourceActivityId: sickLeave.id, targetActivityId: lunch.id,   canCover: true },
    { sourceActivityId: sickLeave.id, targetActivityId: meeting.id, canCover: true },
    { sourceActivityId: sickLeave.id, targetActivityId: training.id,canCover: true },
    { sourceActivityId: sickLeave.id, targetActivityId: offline.id, canCover: true },
  ]).run()
  console.log('  Cover rules: 9')

  // ========== 3. 班制模板 + 班次 ==========
  const [morningPattern] = db.insert(s.shiftPatterns).values([
    { name: 'Morning Shift',  description: '早班 06:00-14:00' },
  ]).returning().all()

  const [middayPattern] = db.insert(s.shiftPatterns).values([
    { name: 'Midday Shift',   description: '中班 10:00-18:00' },
  ]).returning().all()

  const [eveningPattern] = db.insert(s.shiftPatterns).values([
    { name: 'Evening Shift',  description: '晚班 14:00-22:00' },
  ]).returning().all()

  // 创建具体班次
  const [shiftMorning] = db.insert(s.shifts).values([
    { patternId: morningPattern.id, name: 'Morning 06-14', startTime: '06:00', endTime: '14:00', durationMinutes: 480 },
  ]).returning().all()

  const [shiftMidday] = db.insert(s.shifts).values([
    { patternId: middayPattern.id, name: 'Midday 10-18', startTime: '10:00', endTime: '18:00', durationMinutes: 480 },
  ]).returning().all()

  const [shiftEvening] = db.insert(s.shifts).values([
    { patternId: eveningPattern.id, name: 'Evening 14-22', startTime: '14:00', endTime: '22:00', durationMinutes: 480 },
  ]).returning().all()

  // 班次内活动片段（以早班为例：Work→Break→Work→Lunch→Work→Break→Work）
  db.insert(s.shiftActivities).values([
    { shiftId: shiftMorning.id, activityId: work.id,  offsetMinutes: 0,   durationMinutes: 120, sortOrder: 1 },
    { shiftId: shiftMorning.id, activityId: brk.id,   offsetMinutes: 120, durationMinutes: 15,  sortOrder: 2 },
    { shiftId: shiftMorning.id, activityId: work.id,  offsetMinutes: 135, durationMinutes: 105, sortOrder: 3 },
    { shiftId: shiftMorning.id, activityId: lunch.id, offsetMinutes: 240, durationMinutes: 30,  sortOrder: 4 },
    { shiftId: shiftMorning.id, activityId: work.id,  offsetMinutes: 270, durationMinutes: 105, sortOrder: 5 },
    { shiftId: shiftMorning.id, activityId: brk.id,   offsetMinutes: 375, durationMinutes: 15,  sortOrder: 6 },
    { shiftId: shiftMorning.id, activityId: work.id,  offsetMinutes: 390, durationMinutes: 90,  sortOrder: 7 },
  ]).run()

  db.insert(s.shiftActivities).values([
    { shiftId: shiftMidday.id, activityId: work.id,  offsetMinutes: 0,   durationMinutes: 120, sortOrder: 1 },
    { shiftId: shiftMidday.id, activityId: brk.id,   offsetMinutes: 120, durationMinutes: 15,  sortOrder: 2 },
    { shiftId: shiftMidday.id, activityId: work.id,  offsetMinutes: 135, durationMinutes: 105, sortOrder: 3 },
    { shiftId: shiftMidday.id, activityId: lunch.id, offsetMinutes: 240, durationMinutes: 30,  sortOrder: 4 },
    { shiftId: shiftMidday.id, activityId: work.id,  offsetMinutes: 270, durationMinutes: 105, sortOrder: 5 },
    { shiftId: shiftMidday.id, activityId: brk.id,   offsetMinutes: 375, durationMinutes: 15,  sortOrder: 6 },
    { shiftId: shiftMidday.id, activityId: work.id,  offsetMinutes: 390, durationMinutes: 90,  sortOrder: 7 },
  ]).run()

  db.insert(s.shiftActivities).values([
    { shiftId: shiftEvening.id, activityId: work.id,  offsetMinutes: 0,   durationMinutes: 120, sortOrder: 1 },
    { shiftId: shiftEvening.id, activityId: brk.id,   offsetMinutes: 120, durationMinutes: 15,  sortOrder: 2 },
    { shiftId: shiftEvening.id, activityId: work.id,  offsetMinutes: 135, durationMinutes: 105, sortOrder: 3 },
    { shiftId: shiftEvening.id, activityId: lunch.id, offsetMinutes: 240, durationMinutes: 30,  sortOrder: 4 },
    { shiftId: shiftEvening.id, activityId: work.id,  offsetMinutes: 270, durationMinutes: 105, sortOrder: 5 },
    { shiftId: shiftEvening.id, activityId: brk.id,   offsetMinutes: 375, durationMinutes: 15,  sortOrder: 6 },
    { shiftId: shiftEvening.id, activityId: work.id,  offsetMinutes: 390, durationMinutes: 90,  sortOrder: 7 },
  ]).run()
  console.log('  Shifts: 3 (with activity templates)')

  // ========== 4. 班次包 ==========
  const [fullPkg] = db.insert(s.shiftPackages).values([
    { name: 'Full-time Package' },
  ]).returning().all()

  const [morningPkg] = db.insert(s.shiftPackages).values([
    { name: 'Morning-only Package' },
  ]).returning().all()

  db.insert(s.shiftPackageItems).values([
    { packageId: fullPkg.id, shiftId: shiftMorning.id },
    { packageId: fullPkg.id, shiftId: shiftMidday.id },
    { packageId: fullPkg.id, shiftId: shiftEvening.id },
    { packageId: morningPkg.id, shiftId: shiftMorning.id },
  ]).run()
  console.log('  Shift packages: 2')

  // ========== 5. 合同 ==========
  const [fullTimeContract] = db.insert(s.contracts).values([
    { name: 'Full-time 8h', minHoursDay: 6, maxHoursDay: 10, minHoursWeek: 35, maxHoursWeek: 45, minBreakMinutes: 15, lunchRequired: true, lunchMinMinutes: 30 },
  ]).returning().all()

  const [partTimeContract] = db.insert(s.contracts).values([
    { name: 'Part-time 6h', minHoursDay: 4, maxHoursDay: 7, minHoursWeek: 20, maxHoursWeek: 35, minBreakMinutes: 10, lunchRequired: false, lunchMinMinutes: 0 },
  ]).returning().all()

  db.insert(s.contractPackages).values([
    { contractId: fullTimeContract.id, packageId: fullPkg.id },
    { contractId: partTimeContract.id, packageId: morningPkg.id },
  ]).run()
  console.log('  Contracts: 2')

  // ========== 6. 班组 ==========
  const [groupA] = db.insert(s.groups).values([
    { name: 'Team Alpha', maxStartDiffMinutes: 30, maxEndDiffMinutes: 30 },
  ]).returning().all()

  const [groupB] = db.insert(s.groups).values([
    { name: 'Team Beta', maxStartDiffMinutes: 60, maxEndDiffMinutes: 60 },
  ]).returning().all()
  console.log('  Groups: 2')

  // ========== 7. 员工 ==========
  const agentData = [
    { name: 'George Gray',      employeeNo: 'E001', groupId: groupA.id, contractId: fullTimeContract.id },
    { name: 'Katie Printy',     employeeNo: 'E002', groupId: groupA.id, contractId: fullTimeContract.id },
    { name: 'Don Davidson',     employeeNo: 'E003', groupId: groupA.id, contractId: fullTimeContract.id },
    { name: 'Dayaram Devdas',   employeeNo: 'E004', groupId: groupA.id, contractId: fullTimeContract.id },
    { name: 'Phillip Gonzalez', employeeNo: 'E005', groupId: groupA.id, contractId: fullTimeContract.id },
    { name: 'Patricia Cook',    employeeNo: 'E006', groupId: groupB.id, contractId: fullTimeContract.id },
    { name: 'Dave Donaldson',   employeeNo: 'E007', groupId: groupB.id, contractId: fullTimeContract.id },
    { name: 'Fran Fredrickson', employeeNo: 'E008', groupId: groupB.id, contractId: fullTimeContract.id },
    { name: 'Stephen Conant',   employeeNo: 'E009', groupId: groupB.id, contractId: fullTimeContract.id },
    { name: 'Abigail Gill',    employeeNo: 'E010', groupId: groupB.id, contractId: fullTimeContract.id },
    { name: 'Alex Altherr',    employeeNo: 'E011', groupId: groupA.id, contractId: partTimeContract.id },
    { name: 'Siska Charles',   employeeNo: 'E012', groupId: groupA.id, contractId: partTimeContract.id },
    { name: 'Aaron Abel',      employeeNo: 'E013', groupId: groupB.id, contractId: fullTimeContract.id },
    { name: 'Maria Santos',    employeeNo: 'E014', groupId: groupB.id, contractId: fullTimeContract.id },
    { name: 'James Wilson',    employeeNo: 'E015', groupId: groupA.id, contractId: fullTimeContract.id },
  ]
  db.insert(s.agents).values(agentData).run()
  console.log(`  Agents: ${agentData.length}`)

  console.log('Seed complete!')
}

seed().catch(console.error)
