import { test, expect, describe, beforeAll } from 'bun:test'
import { ensurePlanExists } from './setup'
import { api } from './helpers'
describe('US11 - API Smoke Test', () => {
  beforeAll(async () => { await ensurePlanExists() })
  test('8 activities', async () => { expect((await api('/activities')).length).toBeGreaterThanOrEqual(8) })
  test('6 skills', async () => { expect((await api('/skills')).length).toBe(6) })
  test('3 groups', async () => { expect((await api('/groups')).length).toBe(3) })
  test('20 agents', async () => { expect((await api('/agents')).length).toBe(20) })
  test('3 contracts', async () => { expect((await api('/contracts')).length).toBe(3) })
  test('3 leave types', async () => { expect((await api('/leave-types')).length).toBe(3) })
  test('4+ leaves', async () => { expect((await api('/leaves')).length).toBeGreaterThanOrEqual(4) })
  test('13 rules', async () => { expect((await api('/rules/definitions')).length).toBe(13) })
  test('at least 4 shifts', async () => { expect((await api('/shifts')).length).toBeGreaterThanOrEqual(4) })
  test('shifts endpoint returns an array', async () => { expect(Array.isArray(await api('/shifts'))).toBe(true) })
  test('health ok', async () => { expect((await api('/health')).status).toBe('ok') })
})
