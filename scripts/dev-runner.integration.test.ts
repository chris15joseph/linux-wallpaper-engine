import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { createTRPCClient, createWSClient, wsLink } from '@trpc/client'
import type { AppRouter } from '../src/main/trpc/router'
import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, it } from 'vite-plus/test'
import { stopOwnedProcess } from './dev-process'
import { DEV_HEALTH_PATH, DEV_API_PATH, DEV_MEDIA_PATH } from '../src/shared/constants/development'

// Requires Electron's native libraries and a graphical session or xvfb.
// Opt-in so ordinary unit tests remain usable without either.
it.skipIf(process.env.LWE_NATIVE_BRIDGE_TEST !== '1')(
  'starts the owned native backend and Vite proxy, reports ports, and cleans up',
  async () => {
    const runner = spawn(process.execPath, ['scripts/dev-runner.ts', '--fixtures'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const errors: string[] = []
    runner.stderr.on('data', (chunk: Buffer) => errors.push(chunk.toString()))
    try {
      const ready = await new Promise<{ url: string; backendPort: number; dataDirectory: string }>(
        (resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error(`Readiness timeout: ${errors.join('')}`)),
            40000,
          )
          runner.once('error', (error) => {
            clearTimeout(timeout)
            reject(error)
          })
          runner.once('exit', (code) => {
            clearTimeout(timeout)
            reject(new Error(`Runner exited ${code}: ${errors.join('')}`))
          })
          createInterface({ input: runner.stdout }).on('line', (line) => {
            if (line.startsWith('LWE_WEB_READY ')) {
              clearTimeout(timeout)
              resolve(JSON.parse(line.slice(14)))
            }
          })
        },
      )
      console.log(`Bridge ready: ${ready.url}; isolated data: ${ready.dataDirectory}`)
      expect(ready.dataDirectory).toContain('.dev-runtime')
      expect((await fetch(ready.url + DEV_HEALTH_PATH)).status).toBe(200)
      expect((await fetch(ready.url)).status).toBe(200)
      expect(
        (await fetch(ready.url + DEV_HEALTH_PATH, { headers: { origin: 'https://example.com' } }))
          .status,
      ).toBe(403)
      expect((await fetch(`http://127.0.0.1:${ready.backendPort}${DEV_HEALTH_PATH}`)).status).toBe(
        403,
      )
      const ws = createWSClient({ url: ready.url.replace('http:', 'ws:') + DEV_API_PATH })
      try {
        const client = createTRPCClient<AppRouter>({ links: [wsLink({ client: ws })] })
        expect(await client.health.query()).toEqual({ status: 'ok' })
        const wallpapers = (await client.wallpaper.getWallpapers.query()).wallpapers
        expect(wallpapers).toHaveLength(3)
        const preview = await fetch(
          ready.url + DEV_MEDIA_PATH + '?path=' + encodeURIComponent(wallpapers[0].thumbnail),
        )
        expect(preview.status).toBe(200)
        expect(preview.headers.get('content-type')).toBe('image/svg+xml')
        await client.settings.update.mutate({ volume: 42 })
        const settings = JSON.parse(
          await fs.readFile(path.join(ready.dataDirectory, 'settings.json'), 'utf-8'),
        ) as { volume: number }
        expect(settings.volume).toBe(42)
      } finally {
        await ws.close()
      }
      await stopOwnedProcess(runner)
      expect(runner.exitCode).toBe(0)
      await expect(fetch(ready.url + DEV_HEALTH_PATH)).rejects.toThrow()
      await expect(
        fetch(`http://127.0.0.1:${ready.backendPort}${DEV_HEALTH_PATH}`),
      ).rejects.toThrow()
    } finally {
      await stopOwnedProcess(runner)
    }
  },
  50000,
)
