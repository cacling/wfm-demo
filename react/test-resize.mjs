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

  // Find a block and its right resize handle
  const blockInfo = await page.evaluate(() => {
    const blocks = document.querySelectorAll('[class*="cursor-grab"]')
    const block = blocks[0]
    const rect = block.getBoundingClientRect()

    // The right resize handle is the last child with cursor-ew-resize
    const handles = block.parentElement.querySelectorAll('[class*="cursor-ew-resize"]')
    console.log(`Found ${handles.length} resize handles`)

    const rightHandle = handles[1] // second handle = right
    const handleRect = rightHandle?.getBoundingClientRect()

    return {
      blockLeft: rect.left,
      blockRight: rect.right,
      blockWidth: rect.width,
      handleX: handleRect ? handleRect.left + handleRect.width / 2 : rect.right - 2,
      handleY: handleRect ? handleRect.top + handleRect.height / 2 : rect.top + rect.height / 2,
    }
  })

  console.log(`\n--- Block: left=${blockInfo.blockLeft}, right=${blockInfo.blockRight}, width=${blockInfo.blockWidth} ---`)
  console.log(`--- Resize handle at (${blockInfo.handleX}, ${blockInfo.handleY}) ---`)
  console.log(`--- Dragging right edge 80px to the right ---\n`)

  // Hover over block first to make resize handle visible
  const blockCenterX = blockInfo.blockLeft + blockInfo.blockWidth / 2
  await page.mouse.move(blockCenterX, blockInfo.handleY)
  await new Promise((r) => setTimeout(r, 200))

  // Now drag the right edge
  await page.mouse.move(blockInfo.handleX, blockInfo.handleY)
  await new Promise((r) => setTimeout(r, 100))
  await page.mouse.down()

  const endX = blockInfo.handleX + 80
  for (let x = blockInfo.handleX; x <= endX; x += 10) {
    await page.mouse.move(x, blockInfo.handleY)
    await new Promise((r) => setTimeout(r, 16))
  }
  await page.mouse.move(endX, blockInfo.handleY)
  await page.mouse.up()
  await new Promise((r) => setTimeout(r, 100))

  const afterResize = await page.evaluate(() => {
    const blocks = document.querySelectorAll('[class*="cursor-grab"]')
    const block = blocks[0]
    const rect = block.getBoundingClientRect()
    return { left: rect.left, right: rect.right, width: rect.width }
  })

  console.log(`After resize: left=${afterResize.left}, right=${afterResize.right}, width=${afterResize.width}`)
  if (afterResize.width > blockInfo.blockWidth + 10) {
    console.log(`PASS: Block was resized (width ${blockInfo.blockWidth} -> ${afterResize.width})`)
  } else {
    console.log(`FAIL: Block was NOT resized (width unchanged at ${afterResize.width})`)
  }

  await page.screenshot({ path: '/tmp/resize-test-after.png' })
  await browser.close()
}

main().catch(console.error)
