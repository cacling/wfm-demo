/**
 * api.ts — 后端 API 客户端（Phase 3: EditIntent 支持）
 */

const BASE = 'http://localhost:3210/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  return res.json()
}

export interface EditIntentCommand {
  intentType: string
  assignmentId: number
  blockId?: number
  activityId?: number
  leaveTypeId?: number
  targetRange?: { startTime: string; endTime: string }
  versionNo: number
  confirmWarnings?: boolean
}

export const api = {
  // 排班方案
  getPlans: () => request<any[]>('/plans'),
  createPlan: (data: any) => request<any>('/plans', { method: 'POST', body: JSON.stringify(data) }),
  generatePlan: (planId: number) => request<any>(`/plans/${planId}/generate`, { method: 'POST' }),
  getTimeline: (planId: number, date: string) => request<any>(`/plans/${planId}/timeline?date=${date}`),

  // 活动类型
  getActivities: () => request<any[]>('/activities'),

  // EditIntent API（Phase 3）
  previewEdit: (planId: number, cmd: EditIntentCommand) =>
    request<any>(`/plans/${planId}/changes/preview`, { method: 'POST', body: JSON.stringify(cmd) }),

  commitEdit: (planId: number, cmd: EditIntentCommand) =>
    request<any>(`/plans/${planId}/changes/commit`, { method: 'POST', body: JSON.stringify(cmd) }),

  confirmEdit: (planId: number, opId: number, cmd: EditIntentCommand) =>
    request<any>(`/plans/${planId}/changes/${opId}/confirm`, { method: 'POST', body: JSON.stringify(cmd) }),

  // 旧的块编辑 API（保留兼容）
  updateBlock: (planId: number, blockId: number, data: any) =>
    request<any>(`/plans/${planId}/blocks/${blockId}`, { method: 'PUT', body: JSON.stringify(data) }),
  addBlock: (planId: number, data: any) =>
    request<any>(`/plans/${planId}/blocks`, { method: 'POST', body: JSON.stringify(data) }),
  deleteBlock: (planId: number, blockId: number) =>
    request<any>(`/plans/${planId}/blocks/${blockId}`, { method: 'DELETE' }),

  // 校验
  validatePlan: (planId: number, date: string) =>
    request<any>(`/plans/${planId}/validate`, { method: 'POST', body: JSON.stringify({ date }) }),

  // 批量编辑
  batchEdit: (planId: number, intents: EditIntentCommand[], confirmWarnings = false) =>
    request<any>(`/plans/${planId}/changes/batch`, { method: 'POST', body: JSON.stringify({ intents, confirmWarnings }) }),

  // 覆盖率
  getCoverage: (planId: number, date: string, skillId?: number) =>
    request<any>(`/plans/${planId}/coverage?date=${date}${skillId ? `&skillId=${skillId}` : ''}`),

  // 发布/版本
  publishValidate: (planId: number) =>
    request<any>(`/plans/${planId}/publish/validate`, { method: 'POST' }),
  publish: (planId: number, operatorId = 'admin') =>
    request<any>(`/plans/${planId}/publish`, { method: 'POST', body: JSON.stringify({ operatorId }) }),
  rollback: (planId: number, versionNo: number) =>
    request<any>(`/plans/${planId}/rollback`, { method: 'POST', body: JSON.stringify({ versionNo }) }),
  getHistory: (planId: number) => request<any>(`/plans/${planId}/history`),

  // 编辑历史
  getChanges: (planId: number) => request<any[]>(`/plans/${planId}/changes`),

  // 技能列表
  getSkills: () => request<any[]>('/skills'),
}
