export const DEV_API_PATH = '/api/trpc'
export const DEV_MEDIA_PATH = '/api/media'
// Dev backend for browser tabs, started by Electron main during `bun dev` and `bun run dev:full`
export const DEV_BACKEND_PORT = 5180

// What `electron-forge start` opens, set through DEV_TARGET by the dev scripts in package.json
export const DEV_TARGETS = ['web', 'desktop', 'full'] as const
export type DevTarget = (typeof DEV_TARGETS)[number]
