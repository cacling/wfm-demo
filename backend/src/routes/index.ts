/** 路由注册 */
import { Hono } from 'hono'
import activitiesRouter from './activities'
import agentsRouter from './agents'
import contractsRouter from './contracts'
import groupsRouter from './groups'
import shiftsRouter from './shifts'
import leavesRouter from './leaves'
import plansRouter from './plans'
import skillsRouter from './skills'
import leaveTypesRouter from './leave-types'
import rulesRouter from './rules'
import staffingRouter from './staffing'

export function registerRoutes(app: Hono) {
  app.route('/api/activities', activitiesRouter)
  app.route('/api/agents', agentsRouter)
  app.route('/api/contracts', contractsRouter)
  app.route('/api/groups', groupsRouter)
  app.route('/api/shifts', shiftsRouter)
  app.route('/api/leaves', leavesRouter)
  app.route('/api/plans', plansRouter)
  app.route('/api/skills', skillsRouter)
  app.route('/api/leave-types', leaveTypesRouter)
  app.route('/api/rules', rulesRouter)
  app.route('/api/staffing-requirements', staffingRouter)
}
