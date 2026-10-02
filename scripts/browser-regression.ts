import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import { stopOwnedProcess } from './dev-process.ts'

// Explicit verification command only: never runs during unit tests or installation.
const require = createRequire(import.meta.url)
await fs.mkdir('test-results', { recursive: true })
const logs: string[] = []
const runner = spawn(process.execPath, ['scripts/dev-runner.ts', '--fixtures'], {
  stdio: ['ignore', 'pipe', 'pipe'],
})
let tests: ReturnType<typeof spawn> | undefined
let stopping = false
let backendFailed = false
async function cleanup() {
  stopping = true
  await Promise.all([stopOwnedProcess(runner), tests ? stopOwnedProcess(tests) : undefined])
  await fs.writeFile('test-results/dev-server.log', logs.join('\n'))
}
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    void cleanup().then(() => process.exit(1))
  })
runner.stderr.on('data', (chunk: Buffer) => {
  logs.push(chunk.toString())
  process.stderr.write(chunk)
})
try {
  const url = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Development runner readiness timed out')),
      60000,
    )
    runner.once('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    runner.once('exit', (code) => {
      if (!stopping) backendFailed = true
      clearTimeout(timeout)
      reject(new Error(`Development runner exited (${code})`))
      tests?.kill('SIGTERM')
    })
    createInterface({ input: runner.stdout }).on('line', (line) => {
      logs.push(line)
      console.log(line)
      if (line.startsWith('LWE_WEB_READY ')) {
        clearTimeout(timeout)
        resolve((JSON.parse(line.slice(14)) as { url: string }).url)
      }
    })
  })
  tests = spawn(
    process.execPath,
    [require.resolve('@playwright/test/cli'), 'test', ...process.argv.slice(2)],
    { stdio: 'inherit', env: { ...process.env, LWE_BROWSER_URL: url } },
  )
  const testExitCode = await new Promise<number>((resolve, reject) => {
    tests!.once('error', reject)
    tests!.once('exit', (code) => resolve(code ?? 1))
  })
  process.exitCode = backendFailed ? 1 : testExitCode
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  await cleanup()
}
