export interface Agent {
  id: string
  name: string
  shift: 'AM' | 'MD'
  shiftStart: string // ISO datetime
  shiftEnd: string   // ISO datetime
  icons?: string[]
}

/** Non-work activities that are explicitly scheduled and draggable */
export type ActivityType = 'break' | 'meeting' | 'training' | 'offline' | 'other'

export interface Activity {
  id: string
  agentId: string
  type: ActivityType
  start: string
  end: string
}

/** Display block = derived work block + explicit activity */
export type BlockType = 'work' | ActivityType

export interface DisplayBlock {
  id: string
  agentId: string
  type: BlockType
  start: string
  end: string
  editable: boolean // work=false, activities=true
}

export const BLOCK_COLORS: Record<BlockType, string> = {
  work: '#4ade80',
  break: '#facc15',
  meeting: '#3b82f6',
  offline: '#f97316',
  training: '#818cf8',
  other: '#fb923c',
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  work: 'Work',
  break: 'Break',
  meeting: 'Meeting',
  offline: 'Offline',
  training: 'Training',
  other: 'Other',
}
