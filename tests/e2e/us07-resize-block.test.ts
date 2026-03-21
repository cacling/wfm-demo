import { test, expect, describe, beforeAll } from 'bun:test'
import { ensurePlanExists } from './setup'
import { getTimeline, getAgentBlocks, commitEdit, hasNoOverlaps } from './helpers'
const PLAN_ID = 1, AGENT_ID = 5, DATE = '2026-03-20'
describe('US07 - Resize Block', () => {
  beforeAll(async () => { await ensurePlanExists() })
  test('陈刚 has BREAK', async () => {
    const tl = await getTimeline(PLAN_ID, DATE)
    expect(getAgentBlocks(tl, AGENT_ID).find((b: any) => b.type === 'break')).toBeTruthy()
  })
  test('resize BREAK to 30min commits', async () => {
    const tl = await getTimeline(PLAN_ID, DATE)
    const brk = getAgentBlocks(tl, AGENT_ID).find((b: any) => b.type === 'break')
    const newEnd = new Date(new Date(brk.start).getTime() + 30*60000).toISOString()
    const result = await commitEdit(PLAN_ID, { intentType: 'RESIZE_RIGHT', assignmentId: brk.entryId, blockId: brk.id, targetRange: { startTime: brk.start, endTime: newEnd } })
    expect(result.status).toBe('committed')
  })
  test('Break is 30min', async () => {
    const tl = await getTimeline(PLAN_ID, DATE)
    const brk = getAgentBlocks(tl, AGENT_ID).find((b: any) => b.type === 'break')
    expect((new Date(brk.end).getTime() - new Date(brk.start).getTime()) / 60000).toBe(30)
  })
  test('no overlaps', async () => {
    const tl = await getTimeline(PLAN_ID, DATE)
    expect(hasNoOverlaps(getAgentBlocks(tl, AGENT_ID))).toBe(true)
  })
})
