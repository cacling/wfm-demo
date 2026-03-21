import { test, expect, describe, beforeAll, afterAll } from 'bun:test'
import { ensurePlanExists } from './setup'
import { post, api, del } from './helpers'

// Use a separate temporary plan for publish/rollback tests to avoid
// breaking the shared PLAN_ID=1 that other tests use for edits
let testPlanId: number

describe('US09 - Publish and Rollback', () => {
  beforeAll(async () => {
    await ensurePlanExists()
    // Create a fresh temporary plan for this test
    const plan = await post('/plans', {
      name: 'US09 Publish Test',
      startDate: '2026-03-20',
      endDate: '2026-03-20',
    })
    testPlanId = plan.id
    // Generate schedule so there's something to publish
    await post('/plans/' + testPlanId + '/generate', {})
  })

  afterAll(async () => {
    // Clean up: delete the temporary plan
    if (testPlanId) await del('/plans/' + testPlanId)
  })

  test('publish', async () => {
    const r = await post('/plans/' + testPlanId + '/publish', { operatorId: 'admin' })
    expect(r.ok).toBe(true)
  })
  test('status=published', async () => {
    const p = await api('/plans/' + testPlanId)
    expect(p.status).toBe('published')
  })
  test('history has version', async () => {
    const h = await api('/plans/' + testPlanId + '/history')
    expect(h.versions.length).toBeGreaterThanOrEqual(1)
  })
  test('history has publish log', async () => {
    const h = await api('/plans/' + testPlanId + '/history')
    expect(h.logs.find((l: any) => l.action === 'publish')).toBeTruthy()
  })
  test('rollback', async () => {
    const h = await api('/plans/' + testPlanId + '/history')
    const v = h.versions[h.versions.length - 1].versionNo
    const r = await post('/plans/' + testPlanId + '/rollback', { versionNo: v })
    expect(r.ok).toBe(true)
  })
  test('status=editing after rollback', async () => {
    const p = await api('/plans/' + testPlanId)
    expect(p.status).toBe('editing')
  })
  test('rollback log exists', async () => {
    const h = await api('/plans/' + testPlanId + '/history')
    expect(h.logs.find((l: any) => l.action === 'rollback')).toBeTruthy()
  })
})
