/**
 * setup.ts — 全局 setup：创建方案 + 生成排班 + 添加覆盖需求
 *
 * 所有测试共享这个方案。通过 beforeAll 确保只执行一次。
 */

import { post, api, createAndGenerate } from './helpers'

let initialized = false
export let PLAN_ID = 1

export async function ensurePlanExists() {
  // 检查是否已有方案
  const plans = await api('/plans')
  if (Array.isArray(plans) && plans.length > 0) {
    PLAN_ID = plans[0].id
    // If plan is published, roll back to editing so edits are possible
    const plan = await api('/plans/' + PLAN_ID)
    if (plan.status === 'published') {
      const history = await api('/plans/' + PLAN_ID + '/history')
      const versions: any[] = history.versions ?? []
      if (versions.length > 0) {
        const latestVersion = versions[versions.length - 1].versionNo
        await post('/plans/' + PLAN_ID + '/rollback', { versionNo: latestVersion })
      }
    }
    return
  }

  if (initialized) return
  initialized = true

  // 创建 7 天方案并生成排班
  const { plan } = await createAndGenerate('Week 12 Schedule', '2026-03-20', '2026-03-26')
  PLAN_ID = plan.id

  // 添加覆盖需求
  await post('/staffing-requirements', {
    planId: PLAN_ID, date: '2026-03-20',
    startTime: '2026-03-20T01:00:00Z', endTime: '2026-03-20T03:00:00Z',
    minAgents: 8,
  })
  await post('/staffing-requirements', {
    planId: PLAN_ID, date: '2026-03-20',
    startTime: '2026-03-20T04:00:00Z', endTime: '2026-03-20T06:00:00Z',
    minAgents: 5,
  })
}
