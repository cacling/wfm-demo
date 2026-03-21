import { test, expect, describe, beforeAll } from 'bun:test'
import { ensurePlanExists } from './setup'
import { post, api, del } from './helpers'
let actId: number, patternId: number, shiftId: number, pkgId: number
describe('US12 - Master Data Chain', () => {
  beforeAll(async () => { await ensurePlanExists() })
  test('create COACHING activity', async () => { const r = await post('/activities', {code:'COACHING',name:'Coaching',color:'#10b981',priority:35,isPaid:true,isCoverable:true,canCover:true,icon:'cap'}); expect(r.id).toBeTruthy(); actId = r.id })
  test('create shift pattern', async () => { const r = await post('/shifts/patterns', {name:'Test',description:'e2e'}); expect(r.id).toBeTruthy(); patternId = r.id })
  test('create shift', async () => { const r = await post('/shifts', {patternId,name:'Test 09-16',startTime:'09:00',endTime:'16:00',durationMinutes:420}); expect(r.id).toBeTruthy(); shiftId = r.id })
  test('add activity template', async () => { const r = await post('/shifts/'+shiftId+'/activities', {activityId:actId,offsetMinutes:0,durationMinutes:120,sortOrder:1}); expect(r.id).toBeTruthy() })
  test('create shift package', async () => { const r = await post('/shifts/packages', {name:'Test Pkg'}); expect(r.id).toBeTruthy(); pkgId = r.id })
  test('add shift to package', async () => { const r = await post('/shifts/packages/'+pkgId+'/items', {shiftId}); expect(r.id).toBeTruthy() })
  test('shift has activity template', async () => { const d = await api('/shifts/'+shiftId); expect(d.activities.length).toBe(1) })
  test('package has shift', async () => { const d = await api('/shifts/packages/'+pkgId); expect(d.shifts.length).toBe(1) })
  test('COACHING in activities list', async () => { expect((await api('/activities')).find((a:any)=>a.code==='COACHING')).toBeTruthy() })
  test('cleanup: delete shift activity templates then activity', async () => {
    // First clean up activity templates that reference COACHING activities (FK constraint)
    const allActivities = await api('/activities')
    const coachingActivities = allActivities.filter((a: any) => a.code === 'COACHING')
    // For each shift, check its activity templates and delete COACHING refs
    const allShifts = await api('/shifts')
    for (const shift of allShifts) {
      const templates = await api('/shifts/' + shift.id + '/activities')
      for (const t of (Array.isArray(templates) ? templates : [])) {
        if (coachingActivities.some((a: any) => a.id === t.activityId)) {
          await del('/shifts/activities/' + t.id).catch(() => {})
        }
      }
    }
    // Now delete all COACHING activities
    for (const a of coachingActivities) {
      await del('/activities/' + a.id).catch(() => {})
    }
    const remaining = await api('/activities')
    expect(remaining.find((a: any) => a.code === 'COACHING')).toBeUndefined()
  })
})
