/**
 * mock-data.ts — 模拟排班数据
 *
 * 注意：只定义坐席和"非工作活动"。
 * Work 块由 deriveDisplayBlocks() 自动填充，不需要在这里定义。
 *
 * 每个坐席有 shiftStart/shiftEnd 定义班次范围，
 * 活动块只需落在班次范围内即可。
 */

import dayjs from 'dayjs'
import type { Agent, Activity } from './types'

const today = dayjs().startOf('day')

/** 辅助函数：快速生成 ISO 时间字符串，支持跨天（hour >= 24） */
function t(hour: number, minute = 0) {
  if (hour >= 24) return today.add(1, 'day').add(hour - 24, 'hour').add(minute, 'minute').toISOString()
  return today.add(hour, 'hour').add(minute, 'minute').toISOString()
}

let actId = 1
/** 辅助函数：快速创建一个活动对象 */
function act(agentId: string, type: Activity['type'], sh: number, sm: number, eh: number, em: number): Activity {
  return { id: `act${actId++}`, agentId, type, start: t(sh, sm), end: t(eh, em) }
}

// ========== 坐席列表 ==========
export const agents: Agent[] = [
  { id: 'a1',  name: 'George Gray',      shift: 'MD', shiftStart: t(4, 0),  shiftEnd: t(12, 0),  icons: ['headset'] },
  { id: 'a2',  name: 'Katie Printy',     shift: 'MD', shiftStart: t(4, 0),  shiftEnd: t(12, 0),  icons: ['headset'] },
  { id: 'a3',  name: 'Don Davidson',     shift: 'MD', shiftStart: t(4, 0),  shiftEnd: t(12, 0),  icons: ['headset', 'phone', 'monitor'] },
  { id: 'a4',  name: 'Dayaram Devdas',   shift: 'AM', shiftStart: t(5, 0),  shiftEnd: t(13, 30) },
  { id: 'a5',  name: 'Phillip Gonzalez', shift: 'AM', shiftStart: t(4, 30), shiftEnd: t(14, 0) },
  { id: 'a6',  name: 'Patricia Cook',    shift: 'AM', shiftStart: t(4, 0),  shiftEnd: t(13, 0) },
  { id: 'a7',  name: 'Dave Donaldson',   shift: 'MD', shiftStart: t(5, 0),  shiftEnd: t(13, 30), icons: ['headset'] },
  { id: 'a8',  name: 'Fran Fredrickson', shift: 'MD', shiftStart: t(5, 0),  shiftEnd: t(13, 0),  icons: ['headset'] },
  { id: 'a9',  name: 'Stephen Conant',   shift: 'AM', shiftStart: t(4, 30), shiftEnd: t(12, 15) },
  { id: 'a10', name: 'Abigail Gill',     shift: 'AM', shiftStart: t(4, 0),  shiftEnd: t(12, 0) },
  { id: 'a11', name: 'Alex Altherr',     shift: 'MD', shiftStart: t(5, 0),  shiftEnd: t(15, 0) },
  { id: 'a12', name: 'Siska Charles',    shift: 'MD', shiftStart: t(5, 30), shiftEnd: t(11, 15) },
  { id: 'a13', name: 'Aaron Abel',       shift: 'MD', shiftStart: t(5, 0),  shiftEnd: t(15, 0),  icons: ['headset'] },
  { id: 'a14', name: 'Maria Santos',     shift: 'AM', shiftStart: t(4, 0),  shiftEnd: t(12, 0) },
  { id: 'a15', name: 'James Wilson',     shift: 'MD', shiftStart: t(5, 0),  shiftEnd: t(13, 0) },
]

// ========== 活动列表（只定义非 Work 活动） ==========
export const activities: Activity[] = [
  // George Gray — 2 个休息
  act('a1', 'break', 7, 0, 7, 30),
  act('a1', 'break', 10, 0, 10, 15),

  // Katie Printy — 1 个休息 + 1 个会议
  act('a2', 'break', 7, 0, 7, 30),
  act('a2', 'meeting', 11, 0, 12, 0),

  // Don Davidson — 1 个离线 + 1 个休息 + 1 个培训
  act('a3', 'offline', 5, 30, 6, 30),
  act('a3', 'break', 8, 0, 8, 30),
  act('a3', 'training', 10, 0, 11, 0),

  // Dayaram Devdas
  act('a4', 'break', 7, 0, 7, 30),
  act('a4', 'offline', 10, 0, 11, 0),

  // Phillip Gonzalez
  act('a5', 'offline', 6, 0, 7, 0),
  act('a5', 'break', 9, 0, 9, 30),
  act('a5', 'training', 11, 0, 12, 0),

  // Patricia Cook — 较多活动
  act('a6', 'meeting', 6, 0, 7, 0),
  act('a6', 'break', 8, 0, 8, 15),
  act('a6', 'training', 8, 15, 9, 0),
  act('a6', 'break', 10, 0, 10, 15),

  // Dave Donaldson
  act('a7', 'offline', 7, 0, 8, 0),
  act('a7', 'meeting', 10, 0, 11, 0),

  // Fran Fredrickson
  act('a8', 'offline', 7, 0, 8, 0),
  act('a8', 'break', 10, 0, 10, 30),

  // Stephen Conant
  act('a9', 'break', 7, 0, 7, 15),
  act('a9', 'offline', 9, 0, 9, 30),

  // Abigail Gill
  act('a10', 'meeting', 6, 0, 6, 30),
  act('a10', 'break', 8, 0, 8, 15),
  act('a10', 'training', 8, 15, 9, 0),

  // Alex Altherr — 活动最多的坐席
  act('a11', 'offline', 6, 30, 7, 30),
  act('a11', 'break', 9, 0, 9, 30),
  act('a11', 'training', 9, 30, 10, 30),
  act('a11', 'offline', 12, 0, 13, 0),
  act('a11', 'meeting', 13, 0, 14, 0),

  // Siska Charles
  act('a12', 'offline', 7, 0, 8, 0),
  act('a12', 'break', 9, 0, 9, 30),

  // Aaron Abel
  act('a13', 'break', 7, 0, 7, 30),
  act('a13', 'offline', 10, 0, 10, 30),
  act('a13', 'meeting', 14, 0, 15, 0),

  // Maria Santos
  act('a14', 'break', 6, 0, 6, 30),
  act('a14', 'training', 9, 0, 10, 0),

  // James Wilson
  act('a15', 'offline', 7, 0, 8, 0),
  act('a15', 'break', 10, 0, 10, 30),
]
