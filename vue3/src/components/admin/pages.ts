/**
 * pages.ts — 管理页面配置（中英双语）
 */

import type { Lang } from '../../i18n'

type Bil = Record<Lang, string>

export interface PageConfig {
  title: Bil
  apiPath: string
  columns: { key: string; label: Bil; width?: string }[]
  formFields: { key: string; label: Bil; type: 'text' | 'number' | 'boolean' | 'select' | 'color'; options?: { value: any; label: string }[] }[]
}

export const pageConfigs: Record<string, PageConfig> = {
  activities: {
    title: { zh: '活动类型', en: 'Activity Types' },
    apiPath: '/activities',
    columns: [
      { key: 'code',        label: { zh: '编码', en: 'Code' }, width: '100px' },
      { key: 'name',        label: { zh: '名称', en: 'Name' } },
      { key: 'color',       label: { zh: '颜色', en: 'Color' }, width: '120px' },
      { key: 'priority',    label: { zh: '优先级', en: 'Priority' }, width: '80px' },
      { key: 'isPaid',      label: { zh: '计薪', en: 'Paid' }, width: '60px' },
      { key: 'isCoverable', label: { zh: '可被覆盖', en: 'Coverable' }, width: '80px' },
      { key: 'canCover',    label: { zh: '可覆盖', en: 'Can Cover' }, width: '80px' },
      { key: 'icon',        label: { zh: '图标', en: 'Icon' }, width: '80px' },
    ],
    formFields: [
      { key: 'code',        label: { zh: '编码', en: 'Code' }, type: 'text' },
      { key: 'name',        label: { zh: '名称', en: 'Name' }, type: 'text' },
      { key: 'color',       label: { zh: '颜色', en: 'Color' }, type: 'color' },
      { key: 'icon',        label: { zh: '图标', en: 'Icon' }, type: 'text' },
      { key: 'priority',    label: { zh: '优先级', en: 'Priority' }, type: 'number' },
      { key: 'isPaid',      label: { zh: '是否计薪', en: 'Is Paid' }, type: 'boolean' },
      { key: 'isCoverable', label: { zh: '可被覆盖', en: 'Is Coverable' }, type: 'boolean' },
      { key: 'canCover',    label: { zh: '可覆盖其他', en: 'Can Cover Others' }, type: 'boolean' },
    ],
  },

  shifts: {
    title: { zh: '班次管理', en: 'Shifts' },
    apiPath: '/shifts',
    columns: [
      { key: 'name',            label: { zh: '名称', en: 'Name' } },
      { key: 'startTime',       label: { zh: '开始', en: 'Start' }, width: '80px' },
      { key: 'endTime',         label: { zh: '结束', en: 'End' }, width: '80px' },
      { key: 'durationMinutes', label: { zh: '时长(分)', en: 'Duration (min)' }, width: '110px' },
    ],
    formFields: [
      { key: 'name',            label: { zh: '名称', en: 'Name' }, type: 'text' },
      { key: 'startTime',       label: { zh: '开始时间 (HH:mm)', en: 'Start Time (HH:mm)' }, type: 'text' },
      { key: 'endTime',         label: { zh: '结束时间 (HH:mm)', en: 'End Time (HH:mm)' }, type: 'text' },
      { key: 'durationMinutes', label: { zh: '时长（分钟）', en: 'Duration (minutes)' }, type: 'number' },
    ],
  },

  contracts: {
    title: { zh: '合同规则', en: 'Contracts' },
    apiPath: '/contracts',
    columns: [
      { key: 'name',          label: { zh: '名称', en: 'Name' } },
      { key: 'minHoursDay',   label: { zh: '日最小', en: 'Min/Day' }, width: '80px' },
      { key: 'maxHoursDay',   label: { zh: '日最大', en: 'Max/Day' }, width: '80px' },
      { key: 'minHoursWeek',  label: { zh: '周最小', en: 'Min/Week' }, width: '80px' },
      { key: 'maxHoursWeek',  label: { zh: '周最大', en: 'Max/Week' }, width: '80px' },
      { key: 'lunchRequired', label: { zh: '午餐', en: 'Lunch' }, width: '60px' },
    ],
    formFields: [
      { key: 'name',            label: { zh: '名称', en: 'Name' }, type: 'text' },
      { key: 'minHoursDay',     label: { zh: '日最小工时', en: 'Min Hours/Day' }, type: 'number' },
      { key: 'maxHoursDay',     label: { zh: '日最大工时', en: 'Max Hours/Day' }, type: 'number' },
      { key: 'minHoursWeek',    label: { zh: '周最小工时', en: 'Min Hours/Week' }, type: 'number' },
      { key: 'maxHoursWeek',    label: { zh: '周最大工时', en: 'Max Hours/Week' }, type: 'number' },
      { key: 'minBreakMinutes', label: { zh: '最小休息（分）', en: 'Min Break (min)' }, type: 'number' },
      { key: 'lunchRequired',   label: { zh: '需要午餐', en: 'Lunch Required' }, type: 'boolean' },
      { key: 'lunchMinMinutes', label: { zh: '午餐最小（分）', en: 'Lunch Min (min)' }, type: 'number' },
    ],
  },

  skills: {
    title: { zh: '技能管理', en: 'Skills' },
    apiPath: '/skills',
    columns: [
      { key: 'code', label: { zh: '编码', en: 'Code' }, width: '120px' },
      { key: 'name', label: { zh: '名称', en: 'Name' } },
    ],
    formFields: [
      { key: 'code', label: { zh: '编码', en: 'Code' }, type: 'text' },
      { key: 'name', label: { zh: '名称', en: 'Name' }, type: 'text' },
    ],
  },

  groups: {
    title: { zh: '班组管理', en: 'Agent Groups' },
    apiPath: '/groups',
    columns: [
      { key: 'name',                label: { zh: '名称', en: 'Name' } },
      { key: 'maxStartDiffMinutes', label: { zh: '最大开始差(分)', en: 'Max Start Diff (min)' }, width: '150px' },
      { key: 'maxEndDiffMinutes',   label: { zh: '最大结束差(分)', en: 'Max End Diff (min)' }, width: '150px' },
    ],
    formFields: [
      { key: 'name',                label: { zh: '名称', en: 'Name' }, type: 'text' },
      { key: 'maxStartDiffMinutes', label: { zh: '最大开始差（分）', en: 'Max Start Diff (min)' }, type: 'number' },
      { key: 'maxEndDiffMinutes',   label: { zh: '最大结束差（分）', en: 'Max End Diff (min)' }, type: 'number' },
    ],
  },

  agents: {
    title: { zh: '坐席管理', en: 'Agents' },
    apiPath: '/agents',
    columns: [
      { key: 'name',         label: { zh: '姓名', en: 'Name' } },
      { key: 'employeeNo',   label: { zh: '工号', en: 'Employee No' }, width: '100px' },
      { key: 'groupName',    label: { zh: '班组', en: 'Group' }, width: '120px' },
      { key: 'contractName', label: { zh: '合同', en: 'Contract' }, width: '120px' },
    ],
    formFields: [
      { key: 'name',       label: { zh: '姓名', en: 'Name' }, type: 'text' },
      { key: 'employeeNo', label: { zh: '工号', en: 'Employee No' }, type: 'text' },
      { key: 'groupId',    label: { zh: '班组ID', en: 'Group ID' }, type: 'number' },
      { key: 'contractId', label: { zh: '合同ID', en: 'Contract ID' }, type: 'number' },
    ],
  },

  'leave-types': {
    title: { zh: '假期类型', en: 'Leave Types' },
    apiPath: '/leave-types',
    columns: [
      { key: 'code',        label: { zh: '编码', en: 'Code' }, width: '100px' },
      { key: 'name',        label: { zh: '名称', en: 'Name' } },
      { key: 'isPaid',      label: { zh: '计薪', en: 'Paid' }, width: '60px' },
      { key: 'maxDaysYear', label: { zh: '年上限(天)', en: 'Max Days/Year' }, width: '120px' },
      { key: 'color',       label: { zh: '颜色', en: 'Color' }, width: '100px' },
    ],
    formFields: [
      { key: 'code',        label: { zh: '编码', en: 'Code' }, type: 'text' },
      { key: 'name',        label: { zh: '名称', en: 'Name' }, type: 'text' },
      { key: 'isPaid',      label: { zh: '是否计薪', en: 'Is Paid' }, type: 'boolean' },
      { key: 'maxDaysYear', label: { zh: '年上限（天）', en: 'Max Days/Year' }, type: 'number' },
      { key: 'color',       label: { zh: '颜色', en: 'Color' }, type: 'color' },
    ],
  },

  leaves: {
    title: { zh: '休假申请', en: 'Leave Requests' },
    apiPath: '/leaves',
    columns: [
      { key: 'agentName',   label: { zh: '坐席', en: 'Agent' } },
      { key: 'leaveTypeId', label: { zh: '类型', en: 'Type' }, width: '80px' },
      { key: 'startTime',   label: { zh: '开始', en: 'Start' }, width: '160px' },
      { key: 'endTime',     label: { zh: '结束', en: 'End' }, width: '160px' },
      { key: 'isFullDay',   label: { zh: '全天', en: 'Full Day' }, width: '70px' },
      { key: 'status',      label: { zh: '状态', en: 'Status' }, width: '80px' },
      { key: 'isPrePlanned', label: { zh: '预排', en: 'Pre-plan' }, width: '70px' },
    ],
    formFields: [
      { key: 'agentId',     label: { zh: '坐席ID', en: 'Agent ID' }, type: 'number' },
      { key: 'leaveTypeId', label: { zh: '假期类型ID', en: 'Leave Type ID' }, type: 'number' },
      { key: 'startTime',   label: { zh: '开始时间 (ISO)', en: 'Start (ISO)' }, type: 'text' },
      { key: 'endTime',     label: { zh: '结束时间 (ISO)', en: 'End (ISO)' }, type: 'text' },
      { key: 'isFullDay',   label: { zh: '全天', en: 'Full Day' }, type: 'boolean' },
      { key: 'isPrePlanned', label: { zh: '预排休假', en: 'Pre-planned' }, type: 'boolean' },
      { key: 'note',        label: { zh: '备注', en: 'Note' }, type: 'text' },
    ],
  },

  rules: {
    title: { zh: '规则定义', en: 'Rule Definitions' },
    apiPath: '/rules/definitions',
    columns: [
      { key: 'code',            label: { zh: '编码', en: 'Code' }, width: '180px' },
      { key: 'name',            label: { zh: '名称', en: 'Name' } },
      { key: 'category',        label: { zh: '分类', en: 'Category' }, width: '90px' },
      { key: 'stage',           label: { zh: '阶段', en: 'Stage' }, width: '110px' },
      { key: 'scopeType',       label: { zh: '范围', en: 'Scope' }, width: '80px' },
      { key: 'severityDefault', label: { zh: '严重性', en: 'Severity' }, width: '80px' },
    ],
    formFields: [
      { key: 'code', label: { zh: '编码', en: 'Code' }, type: 'text' },
      { key: 'name', label: { zh: '名称', en: 'Name' }, type: 'text' },
      { key: 'category', label: { zh: '分类', en: 'Category' }, type: 'select', options: [
        { value: 'activity', label: 'Activity' }, { value: 'contract', label: 'Contract' },
        { value: 'group', label: 'Group' }, { value: 'staffing', label: 'Staffing' }, { value: 'plan', label: 'Plan' },
      ]},
      { key: 'stage', label: { zh: '阶段', en: 'Stage' }, type: 'select', options: [
        { value: 'generate', label: 'Generate' }, { value: 'edit_preview', label: 'Edit Preview' },
        { value: 'edit_commit', label: 'Edit Commit' }, { value: 'publish', label: 'Publish' },
      ]},
      { key: 'scopeType', label: { zh: '范围类型', en: 'Scope Type' }, type: 'select', options: [
        { value: 'global', label: 'Global' }, { value: 'activity', label: 'Activity' },
        { value: 'contract', label: 'Contract' }, { value: 'group', label: 'Group' }, { value: 'plan', label: 'Plan' },
      ]},
      { key: 'severityDefault', label: { zh: '默认严重性', en: 'Default Severity' }, type: 'select', options: [
        { value: 'error', label: 'Error' }, { value: 'warning', label: 'Warning' }, { value: 'info', label: 'Info' },
      ]},
      { key: 'description', label: { zh: '描述', en: 'Description' }, type: 'text' },
    ],
  },

  staffing: {
    title: { zh: '覆盖需求', en: 'Staffing Requirements' },
    apiPath: '/staffing-requirements',
    columns: [
      { key: 'planId',    label: { zh: '方案', en: 'Plan' }, width: '60px' },
      { key: 'date',      label: { zh: '日期', en: 'Date' }, width: '100px' },
      { key: 'startTime', label: { zh: '开始', en: 'Start' }, width: '160px' },
      { key: 'endTime',   label: { zh: '结束', en: 'End' }, width: '160px' },
      { key: 'minAgents', label: { zh: '最小人数', en: 'Min Agents' }, width: '90px' },
      { key: 'skillId',   label: { zh: '技能', en: 'Skill' }, width: '60px' },
      { key: 'channel',   label: { zh: '渠道', en: 'Channel' }, width: '80px' },
    ],
    formFields: [
      { key: 'planId',    label: { zh: '方案ID', en: 'Plan ID' }, type: 'number' },
      { key: 'date',      label: { zh: '日期 (YYYY-MM-DD)', en: 'Date (YYYY-MM-DD)' }, type: 'text' },
      { key: 'startTime', label: { zh: '开始时间 (ISO)', en: 'Start (ISO)' }, type: 'text' },
      { key: 'endTime',   label: { zh: '结束时间 (ISO)', en: 'End (ISO)' }, type: 'text' },
      { key: 'minAgents', label: { zh: '最小人数', en: 'Min Agents' }, type: 'number' },
      { key: 'skillId',   label: { zh: '技能ID（可选）', en: 'Skill ID (optional)' }, type: 'number' },
      { key: 'channel',   label: { zh: '渠道（可选）', en: 'Channel (optional)' }, type: 'text' },
    ],
  },
}
