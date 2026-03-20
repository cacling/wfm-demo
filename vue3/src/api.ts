/**
 * api.ts — 后端 API 客户端
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

export const api = {
  // 排班方案
  getPlans: () => request<any[]>('/plans'),
  createPlan: (data: any) => request<any>('/plans', { method: 'POST', body: JSON.stringify(data) }),
  generatePlan: (planId: number) => request<any>(`/plans/${planId}/generate`, { method: 'POST' }),
  getTimeline: (planId: number, date: string) => request<any>(`/plans/${planId}/timeline?date=${date}`),

  // 活动类型
  getActivities: () => request<any[]>('/activities'),

  // 排班块编辑（Phase 3 实现）
  updateBlock: (planId: number, blockId: number, data: any) =>
    request<any>(`/plans/${planId}/blocks/${blockId}`, { method: 'PUT', body: JSON.stringify(data) }),
  addBlock: (planId: number, data: any) =>
    request<any>(`/plans/${planId}/blocks`, { method: 'POST', body: JSON.stringify(data) }),
  deleteBlock: (planId: number, blockId: number) =>
    request<any>(`/plans/${planId}/blocks/${blockId}`, { method: 'DELETE' }),

  // 校验
  validatePlan: (planId: number, date: string) =>
    request<any>(`/plans/${planId}/validate`, { method: 'POST', body: JSON.stringify({ date }) }),

  // 编辑历史
  getChanges: (planId: number) => request<any[]>(`/plans/${planId}/changes`),
}
