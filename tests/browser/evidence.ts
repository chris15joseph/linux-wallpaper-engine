import { expect, type Page, type TestInfo } from '@playwright/test'

export async function withEvidence(
  page: Page,
  testInfo: TestInfo,
  run: () => Promise<void>,
  label = 'page',
) {
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
    await run()
    expect(failures).toEqual([])
  } finally {
    await testInfo.attach(`${label}-console`, {
      body: consoleEntries.join('\n'),
      contentType: 'text/plain',
    })
    await testInfo.attach(`${label}-network`, {
      body: networkEntries.join('\n'),
      contentType: 'text/plain',
    })
    await testInfo.attach(`${label}-failures`, {
      body: failures.join('\n'),
      contentType: 'text/plain',
    })
  }
}
