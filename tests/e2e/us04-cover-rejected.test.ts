import { test, expect, describe, beforeAll } from 'bun:test'
import { ensurePlanExists } from './setup'
import { getTimeline, getAgentBlocks, commitEdit } from './helpers'
const PLAN_ID = 1, AGENT_ID = 2, DATE = '2026-03-20'
describe('US04 - Cover Rejected', () => {
  beforeAll(async () => { await ensurePlanExists() })
  test('李娜 has LUNCH', async () => {
    const tl = await getTimeline(PLAN_ID, DATE)
    expect(getAgentBlocks(tl, AGENT_ID).find((b: any) => b.type === 'lunch')).toBeTruthy()
  })
  test('TRAINING over LUNCH rejected', async () => {
    const tl = await getTimeline(PLAN_ID, DATE)
    const lunch = getAgentBlocks(tl, AGENT_ID).find((b: any) => b.type === 'lunch')
    const result = await commitEdit(PLAN_ID, { intentType: 'INSERT_ACTIVITY', assignmentId: lunch.entryId, activityId: 5, targetRange: { startTime: lunch.start, endTime: lunch.end }, confirmWarnings: false })
    expect(result.status).toBe('rejected')
  })
  test('rejection has ACTIVITY_COVER error', async () => {
    const tl = await getTimeline(PLAN_ID, DATE)
    const lunch = getAgentBlocks(tl, AGENT_ID).find((b: any) => b.type === 'lunch')
    const result = await commitEdit(PLAN_ID, { intentType: 'INSERT_ACTIVITY', assignmentId: lunch.entryId, activityId: 5, targetRange: { startTime: lunch.start, endTime: lunch.end }, confirmWarnings: false })
    expect(result.validation.errors.some((e: any) => e.ruleCode === 'ACTIVITY_COVER')).toBe(true)
  })
  test('LUNCH unchanged', async () => {
    const tl = await getTimeline(PLAN_ID, DATE)
    expect(getAgentBlocks(tl, AGENT_ID).find((b: any) => b.type === 'lunch')).toBeTruthy()
  })
})
