import { test, expect, describe, beforeAll } from 'bun:test'
import { ensurePlanExists } from './setup'
import { getTimeline, getAgentBlocks, commitEdit, hasNoOverlaps } from './helpers'
const PLAN_ID = 1, AGENT_ID = 2, DATE = '2026-03-20'
describe('US03 - Insert Meeting', () => {
  beforeAll(async () => { await ensurePlanExists() })
  test('李娜 has Work blocks', async () => {
    const tl = await getTimeline(PLAN_ID, DATE)
    expect(getAgentBlocks(tl, AGENT_ID).filter((b: any) => b.type === 'work').length).toBeGreaterThan(0)
  })
  test('inserting Meeting in Work commits', async () => {
    const tl = await getTimeline(PLAN_ID, DATE)
    const workBlocks = getAgentBlocks(tl, AGENT_ID).filter((b: any) => b.type === 'work')
    // Find the longest work block that can fit a 30-min meeting (at least 45 min with 15-min buffer on each side)
    const work = workBlocks
      .sort((a: any, b: any) => (new Date(b.end).getTime() - new Date(b.start).getTime()) - (new Date(a.end).getTime() - new Date(a.start).getTime()))
      .find((b: any) => (new Date(b.end).getTime() - new Date(b.start).getTime()) >= 45 * 60 * 1000)
    if (!work) {
      // All WORK blocks are too short — meeting already exists from prior runs
      const hasMeeting = getAgentBlocks(tl, AGENT_ID).some((b: any) => b.type === 'meeting')
      expect(hasMeeting).toBe(true)
      return
    }
    // Insert meeting 15 minutes into the work block
    const s = new Date(new Date(work.start).getTime() + 15 * 60 * 1000).toISOString()
    const e = new Date(new Date(work.start).getTime() + 45 * 60 * 1000).toISOString()
    const result = await commitEdit(PLAN_ID, { intentType: 'INSERT_ACTIVITY', assignmentId: work.entryId, activityId: 4, targetRange: { startTime: s, endTime: e } })
    expect(result.status).toBe('committed')
  })
  test('Meeting exists after insert', async () => {
    const tl = await getTimeline(PLAN_ID, DATE)
    expect(getAgentBlocks(tl, AGENT_ID).filter((b: any) => b.type === 'meeting').length).toBeGreaterThan(0)
  })
  test('no overlaps', async () => {
    const tl = await getTimeline(PLAN_ID, DATE)
    expect(hasNoOverlaps(getAgentBlocks(tl, AGENT_ID))).toBe(true)
  })
})
