import dayjs from 'dayjs'
import type { Agent, Activity, DisplayBlock } from '../types'

/**
 * Derive display blocks for an agent:
 * - Activities are rendered as-is (editable)
 * - Gaps between activities within the shift are filled with Work blocks (non-editable)
 */
export function deriveDisplayBlocks(agent: Agent, activities: Activity[]): DisplayBlock[] {
  const shiftStart = dayjs(agent.shiftStart)
  const shiftEnd = dayjs(agent.shiftEnd)

  // Sort activities by start time
  const sorted = [...activities]
    .filter((a) => a.agentId === agent.id)
    .sort((a, b) => dayjs(a.start).diff(dayjs(b.start)))

  const blocks: DisplayBlock[] = []
  let cursor = shiftStart

  for (const act of sorted) {
    const actStart = dayjs(act.start)
    const actEnd = dayjs(act.end)

    // Fill gap before this activity with Work
    if (actStart.isAfter(cursor)) {
      blocks.push({
        id: `work-${agent.id}-${cursor.valueOf()}`,
        agentId: agent.id,
        type: 'work',
        start: cursor.toISOString(),
        end: actStart.toISOString(),
        editable: false,
      })
    }

    // Add the activity itself
    blocks.push({
      id: act.id,
      agentId: agent.id,
      type: act.type,
      start: act.start,
      end: act.end,
      editable: true,
    })

    cursor = actEnd.isAfter(cursor) ? actEnd : cursor
  }

  // Fill remaining gap after last activity with Work
  if (cursor.isBefore(shiftEnd)) {
    blocks.push({
      id: `work-${agent.id}-${cursor.valueOf()}`,
      agentId: agent.id,
      type: 'work',
      start: cursor.toISOString(),
      end: shiftEnd.toISOString(),
      editable: false,
    })
  }

  return blocks
}

export function calcWorkMinutes(blocks: DisplayBlock[]): number {
  return blocks.reduce((sum, b) => sum + dayjs(b.end).diff(dayjs(b.start), 'minute'), 0)
}
