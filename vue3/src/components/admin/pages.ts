/**
 * pages.ts — 管理页面配置定义
 *
 * 每个页面只需定义 title, apiPath, columns, formFields，
 * CrudTable 组件自动生成完整的 CRUD UI。
 */

export interface PageConfig {
  title: string
  apiPath: string
  columns: { key: string; label: string; width?: string }[]
  formFields: { key: string; label: string; type: 'text' | 'number' | 'boolean' | 'select' | 'color'; options?: { value: any; label: string }[] }[]
}

export const pageConfigs: Record<string, PageConfig> = {
  activities: {
    title: 'Activity Types',
    apiPath: '/activities',
    columns: [
      { key: 'code', label: 'Code', width: '100px' },
      { key: 'name', label: 'Name' },
      { key: 'color', label: 'Color', width: '120px' },
      { key: 'priority', label: 'Priority', width: '80px' },
      { key: 'isPaid', label: 'Paid', width: '60px' },
      { key: 'isCoverable', label: 'Coverable', width: '80px' },
      { key: 'canCover', label: 'Can Cover', width: '80px' },
      { key: 'icon', label: 'Icon', width: '80px' },
    ],
    formFields: [
      { key: 'code', label: 'Code', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'color', label: 'Color', type: 'color' },
      { key: 'icon', label: 'Icon', type: 'text' },
      { key: 'priority', label: 'Priority', type: 'number' },
      { key: 'isPaid', label: 'Is Paid', type: 'boolean' },
      { key: 'isCoverable', label: 'Is Coverable', type: 'boolean' },
      { key: 'canCover', label: 'Can Cover Others', type: 'boolean' },
    ],
  },

  shifts: {
    title: 'Shifts',
    apiPath: '/shifts',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'startTime', label: 'Start', width: '80px' },
      { key: 'endTime', label: 'End', width: '80px' },
      { key: 'durationMinutes', label: 'Duration (min)', width: '110px' },
    ],
    formFields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'startTime', label: 'Start Time (HH:mm)', type: 'text' },
      { key: 'endTime', label: 'End Time (HH:mm)', type: 'text' },
      { key: 'durationMinutes', label: 'Duration (minutes)', type: 'number' },
    ],
  },

  contracts: {
    title: 'Contracts',
    apiPath: '/contracts',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'minHoursDay', label: 'Min/Day', width: '80px' },
      { key: 'maxHoursDay', label: 'Max/Day', width: '80px' },
      { key: 'minHoursWeek', label: 'Min/Week', width: '80px' },
      { key: 'maxHoursWeek', label: 'Max/Week', width: '80px' },
      { key: 'lunchRequired', label: 'Lunch', width: '60px' },
    ],
    formFields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'minHoursDay', label: 'Min Hours/Day', type: 'number' },
      { key: 'maxHoursDay', label: 'Max Hours/Day', type: 'number' },
      { key: 'minHoursWeek', label: 'Min Hours/Week', type: 'number' },
      { key: 'maxHoursWeek', label: 'Max Hours/Week', type: 'number' },
      { key: 'minBreakMinutes', label: 'Min Break (min)', type: 'number' },
      { key: 'lunchRequired', label: 'Lunch Required', type: 'boolean' },
      { key: 'lunchMinMinutes', label: 'Lunch Min (min)', type: 'number' },
    ],
  },

  skills: {
    title: 'Skills',
    apiPath: '/skills',
    columns: [
      { key: 'code', label: 'Code', width: '120px' },
      { key: 'name', label: 'Name' },
    ],
    formFields: [
      { key: 'code', label: 'Code', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
    ],
  },

  groups: {
    title: 'Agent Groups',
    apiPath: '/groups',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'maxStartDiffMinutes', label: 'Max Start Diff (min)', width: '150px' },
      { key: 'maxEndDiffMinutes', label: 'Max End Diff (min)', width: '150px' },
    ],
    formFields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'maxStartDiffMinutes', label: 'Max Start Diff (min)', type: 'number' },
      { key: 'maxEndDiffMinutes', label: 'Max End Diff (min)', type: 'number' },
    ],
  },

  agents: {
    title: 'Agents',
    apiPath: '/agents',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'employeeNo', label: 'Employee No', width: '100px' },
      { key: 'groupName', label: 'Group', width: '120px' },
      { key: 'contractName', label: 'Contract', width: '120px' },
    ],
    formFields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'employeeNo', label: 'Employee No', type: 'text' },
      { key: 'groupId', label: 'Group ID', type: 'number' },
      { key: 'contractId', label: 'Contract ID', type: 'number' },
    ],
  },

  'leave-types': {
    title: 'Leave Types',
    apiPath: '/leave-types',
    columns: [
      { key: 'code', label: 'Code', width: '100px' },
      { key: 'name', label: 'Name' },
      { key: 'isPaid', label: 'Paid', width: '60px' },
      { key: 'maxDaysYear', label: 'Max Days/Year', width: '120px' },
      { key: 'color', label: 'Color', width: '100px' },
    ],
    formFields: [
      { key: 'code', label: 'Code', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'isPaid', label: 'Is Paid', type: 'boolean' },
      { key: 'maxDaysYear', label: 'Max Days/Year', type: 'number' },
      { key: 'color', label: 'Color', type: 'color' },
    ],
  },

  leaves: {
    title: 'Leave Requests',
    apiPath: '/leaves',
    columns: [
      { key: 'agentName', label: 'Agent' },
      { key: 'leaveTypeId', label: 'Type', width: '80px' },
      { key: 'startTime', label: 'Start', width: '160px' },
      { key: 'endTime', label: 'End', width: '160px' },
      { key: 'isFullDay', label: 'Full Day', width: '70px' },
      { key: 'status', label: 'Status', width: '80px' },
      { key: 'isPrePlanned', label: 'Pre-planned', width: '90px' },
    ],
    formFields: [
      { key: 'agentId', label: 'Agent ID', type: 'number' },
      { key: 'leaveTypeId', label: 'Leave Type ID', type: 'number' },
      { key: 'startTime', label: 'Start (ISO)', type: 'text' },
      { key: 'endTime', label: 'End (ISO)', type: 'text' },
      { key: 'isFullDay', label: 'Full Day', type: 'boolean' },
      { key: 'isPrePlanned', label: 'Pre-planned', type: 'boolean' },
      { key: 'note', label: 'Note', type: 'text' },
    ],
  },

  rules: {
    title: 'Rule Definitions',
    apiPath: '/rules/definitions',
    columns: [
      { key: 'code', label: 'Code', width: '180px' },
      { key: 'name', label: 'Name' },
      { key: 'category', label: 'Category', width: '90px' },
      { key: 'stage', label: 'Stage', width: '110px' },
      { key: 'scopeType', label: 'Scope', width: '80px' },
      { key: 'severityDefault', label: 'Severity', width: '80px' },
    ],
    formFields: [
      { key: 'code', label: 'Code', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'category', label: 'Category', type: 'select', options: [
        { value: 'activity', label: 'Activity' },
        { value: 'contract', label: 'Contract' },
        { value: 'group', label: 'Group' },
        { value: 'staffing', label: 'Staffing' },
        { value: 'plan', label: 'Plan' },
      ]},
      { key: 'stage', label: 'Stage', type: 'select', options: [
        { value: 'generate', label: 'Generate' },
        { value: 'edit_preview', label: 'Edit Preview' },
        { value: 'edit_commit', label: 'Edit Commit' },
        { value: 'publish', label: 'Publish' },
      ]},
      { key: 'scopeType', label: 'Scope Type', type: 'select', options: [
        { value: 'global', label: 'Global' },
        { value: 'activity', label: 'Activity' },
        { value: 'contract', label: 'Contract' },
        { value: 'group', label: 'Group' },
        { value: 'plan', label: 'Plan' },
      ]},
      { key: 'severityDefault', label: 'Default Severity', type: 'select', options: [
        { value: 'error', label: 'Error' },
        { value: 'warning', label: 'Warning' },
        { value: 'info', label: 'Info' },
      ]},
      { key: 'description', label: 'Description', type: 'text' },
    ],
  },

  staffing: {
    title: 'Staffing Requirements',
    apiPath: '/staffing-requirements',
    columns: [
      { key: 'planId', label: 'Plan', width: '60px' },
      { key: 'date', label: 'Date', width: '100px' },
      { key: 'startTime', label: 'Start', width: '160px' },
      { key: 'endTime', label: 'End', width: '160px' },
      { key: 'minAgents', label: 'Min Agents', width: '90px' },
      { key: 'skillId', label: 'Skill', width: '60px' },
      { key: 'channel', label: 'Channel', width: '80px' },
    ],
    formFields: [
      { key: 'planId', label: 'Plan ID', type: 'number' },
      { key: 'date', label: 'Date (YYYY-MM-DD)', type: 'text' },
      { key: 'startTime', label: 'Start (ISO)', type: 'text' },
      { key: 'endTime', label: 'End (ISO)', type: 'text' },
      { key: 'minAgents', label: 'Min Agents', type: 'number' },
      { key: 'skillId', label: 'Skill ID (optional)', type: 'number' },
      { key: 'channel', label: 'Channel (optional)', type: 'text' },
    ],
  },
}
