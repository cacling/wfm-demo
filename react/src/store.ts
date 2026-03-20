import { create } from 'zustand'
import dayjs from 'dayjs'
import type { Agent, Activity, ActivityType, DisplayBlock } from './types'
import { agents as mockAgents, activities as mockActivities } from './mock-data'
import { deriveDisplayBlocks } from './utils/rules'
import { snapTime } from './utils/time'

let nextId = 1000

interface ScheduleState {
  agents: Agent[]
  activities: Activity[]
  selectedBlockId: string | null

  getDisplayBlocks: (agentId: string) => DisplayBlock[]
  selectBlock: (id: string | null) => void
  moveActivity: (id: string, deltaMinutes: number) => boolean
  resizeActivity: (id: string, edge: 'left' | 'right', deltaMinutes: number) => boolean
  deleteActivity: (id: string) => void
  addActivity: (agentId: string, type: ActivityType, startISO: string) => string | null
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  agents: mockAgents,
  activities: mockActivities,
  selectedBlockId: null,

  getDisplayBlocks: (agentId: string) => {
    const { agents, activities } = get()
    const agent = agents.find((a) => a.id === agentId)
    if (!agent) return []
    return deriveDisplayBlocks(agent, activities)
  },

  selectBlock: (id) => set({ selectedBlockId: id }),

  moveActivity: (id, deltaMinutes) => {
    const { activities, agents } = get()
    const activity = activities.find((a) => a.id === id)
    if (!activity) return false

    const agent = agents.find((a) => a.id === activity.agentId)
    if (!agent) return false

    const duration = dayjs(activity.end).diff(dayjs(activity.start), 'minute')
    const newStart = snapTime(dayjs(activity.start).add(deltaMinutes, 'minute'))
    const newEnd = newStart.add(duration, 'minute')

    if (newStart.isBefore(dayjs(agent.shiftStart))) return false
    if (newEnd.isAfter(dayjs(agent.shiftEnd))) return false

    const overlaps = activities.some((a) => {
      if (a.id === id || a.agentId !== activity.agentId) return false
      return newStart.isBefore(dayjs(a.end)) && newEnd.isAfter(dayjs(a.start))
    })
    if (overlaps) return false

    set({
      activities: activities.map((a) =>
        a.id === id
          ? { ...a, start: newStart.toISOString(), end: newEnd.toISOString() }
          : a,
      ),
    })
    return true
  },

  resizeActivity: (id, edge, deltaMinutes) => {
    const { activities, agents } = get()
    const activity = activities.find((a) => a.id === id)
    if (!activity) return false

    const agent = agents.find((a) => a.id === activity.agentId)
    if (!agent) return false

    let newStart = dayjs(activity.start)
    let newEnd = dayjs(activity.end)

    if (edge === 'left') {
      newStart = snapTime(newStart.add(deltaMinutes, 'minute'))
    } else {
      newEnd = snapTime(newEnd.add(deltaMinutes, 'minute'))
    }

    if (newEnd.diff(newStart, 'minute') < 15) return false
    if (newStart.isBefore(dayjs(agent.shiftStart))) return false
    if (newEnd.isAfter(dayjs(agent.shiftEnd))) return false

    const overlaps = activities.some((a) => {
      if (a.id === id || a.agentId !== activity.agentId) return false
      return newStart.isBefore(dayjs(a.end)) && newEnd.isAfter(dayjs(a.start))
    })
    if (overlaps) return false

    set({
      activities: activities.map((a) =>
        a.id === id
          ? { ...a, start: newStart.toISOString(), end: newEnd.toISOString() }
          : a,
      ),
    })
    return true
  },

  deleteActivity: (id) => {
    set((state) => ({
      activities: state.activities.filter((a) => a.id !== id),
      selectedBlockId: state.selectedBlockId === id ? null : state.selectedBlockId,
    }))
  },

  addActivity: (agentId, type, startISO) => {
    const { activities, agents } = get()
    const agent = agents.find((a) => a.id === agentId)
    if (!agent) return null

    const start = snapTime(dayjs(startISO))
    const end = start.add(30, 'minute') // default 30 min

    // Must be within shift
    if (start.isBefore(dayjs(agent.shiftStart))) return null
    if (end.isAfter(dayjs(agent.shiftEnd))) return null

    // Must not overlap existing activities
    const overlaps = activities.some((a) => {
      if (a.agentId !== agentId) return false
      return start.isBefore(dayjs(a.end)) && end.isAfter(dayjs(a.start))
    })
    if (overlaps) return null

    const id = `act${nextId++}`
    set({
      activities: [
        ...activities,
        { id, agentId, type, start: start.toISOString(), end: end.toISOString() },
      ],
      selectedBlockId: id,
    })
    return id
  },
}))
