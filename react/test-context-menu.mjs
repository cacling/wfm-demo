import puppeteer from 'puppeteer-core'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

function findBlock(page, bgColor, minWidth = 20) {
  return page.evaluate((bg, mw) => {
    const els = document.querySelectorAll(`[style*="background-color: ${bg}"]`)
    for (const el of els) {
      const rect = el.getBoundingClientRect()
      if (rect.width > mw && rect.height > 20) {
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, w: rect.width }
      }
    }
    return null
  }, bgColor, minWidth)
}

function countBlocks(page, bgColor) {
  return page.evaluate((bg) => {
    let n = 0
    for (const el of document.querySelectorAll(`[style*="background-color: ${bg}"]`)) {
      if (el.getBoundingClientRect().width > 20) n++
    }
    return n
  }, bgColor)
}

async function clickMenuItem(page, text) {
  return page.evaluate((t) => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.includes(t))
    if (btn) { btn.click(); return true }
    return false
  }, text)
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-proxy-server', '--window-size=1600,900'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1600, height: 900 })
  page.on('console', (m) => console.log('[B]', m.text()))
  await page.goto('http://localhost:3200/', { waitUntil: 'networkidle0' })

  // === Test 1: Delete Break via right-click ===
  console.log('\n=== Test 1: Delete Break via right-click ===')
  const breaksBefore = await countBlocks(page, 'rgb(250, 204, 21)')
  console.log(`Breaks before: ${breaksBefore}`)

  const brk = await findBlock(page, 'rgb(250, 204, 21)')
  await page.mouse.click(brk.x, brk.y, { button: 'right' })
  await new Promise(r => setTimeout(r, 200))
  await clickMenuItem(page, 'Delete')
  await new Promise(r => setTimeout(r, 200))

  const breaksAfter = await countBlocks(page, 'rgb(250, 204, 21)')
  console.log(`Breaks after: ${breaksAfter}`)
  console.log(breaksAfter === breaksBefore - 1 ? 'PASS' : 'FAIL')
  await page.screenshot({ path: '/tmp/ctx-test-1-delete.png' })

  // === Test 2: Add Training via right-click on Work ===
  console.log('\n=== Test 2: Add Training on Work block ===')
  const trainingBefore = await countBlocks(page, 'rgb(129, 140, 248)')
  console.log(`Trainings before: ${trainingBefore}`)

  const work = await findBlock(page, 'rgb(74, 222, 128)', 100)
  await page.mouse.click(work.x, work.y, { button: 'right' })
  await new Promise(r => setTimeout(r, 200))
  await page.screenshot({ path: '/tmp/ctx-test-2-add-menu.png' })
  await clickMenuItem(page, 'Training')
  await new Promise(r => setTimeout(r, 200))

  const trainingAfter = await countBlocks(page, 'rgb(129, 140, 248)')
  console.log(`Trainings after: ${trainingAfter}`)
  console.log(trainingAfter === trainingBefore + 1 ? 'PASS' : 'FAIL')
  await page.screenshot({ path: '/tmp/ctx-test-2-after-add.png' })

  // === Test 3: Keyboard delete ===
  console.log('\n=== Test 3: Keyboard delete (Backspace) ===')
  const meetingsBefore = await countBlocks(page, 'rgb(59, 130, 246)')
  console.log(`Meetings before: ${meetingsBefore}`)

  const meeting = await findBlock(page, 'rgb(59, 130, 246)')
  if (meeting) {
    // Left-click to select, then press Backspace
    await page.mouse.click(meeting.x, meeting.y)
    await new Promise(r => setTimeout(r, 100))
    await page.keyboard.press('Backspace')
    await new Promise(r => setTimeout(r, 200))

    const meetingsAfter = await countBlocks(page, 'rgb(59, 130, 246)')
    console.log(`Meetings after: ${meetingsAfter}`)
    console.log(meetingsAfter === meetingsBefore - 1 ? 'PASS' : 'FAIL')
  }

  // === Test 4: Delete via hover × button ===
  console.log('\n=== Test 4: Delete via hover × button ===')
  const offlineBefore = await countBlocks(page, 'rgb(249, 115, 22)')
  console.log(`Offlines before: ${offlineBefore}`)

  const offline = await findBlock(page, 'rgb(249, 115, 22)')
  if (offline) {
    // Hover to show × button
    await page.mouse.move(offline.x, offline.y)
    await new Promise(r => setTimeout(r, 300))

    // Find the × button (bg-red-500)
    const deleted = await page.evaluate((ox, oy) => {
      const els = document.querySelectorAll('button')
      for (const el of els) {
        const rect = el.getBoundingClientRect()
        // × button near the hovered block
        if (el.textContent?.trim() === '✕' && Math.abs(rect.top - oy) < 40 && Math.abs(rect.left - ox) < 100) {
          el.click()
          return true
        }
      }
      return false
    }, offline.x, offline.y)

    await new Promise(r => setTimeout(r, 200))
    const offlineAfter = await countBlocks(page, 'rgb(249, 115, 22)')
    console.log(`Offlines after: ${offlineAfter}`)
    console.log(deleted && offlineAfter === offlineBefore - 1 ? 'PASS' : 'FAIL')
  }

  await page.screenshot({ path: '/tmp/ctx-test-final.png' })
  await browser.close()
  console.log('\nAll tests done!')
}

main().catch(console.error)
