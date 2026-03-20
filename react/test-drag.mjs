import puppeteer from 'puppeteer-core'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-proxy-server', '--window-size=1600,900'],
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1600, height: 900 })
  page.on('console', (msg) => console.log('[BROWSER]', msg.text()))

  await page.goto('http://localhost:3200/', { waitUntil: 'networkidle0' })

  // Find George Gray's Break block (yellow)
  const blockInfo = await page.evaluate(() => {
    const allBlocks = document.querySelectorAll('[class*="cursor-grab"]')
    console.log(`Total blocks: ${allBlocks.length}`)

    // Find a yellow/break block - check background color
    for (const el of allBlocks) {
      const bg = el.style.backgroundColor
      const text = el.textContent?.trim()
      if (text === 'Break' || bg === 'rgb(250, 204, 21)') {
        const rect = el.getBoundingClientRect()
        console.log(`Found Break block at left=${rect.left}, text="${text}", bg="${bg}"`)

        // Also find adjacent Work blocks
        const row = el.closest('[class*="relative border-b"]')
        const rowBlocks = row?.querySelectorAll('[class*="cursor-grab"], [class*="cursor-default"]')
        if (rowBlocks) {
          for (const rb of rowBlocks) {
            const rr = rb.getBoundingClientRect()
            console.log(`  Row block: "${rb.textContent?.trim()}" left=${rr.left.toFixed(0)} right=${rr.right.toFixed(0)} width=${rr.width.toFixed(0)}`)
          }
        }
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          left: rect.left,
          right: rect.right,
          width: rect.width,
        }
      }
    }
    return null
  })

  if (!blockInfo) {
    console.log('ERROR: No Break block found')
    await browser.close()
    return
  }

  await page.screenshot({ path: '/tmp/wfm-drag-before.png' })

  console.log(`\n--- Dragging Break block 120px to the right ---\n`)

  // Drag the break block 120px right
  await page.mouse.move(blockInfo.x, blockInfo.y)
  await page.mouse.down()
  const endX = blockInfo.x + 120
  for (let x = blockInfo.x; x <= endX; x += 10) {
    await page.mouse.move(x, blockInfo.y)
    await new Promise((r) => setTimeout(r, 16))
  }
  await page.mouse.move(endX, blockInfo.y)
  await page.mouse.up()
  await new Promise((r) => setTimeout(r, 200))

  await page.screenshot({ path: '/tmp/wfm-drag-after.png' })

  // Check row blocks after drag
  await page.evaluate(() => {
    // Find the first row (George Gray)
    const rows = document.querySelectorAll('[class*="relative border-b"]')
    const row = rows[0]
    if (!row) return
    console.log('\n--- After drag: George Gray row blocks ---')
    const blocks = row.querySelectorAll('[style*="left"]')
    for (const b of blocks) {
      if (b.querySelector('[class*="cursor-"]')) {
        const inner = b.querySelector('[class*="cursor-"]')
        const rect = b.getBoundingClientRect()
        console.log(`  "${inner?.textContent?.trim()}" left=${rect.left.toFixed(0)} right=${rect.right.toFixed(0)} width=${rect.width.toFixed(0)}`)
      }
    }
  })

  await browser.close()
}

main().catch(console.error)
