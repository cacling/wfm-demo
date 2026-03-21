/**
 * helpers.ts — e2e 测试辅助函数
 */

const BASE = 'http://127.0.0.1:3210/api'

export async function api<T = any>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const text = await res.text()
  try {
    return JSON.parse(text) as T
  } catch {
    // Return a sentinel object when response is not JSON (e.g., 404 plain text)
    return { error: text, _notJson: true } as unknown as T
  }
}

export function post<T = any>(path: string, body: any): Promise<T> {
  return api(path, { method: 'POST', body: JSON.stringify(body) })
}

export function put<T = any>(path: string, body: any): Promise<T> {
  return api(path, { method: 'PUT', body: JSON.stringify(body) })
}

export function del<T = any>(path: string): Promise<T> {
  return api(path, { method: 'DELETE' })
}

/** 创建方案 + 生成排班 */
export async function createAndGenerate(name: string, startDate: string, endDate: string) {
  const plan = await post('/plans', { name, startDate, endDate })
  const gen = await post(`/plans/${plan.id}/generate`)
  return { plan, gen }
}

/** 获取时间轴 */
export async function getTimeline(planId: number, date: string) {
  return api(`/plans/${planId}/timeline?date=${date}`)
}

/** 获取某个坐席的块 */
export function getAgentBlocks(timeline: any, agentId: number) {
  return (timeline.blocks || [])
    .filter((b: any) => b.agentId === agentId)
    .sort((a: any, b: any) => a.start.localeCompare(b.start))
}

/** 检查块列表无重叠 */
export function hasNoOverlaps(blocks: any[]): boolean {
  const sorted = [...blocks].sort((a, b) => a.start.localeCompare(b.start))
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].end > sorted[i + 1].start) return false
  }
  return true
}

/**
 * 提交编辑意图（封装 commit API 的正确格式）
 *
 * 支持旧版 test 格式（intent/agentId/targetRange.start+end）自动转换为
 * backend 格式（intentType/assignmentId/targetRange.startTime+endTime）。
 *
 * 当 assignmentId 未提供时，通过 blockId 或 agentId + date 自动查询。
 */
export async function commitEdit(planId: number, opts: any) {
  // Translate intent → intentType, and normalize intent names
  const rawIntent: string = opts.intentType ?? opts.intent
  // Map test-facing intent names to backend intentType values
  const intentMap: Record<string, string> = {
    INSERT_BLOCK: 'INSERT_ACTIVITY',
    RESIZE_BLOCK: opts.direction === 'RESIZE_LEFT' ? 'RESIZE_LEFT' : 'RESIZE_RIGHT',
  }
  const intentType: string = intentMap[rawIntent] ?? rawIntent

  // Translate targetRange.start/end → startTime/endTime
  let targetRange: { startTime: string; endTime: string } | undefined
  if (opts.targetRange) {
    targetRange = {
      startTime: opts.targetRange.startTime ?? opts.targetRange.start,
      endTime: opts.targetRange.endTime ?? opts.targetRange.end,
    }
  }

  // Resolve assignmentId (entryId) automatically if not provided
  let assignmentId: number = opts.assignmentId
  if (!assignmentId) {
    const rawDate = targetRange?.startTime ?? ''
    // Try the date from targetRange, and also the next day (for cross-midnight shifts)
    const datesToTry: string[] = []
    if (rawDate.length >= 10) {
      const d = rawDate.substring(0, 10)
      datesToTry.push(d)
      // Also try next day (UTC midnight-crossing shifts)
      const nextDay = new Date(new Date(d).getTime() + 86400000).toISOString().substring(0, 10)
      datesToTry.push(nextDay)
    }

    for (const dateStr of datesToTry) {
      if (assignmentId) break
      const tl = await getTimeline(planId, dateStr)
      const blocks: any[] = tl.blocks ?? []
      if (opts.blockId) {
        const b = blocks.find((b: any) => b.id === opts.blockId)
        if (b) { assignmentId = b.entryId; break }
      } else if (opts.agentId) {
        const b = blocks.find((b: any) => b.agentId === opts.agentId)
        if (b) { assignmentId = b.entryId; break }
      }
    }
  }

  // Get current versionNo
  const plan = await api(`/plans/${planId}`)
  const versionNo = opts.versionNo ?? plan.versionNo ?? 1

  const body: any = {
    intentType,
    assignmentId,
    versionNo,
    confirmWarnings: opts.confirmWarnings ?? true,
  }
  if (targetRange) body.targetRange = targetRange
  if (opts.blockId != null) body.blockId = opts.blockId
  if (opts.activityId != null) body.activityId = opts.activityId
  if (opts.leaveTypeId != null) body.leaveTypeId = opts.leaveTypeId

  return post(`/plans/${planId}/changes/commit`, body)
}
