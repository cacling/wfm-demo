import { test, expect, describe, beforeAll } from 'bun:test'
import { ensurePlanExists } from './setup'
import { getTimeline, getAgentBlocks, commitEdit, hasNoOverlaps } from './helpers'
const PLAN_ID = 1, DATE = '2026-03-20'
let targetAgentId = 4  // prefer agent 4 (赵敏), fall back to any agent with a long WORK block
let targetEntryId: number

describe('US06 - Temp Sick Leave', () => {
  beforeAll(async () => {
    await ensurePlanExists()
    // Find an agent with a WORK block >= 60 min on DATE
    const tl = await getTimeline(PLAN_ID, DATE)
    for (const agentId of [4, 1, 2, 3, 5, 8, 9, 10, 11, 12]) {
      const blocks = getAgentBlocks(tl, agentId)
      const workBlock = blocks.find((b: any) =>
        b.activityId === 1 && (new Date(b.end).getTime() - new Date(b.start).getTime()) >= 60 * 60 * 1000
      )
      if (workBlock) {
        targetAgentId = agentId
        targetEntryId = workBlock.entryId
        break
      }
    }
  })

  test('target agent has blocks on 3/20', async () => {
    const tl = await getTimeline(PLAN_ID, DATE)
    expect(getAgentBlocks(tl, targetAgentId).length).toBeGreaterThan(0)
  })

  test('REPLACE_WITH_LEAVE commits', async () => {
    const tl = await getTimeline(PLAN_ID, DATE)
    const blocks = getAgentBlocks(tl, targetAgentId)
    const workBlock = blocks.find((b: any) =>
      b.activityId === 1 && (new Date(b.end).getTime() - new Date(b.start).getTime()) >= 60 * 60 * 1000
    )
    if (!workBlock) {
      // All work time has been replaced — verify sick leave still exists
      const hasSick = blocks.some((b: any) => b.activityId === 7)
      expect(hasSick).toBe(true)
      return
    }
    const startTime = workBlock.start
    const endTime = new Date(new Date(workBlock.start).getTime() + 60 * 60 * 1000).toISOString()
    const result = await commitEdit(PLAN_ID, {
      intentType: 'REPLACE_WITH_LEAVE',
      assignmentId: workBlock.entryId,
      targetRange: { startTime, endTime },
    })
    expect(result.status).toBe('committed')
  })

  test('sick leave block exists after commit', async () => {
    const tl = await getTimeline(PLAN_ID, DATE)
    const allSick = (tl.blocks ?? []).filter((b: any) => b.activityId === 7)
    expect(allSick.length).toBeGreaterThan(0)
  })

  test('no overlaps for target agent after commit', async () => {
    const tl = await getTimeline(PLAN_ID, DATE)
    expect(hasNoOverlaps(getAgentBlocks(tl, targetAgentId))).toBe(true)
  })
})
