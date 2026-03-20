/**
 * index.ts — WFM 后端入口
 *
 * Hono + Bun，端口 3210
 * CORS 允许前端 3201 访问
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { registerRoutes } from './routes'

const app = new Hono()

// CORS — 允许前端开发服务器访问
app.use('/*', cors({
  origin: ['http://localhost:3201', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
}))

// 注册所有路由
registerRoutes(app)

// 健康检查
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

const port = 3210
console.log(`WFM Backend running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
