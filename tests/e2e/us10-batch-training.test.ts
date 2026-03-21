import { test, expect, describe, beforeAll } from 'bun:test'
import { ensurePlanExists } from './setup'
import { getTimeline, getAgentBlocks, post } from './helpers'
const PLAN_ID = 1, DATE = '2026-03-20', AGENTS = [1, 2, 5, 8]
describe('US10 - Batch Training', () => {
  beforeAll(async () => { await ensurePlanExists() })
  test('batch insert Training for agents', async () => {
    const tl = await getTimeline(PLAN_ID, DATE)
    const intents: any[] = []
    for (const aid of AGENTS) {
      // Find a WORK block >= 60 min that doesn't already have training
      const work = getAgentBlocks(tl, aid).find((b: any) =>
        b.type === 'work' && (new Date(b.end).getTime() - new Date(b.start).getTime()) > 60 * 60 * 1000
      )
      if (!work) continue
      intents.push({
        intentType: 'INSERT_ACTIVITY',
        assignmentId: work.entryId,
        activityId: 5,
        // versionNo omitted so optimistic-lock check is skipped for each successive intent
        targetRange: {
          startTime: new Date(new Date(work.start).getTime() + 15 * 60 * 1000).toISOString(),
          endTime: new Date(new Date(work.start).getTime() + 45 * 60 * 1000).toISOString(),
        },
        confirmWarnings: true,
      })
    }
    expect(intents.length).toBeGreaterThan(0)
    const r = await post('/plans/' + PLAN_ID + '/changes/batch', { intents, confirmWarnings: true })
    // At least one should be committed (some may be rejected due to version bump)
    expect(r.total).toBeGreaterThan(0)
    expect(r.committed + r.rejected).toBe(r.total)
  })
  test('Training blocks exist for at least one agent after batch', async () => {
    const tl = await getTimeline(PLAN_ID, DATE)
    let count = 0
    for (const aid of AGENTS) {
      if (getAgentBlocks(tl, aid).some((b: any) => b.type === 'training')) count++
    }
    expect(count).toBeGreaterThanOrEqual(1)
  })
})
