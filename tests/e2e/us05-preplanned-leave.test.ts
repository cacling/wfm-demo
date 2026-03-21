import { test, expect, describe, beforeAll } from 'bun:test'
import { ensurePlanExists } from './setup'
import { getTimeline, getAgentBlocks } from './helpers'

const PLAN_ID = 1
const DATE = '2026-03-21'
const WANG_LEI_ID = 3   // 王磊 — full-day sick leave APPROVED
const OTHER_AGENTS = [1, 2, 4, 5, 6, 7, 8] // agents without full-day leave on 3/21

describe('US05 - Pre-planned Leave Exclusion', () => {
  beforeAll(async () => { await ensurePlanExists() })
  test('王磊 (agent 3) has NO blocks on 3/21 due to approved full-day sick leave', async () => {
    const timeline = await getTimeline(PLAN_ID, DATE)
    const blocks = getAgentBlocks(timeline, WANG_LEI_ID)
    expect(blocks.length).toBe(0)
  })

  test('王磊 (agent 3) has NO schedule entry on 3/21', async () => {
    const timeline = await getTimeline(PLAN_ID, DATE)
    const entries = timeline.entries ?? []
    const agent3Entry = entries.find((e: any) => e.agentId === WANG_LEI_ID)
    expect(agent3Entry).toBeUndefined()
  })

  test('other agents still have schedule entries on 3/21', async () => {
    const timeline = await getTimeline(PLAN_ID, DATE)
    for (const agentId of OTHER_AGENTS) {
      const blocks = getAgentBlocks(timeline, agentId)
      expect(blocks.length).toBeGreaterThan(0)
    }
  })

  test('timeline on 3/21 contains at least 19 agents with blocks', async () => {
    const timeline = await getTimeline(PLAN_ID, DATE)
    const agentIdsWithBlocks = new Set(
      (timeline.blocks ?? []).map((b: any) => b.agentId)
    )
    // Agent 3 is excluded (sick leave) and Agent 1 might be excluded on 3/22 (annual leave, not 3/21)
    expect(agentIdsWithBlocks.size).toBeGreaterThanOrEqual(19)
  })

  test('timeline date matches requested date', async () => {
    const timeline = await getTimeline(PLAN_ID, DATE)
    expect(timeline.date ?? timeline.planDate).toBe(DATE)
  })
})
