/** 路由注册 */
import { Hono } from 'hono'
import activitiesRouter from './activities'
import agentsRouter from './agents'
import contractsRouter from './contracts'
import groupsRouter from './groups'
import shiftsRouter from './shifts'
import leavesRouter from './leaves'
import plansRouter from './plans'

export function registerRoutes(app: Hono) {
  app.route('/api/activities', activitiesRouter)
  app.route('/api/agents', agentsRouter)
  app.route('/api/contracts', contractsRouter)
  app.route('/api/groups', groupsRouter)
  app.route('/api/shifts', shiftsRouter)
  app.route('/api/leaves', leavesRouter)
  app.route('/api/plans', plansRouter)
}
