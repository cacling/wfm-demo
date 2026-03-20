/**
 * i18n.ts — 轻量国际化（中英双语）
 *
 * 用法：
 *   const { t, lang, toggleLang } = useI18n()
 *   t('schedule_editor')  → '排班编辑器' | 'Schedule Editor'
 */

import { ref, computed } from 'vue'

export type Lang = 'zh' | 'en'

const currentLang = ref<Lang>('zh')

const messages: Record<string, Record<Lang, string>> = {
  // 顶部
  schedule_editor: { zh: 'WFM 排班编辑器', en: 'WFM Schedule Editor' },
  validate: { zh: '校验', en: 'Validate' },
  pre_publish_check: { zh: '发布前检查', en: 'Pre-publish Check' },
  publish: { zh: '发布', en: 'Publish' },
  rollback: { zh: '回滚', en: 'Rollback' },
  published: { zh: '已发布！', en: 'Published!' },
  loading: { zh: '加载中...', en: 'Loading...' },
  drag: { zh: '拖入：', en: 'Drag:' },

  // 左侧导航
  nav_schedule: { zh: '排班编辑器', en: 'Schedule Editor' },
  nav_activities: { zh: '活动类型', en: 'Activities' },
  nav_shifts: { zh: '班次管理', en: 'Shifts & Patterns' },
  nav_contracts: { zh: '合同规则', en: 'Contracts' },
  nav_skills: { zh: '技能管理', en: 'Skills' },
  nav_groups: { zh: '班组管理', en: 'Groups' },
  nav_agents: { zh: '坐席管理', en: 'Agents' },
  nav_leave_types: { zh: '假期类型', en: 'Leave Types' },
  nav_leaves: { zh: '休假申请', en: 'Leave Requests' },
  nav_rules: { zh: '规则引擎', en: 'Rule Engine' },
  nav_staffing: { zh: '覆盖需求', en: 'Staffing Reqs' },

  // 表格
  name: { zh: '姓名', en: 'Name' },
  contract_time: { zh: '合同工时', en: 'Contract time' },
  add: { zh: '+ 新增', en: '+ Add' },
  refresh: { zh: '刷新', en: 'Refresh' },
  edit: { zh: '编辑', en: 'Edit' },
  delete: { zh: '删除', en: 'Delete' },
  save: { zh: '保存', en: 'Save' },
  cancel: { zh: '取消', en: 'Cancel' },
  create: { zh: '新建', en: 'Create' },
  close: { zh: '关闭', en: 'Close' },
  records: { zh: '条记录', en: 'records' },
  no_data: { zh: '暂无数据', en: 'No data' },
  actions: { zh: '操作', en: 'Actions' },

  // 校验弹窗
  validation_passed: { zh: '校验通过', en: 'Validation Passed' },
  validation_issues: { zh: '发现校验问题', en: 'Validation Issues Found' },
  errors: { zh: '错误', en: 'errors' },
  warnings: { zh: '告警', en: 'warnings' },
  infos: { zh: '提示', en: 'infos' },
  error_label: { zh: '错误', en: 'Error' },
  warning_label: { zh: '告警', en: 'Warning' },
  info_label: { zh: '提示', en: 'Info' },
  accept_warnings: { zh: '确认告警并保存', en: 'Accept Warnings & Save' },
  all_checks_passed: { zh: '全部检查通过', en: 'All checks passed. No issues found.' },

  // 右键菜单
  add_activity: { zh: '添加活动', en: 'Add Activity' },

  // 覆盖率
  coverage: { zh: '覆盖率：', en: 'Coverage:' },
  all: { zh: '全部', en: 'All' },

  // 活动类型
  act_work: { zh: '工作', en: 'Work' },
  act_break: { zh: '休息', en: 'Break' },
  act_lunch: { zh: '午餐', en: 'Lunch' },
  act_meeting: { zh: '会议', en: 'Meeting' },
  act_training: { zh: '培训', en: 'Training' },
  act_offline: { zh: '离线', en: 'Offline' },
  act_sick_leave: { zh: '病假', en: 'Sick Leave' },
  act_day_off: { zh: '休息日', en: 'Day Off' },
  act_other: { zh: '其他', en: 'Other' },
}

export function useI18n() {
  const lang = computed(() => currentLang.value)

  function t(key: string): string {
    return messages[key]?.[currentLang.value] || key
  }

  function toggleLang() {
    currentLang.value = currentLang.value === 'zh' ? 'en' : 'zh'
  }

  function setLang(l: Lang) {
    currentLang.value = l
  }

  return { t, lang, toggleLang, setLang }
}
