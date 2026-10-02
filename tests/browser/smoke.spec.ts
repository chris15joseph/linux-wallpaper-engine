import { test, expect } from '@playwright/test'

if (!process.env.LWE_BROWSER_URL)
  throw new Error('Use vp run verify:web to start isolated fixtures')

test('same renderer loads library, media, displays, playlists, settings and Workshop unavailable state', async ({
  page,
}, testInfo) => {
  const failures: string[] = []
  const consoleEntries: string[] = []
  const networkEntries: string[] = []
  page.on('pageerror', (error) => failures.push(error.message))
  page.on('console', (message) => {
    consoleEntries.push(`${message.type()}: ${message.text()}`)
    if (message.type() === 'error') failures.push(message.text())
  })
  page.on('requestfailed', (request) =>
    failures.push(`${request.url()}: ${request.failure()?.errorText}`),
  )
  page.on('response', (response) => {
    networkEntries.push(`${response.status()} ${response.url()}`)
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`)
  })
  try {
    await page.goto('/')
    await expect(page.getByText('Aurora Coast', { exact: true }).first()).toBeVisible()
    const images = page.locator('img[src*="/api/media"]')
    await expect(images.first()).toBeVisible()
    await expect
      .poll(() =>
        images.evaluateAll((nodes) =>
          nodes.every(
            (node) => node instanceof HTMLImageElement && node.complete && node.naturalWidth > 0,
          ),
        ),
      )
      .toBe(true)
    await page.screenshot({ path: testInfo.outputPath('library.png'), fullPage: true })
    await page.goto('/displays')
    await expect(page.getByText('DP-1', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('HDMI-A-1', { exact: true }).first()).toBeVisible()
    await page.goto('/playlists')
    await expect(page.getByText('Evening rotation', { exact: true }).first()).toBeVisible()
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
    const fullscreenSwitch = page
      .getByText('Pause on fullscreen apps', { exact: true })
      .locator('..')
      .getByRole('switch')
    await expect(fullscreenSwitch).toBeChecked()
    await fullscreenSwitch.click()
    await expect(fullscreenSwitch).not.toBeChecked()
    await page.reload()
    await expect(fullscreenSwitch).not.toBeChecked()
    await fullscreenSwitch.click()
    await expect(fullscreenSwitch).toBeChecked()
    await page.goto('/workshop')
    await expect(page.getByText(/Start Steam/).first()).toBeVisible({ timeout: 15000 })
    await page.screenshot({ path: testInfo.outputPath('workshop.png'), fullPage: true })
    expect(failures).toEqual([])
  } finally {
    await testInfo.attach('console', { body: consoleEntries.join('\n'), contentType: 'text/plain' })
    await testInfo.attach('network', { body: networkEntries.join('\n'), contentType: 'text/plain' })
    await testInfo.attach('failures', { body: failures.join('\n'), contentType: 'text/plain' })
  }
})
