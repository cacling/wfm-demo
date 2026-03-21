import { test, expect, describe, beforeAll } from 'bun:test'
import { ensurePlanExists } from './setup'
import { getTimeline, getAgentBlocks, commitEdit, hasNoOverlaps, api } from './helpers'
const PLAN_ID = 1, AGENT_ID = 1, DATE = '2026-03-20'
describe('US02 - Move Block', () => {
  beforeAll(async () => { await ensurePlanExists() })
  test('张明 has BREAK blocks', async () => {
    const tl = await getTimeline(PLAN_ID, DATE)
    const breaks = getAgentBlocks(tl, AGENT_ID).filter((b: any) => b.type === 'break')
    expect(breaks.length).toBeGreaterThan(0)
  })
  test('moving BREAK +30min commits', async () => {
    const tl = await getTimeline(PLAN_ID, DATE)
    const brk = getAgentBlocks(tl, AGENT_ID).find((b: any) => b.type === 'break')
    const newStart = new Date(new Date(brk.start).getTime() + 30*60000).toISOString()
    const newEnd = new Date(new Date(brk.end).getTime() + 30*60000).toISOString()
    const result = await commitEdit(PLAN_ID, { intentType: 'MOVE_BLOCK', assignmentId: brk.entryId, blockId: brk.id, targetRange: { startTime: newStart, endTime: newEnd } })
    expect(result.status).toBe('committed')
  })
  test('no overlaps after move', async () => {
    const tl = await getTimeline(PLAN_ID, DATE)
    expect(hasNoOverlaps(getAgentBlocks(tl, AGENT_ID))).toBe(true)
  })
  test('version incremented', async () => {
    const plan = await api('/plans/' + PLAN_ID)
    expect(plan.versionNo).toBeGreaterThan(1)
  })
  test('Work blocks rebuilt', async () => {
    const tl = await getTimeline(PLAN_ID, DATE)
    const work = getAgentBlocks(tl, AGENT_ID).filter((b: any) => b.type === 'work')
    expect(work.length).toBeGreaterThanOrEqual(3)
  })
})
