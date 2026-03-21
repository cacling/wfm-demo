import { test, expect, describe, beforeAll } from 'bun:test'
import { post, api, getTimeline, getAgentBlocks, hasNoOverlaps } from './helpers'
import { ensurePlanExists, PLAN_ID } from './setup'

// Activity IDs
const WORK = 1
const BREAK = 2
const LUNCH = 3

// Part-time agents (6, 7) only need WORK and BREAK
const PART_TIME_AGENT_IDS = [6, 7]
// Agents with pre-planned leaves that exclude them from certain days
const AGENT3_SICK_DATE = '2026-03-21'   // 王磊 full-day sick leave
const AGENT1_LEAVE_DATE = '2026-03-22'  // 张明 annual leave

let planId: number

describe('US01 - Create Plan and Generate Schedule', () => {
  beforeAll(async () => { await ensurePlanExists() })

  test('plan exists and has generated data', async () => {
    const plan = await api(`/plans/${PLAN_ID}`)
    expect(plan.id).toBe(PLAN_ID)
    expect(plan.name).toBeTruthy()
    planId = plan.id
  })

  test('plan has 20 agents on 3/20', async () => {
    const timeline = await getTimeline(PLAN_ID, '2026-03-20')
    expect(timeline.agents.length).toBe(20)
  })

  test('3/21 does NOT have an entry for 王磊 (agent 3, full-day sick leave)', async () => {
    const timeline = await getTimeline(1, AGENT3_SICK_DATE)
    const agent3Blocks = getAgentBlocks(timeline, 3)
    expect(agent3Blocks.length).toBe(0)
  })

  test('3/22 does NOT have an entry for 张明 (agent 1, annual leave)', async () => {
    const timeline = await getTimeline(1, AGENT1_LEAVE_DATE)
    const agent1Blocks = getAgentBlocks(timeline, 1)
    expect(agent1Blocks.length).toBe(0)
  })

  test('each agent entry on 3/20 has no overlapping blocks', async () => {
    const timeline = await getTimeline(1, '2026-03-20')
    const agentIds: number[] = Array.from({ length: 20 }, (_, i) => i + 1)
    for (const agentId of agentIds) {
      const blocks = getAgentBlocks(timeline, agentId)
      if (blocks.length > 0) {
        expect(hasNoOverlaps(blocks)).toBe(true)
      }
    }
  })

  test('full-time agents on 3/20 have WORK, BREAK, and LUNCH blocks', async () => {
    const timeline = await getTimeline(1, '2026-03-20')
    const fullTimeIds = [1, 2, 3, 4, 5, 8] // agents 6 and 7 are part-time
    for (const agentId of fullTimeIds) {
      const blocks = getAgentBlocks(timeline, agentId)
      if (blocks.length === 0) continue // skip if on leave
      const activityIds = blocks.map((b: any) => b.activityId)
      // Skip agents that have had sick leave inserted by other tests (they may lose BREAK)
      if (activityIds.includes(7 /* SICK_LEAVE */)) continue
      expect(activityIds).toContain(WORK)
      expect(activityIds).toContain(BREAK)
      expect(activityIds).toContain(LUNCH)
    }
  })

  test('part-time agents on 3/20 have WORK and BREAK blocks', async () => {
    const timeline = await getTimeline(1, '2026-03-20')
    for (const agentId of PART_TIME_AGENT_IDS) {
      const blocks = getAgentBlocks(timeline, agentId)
      if (blocks.length === 0) continue
      const activityIds = blocks.map((b: any) => b.activityId)
      expect(activityIds).toContain(WORK)
      expect(activityIds).toContain(BREAK)
    }
  })

  test('3/21 still has entries for agents other than 王磊 (agent 3)', async () => {
    const timeline = await getTimeline(1, AGENT3_SICK_DATE)
    const agent1Blocks = getAgentBlocks(timeline, 1)
    expect(agent1Blocks.length).toBeGreaterThan(0)
  })
})
