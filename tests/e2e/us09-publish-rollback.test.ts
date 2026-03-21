import { test, expect, describe, beforeAll } from 'bun:test'
import { ensurePlanExists } from './setup'
import { post, api } from './helpers'
const PLAN_ID = 1
describe('US09 - Publish and Rollback', () => {
  beforeAll(async () => {
    await ensurePlanExists()
    // Ensure plan is in editing state before we test publish
    const p = await api('/plans/' + PLAN_ID)
    if (p.status === 'published') {
      // Rollback to restore editing state first
      const h = await api('/plans/' + PLAN_ID + '/history')
      const v = h.versions[h.versions.length - 1]?.versionNo
      if (v) await post('/plans/' + PLAN_ID + '/rollback', { versionNo: v })
    }
  })
  test('publish', async () => {
    const r = await post('/plans/' + PLAN_ID + '/publish', { operatorId: 'admin' })
    expect(r.ok).toBe(true)
  })
  test('status=published', async () => {
    const p = await api('/plans/' + PLAN_ID)
    expect(p.status).toBe('published')
  })
  test('history has version', async () => {
    const h = await api('/plans/' + PLAN_ID + '/history')
    expect(h.versions.length).toBeGreaterThanOrEqual(1)
  })
  test('history has publish log', async () => {
    const h = await api('/plans/' + PLAN_ID + '/history')
    expect(h.logs.find((l: any) => l.action === 'publish')).toBeTruthy()
  })
  test('rollback', async () => {
    const h = await api('/plans/' + PLAN_ID + '/history')
    const v = h.versions[h.versions.length - 1].versionNo
    const r = await post('/plans/' + PLAN_ID + '/rollback', { versionNo: v })
    expect(r.ok).toBe(true)
  })
  test('status=editing after rollback', async () => {
    const p = await api('/plans/' + PLAN_ID)
    expect(p.status).toBe('editing')
  })
  test('rollback log exists', async () => {
    const h = await api('/plans/' + PLAN_ID + '/history')
    expect(h.logs.find((l: any) => l.action === 'rollback')).toBeTruthy()
  })
})
