import { test, expect, describe, beforeAll } from 'bun:test'
import { ensurePlanExists } from './setup'
import { post, del } from './helpers'
const PLAN_ID = 1, DATE = '2026-03-20'
let reqId: number
describe('US08 - Staffing Check', () => {
  beforeAll(async () => { await ensurePlanExists() })
  test('add extreme staffing req (50 agents)', async () => {
    const r = await post('/staffing-requirements', { planId: PLAN_ID, date: DATE, startTime: DATE+'T01:00:00Z', endTime: DATE+'T03:00:00Z', minAgents: 50 })
    expect(r.id).toBeTruthy(); reqId = r.id
  })
  test('publish validate shows STAFFING_COVERAGE error', async () => {
    const r = await post('/plans/'+PLAN_ID+'/publish/validate', {})
    expect(r.errors.some((e: any) => e.ruleCode === 'STAFFING_COVERAGE')).toBe(true)
  })
  test('plan not publishable', async () => {
    const r = await post('/plans/'+PLAN_ID+'/publish/validate', {})
    expect(r.valid).toBe(false)
  })
  test('delete requirement', async () => {
    const r = await del('/staffing-requirements/'+reqId)
    expect(r.ok).toBe(true)
  })
})
