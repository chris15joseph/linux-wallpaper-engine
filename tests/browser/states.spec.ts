import { test, expect } from '@playwright/test'
import { withEvidence } from './evidence'

if (!process.env.LWE_BROWSER_EMPTY_URL || !process.env.LWE_BROWSER_MISSING_URL)
  throw new Error('Use vp run verify:web to start isolated fixtures')

test('fixture boundary state renders and actions remain honest', async ({ page }, testInfo) => {
  await withEvidence(page, testInfo, async () => {
    await page.goto('/')
    if (testInfo.project.name === 'empty') {
      await expect(page.getByText('No wallpapers found', { exact: true })).toBeVisible()
      await page.goto('/#/playlists')
      await expect(page.getByText('No playlists yet', { exact: true })).toBeVisible()
      await page.goto('/#/displays')
      await expect(page.getByText('DP-1', { exact: true }).first()).toBeVisible()
      await expect(page.getByText('No active wallpaper', { exact: true })).toBeVisible()
    } else {
      await page.getByRole('heading', { name: 'Aurora Coast', exact: true }).click()
      await page.getByRole('button', { name: 'Apply', exact: true }).click()
      await expect(
        page.getByRole('heading', { name: 'linux-wallpaperengine is missing' }),
      ).toBeVisible()
      await page.getByRole('button', { name: 'Dismiss' }).click()
      await expect(page.getByText('No active wallpaper', { exact: true })).toBeVisible()
      await page.goto('/#/playlists')
      await page.getByRole('button', { name: 'Apply', exact: true }).click()
      await expect(
        page.getByRole('heading', { name: 'linux-wallpaperengine is missing' }),
      ).toBeVisible()
      await page.getByRole('button', { name: 'Dismiss' }).click()
      await expect(page.getByText('No active wallpaper', { exact: true })).toBeVisible()
    }
    await page.screenshot({
      path: testInfo.outputPath(`${testInfo.project.name}.png`),
      fullPage: true,
    })
  })
})
