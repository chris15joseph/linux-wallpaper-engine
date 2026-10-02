# Development and verification

Use Node `^22.18.0 || ^24.11.0 || >=26` and Bun **1.4.2**. The repository pins **Vite+ 1.0.0-rc.1**, including its Vite 8.3.1 / Vitest 5.0.1 / Oxlint / Oxfmt toolchain. Install the matching global `vp` following the [official setup guide](https://viteplus.dev/guide/), or invoke the installed CLI with `bunx --no-install vp` after `bun install --frozen-lockfile`. There is no need to change global configuration.

```bash
bun install --frozen-lockfile
vp check
vp test
vp build
vp run package
```

`vp check`, `vp test`, `vp lint`, `vp fmt`, and `vp build` are builtins. `vp run check:all`, `vp run typecheck`, `vp run build:web`, and the development/verification commands below are repository scripts. `check:all` runs static checks and unit/integration tests; `typecheck` retains the explicit TypeScript compiler check. Tests import `vite-plus/test`. Tooling configuration is in `vite.config.mts`; the three Forge layer configs remain separate.

Vite was upgraded to 8 before following the [Vite+ migration](https://viteplus.dev/guide/migrate). Forge 7's Vite plugin still builds main/preload/renderer bundles and packages `steamworks.js` with its native files. The `vite` dependency aliases the matching Vite+ core so Forge and plugins resolve the same Vite version. ESM `.mts` configs preserve the Tailwind plugin's default export without converting the packaged CommonJS main process to ESM. The suite passes with Vitest 5's default mock clearing: no v4 compatibility settings remain. Type-aware checks are enabled; existing warnings are visible, and unhandled background calls are explicitly marked where their completion is intentionally independent of the caller.

## Browser development

```bash
vp run dev:web --fixtures
# Additional representative states:
vp run dev:web --fixtures --scenario=empty
vp run dev:web --fixtures --scenario=missing-backend
# Read the installed wallpaper catalog with isolated application state:
vp run dev:web
# Native desktop integration, using ordinary desktop state and integrations:
vp run dev:desktop
```

The browser command builds and starts an Electron backend **without a normal app window or tray**, then starts Vite for the **same React renderer**. Electron's native libraries and a graphical session are still required. On a headless Linux host, use `xvfb-run -a` for commands that start Electron. This is a development capability, not a hosted web edition of the application.

The runner prints `Browser UI`, `Backend`, `Data`, and `Mode`, followed by a machine-readable `LWE_WEB_READY` record. Both listeners bind to `127.0.0.1` and receive available ports from the OS. Use the printed URL/port; do not assume a fixed port. Readiness comes from the backend listener plus an HTTP health check. Vite provides frontend HMR; restart the command after backend changes.

Application storage is selected **before** importing the eager stores/router/services. It lives in `.dev-runtime/<worktree-hash>/<mode>` inside this checkout, separated by fixture scenario and from the user's configuration. Browser mode skips startup sync/restore and autostart writes. Playlists use an isolated Steam-format config. Native apply/stop and compatibility scans are blocked in real browser mode; use desktop mode to verify the native engine. Settings and override edits affect only development stores. Real browser mode can read the installed catalog, displays, desktop theme and Workshop; Steam subscriptions are real external operations. Use fixtures for deterministic verification.

Fixtures create three installed wallpapers with SVG thumbnails/previews, two displays, an editable playlist, settings, and an unavailable Workshop event/error. They replace selected **service methods**, not router procedures: queries, validation, mutations and observable subscriptions still pass through `appRouter`. Fixture wallpaper apply/stop and playlist start update in-memory state and emit the normal invalidations. A fixture launch resets its isolated settings, overrides, active state and playlist seed; mutations persist for that run.

Browser tRPC uses a same-origin WebSocket URL; native renderers retain IPC. Vite proxies `/api` to the backend and injects a private per-run credential that is never compiled into frontend code. The backend rejects missing credentials, cross-site requests and mismatched WebSocket origins and non-loopback forwarding hosts. It serves only catalog-advertised thumbnail/preview files inside their resolved wallpaper directories, with MIME types, HEAD requests and single byte ranges. Arbitrary files, project JSON, path traversal and symlink escapes are rejected. Remote HTTP media URLs remain intact. Browser external links open a new browser tab; window actions cannot operate a native host window.

Ctrl+C/SIGTERM closes the frontend and captured backend process; failures during startup also clean up owned resources. The runner never finds or kills processes by name or occupied-port patterns. You may remove this checkout's `.dev-runtime` while its runner is stopped to reset development state.

## Regression evidence

```bash
vp test
# Focused real Electron runner/proxy integration; no browser automation:
vp run verify:bridge
# Install Chromium for the optional browser regression suite:
vp exec playwright install chromium
# Starts isolated fixtures, runs Chromium, captures evidence, then cleans up:
vp run verify:web
```

`verify:bridge` checks actual Electron startup, reported ports/data isolation, the Vite proxy's readiness/authentication boundary, and process/listener cleanup. It is opt-in because native libraries and a graphical session are required. Unit tests cover the real router with fixture adapters, validation and mutation effects, WebSocket invalidation/Workshop subscriptions and reconnect, media MIME/HEAD/ranges and symlink rejection, renderer media mapping and owned process cleanup.

`verify:web` uses standard Playwright, independent of T3's browser controller. It checks library/media loading, displays, playlists, a settings mutation after reload, and Workshop unavailability. JavaScript exceptions, console errors, failed requests and HTTP failures fail the test. It exits nonzero for startup or test failures. Screenshots, traces, console/network attachments and failure diagnostics are in `test-results/browser` and `playwright-report`; the owned server log is `test-results/dev-server.log`. These and runtime data are gitignored. Run `vp exec playwright show-report` to review the HTML evidence. This command explicitly launches browser automation; agents should run it only when browser automation is authorized.

## T3 preview verification for agents

T3 owns its shared Chromium and `preview_*` tools. This repository adds no MCP broker or browser controller. When browser use is authorized, start `vp run dev:web --fixtures`, read the actual port, and use T3's `preview_status`, `preview_open` and `preview_navigate` with an environment-port target. Inspect snapshots and diagnostics, use semantic targets to interact, resize the viewport, and save screenshots plus console/network findings with the review evidence.

Verify the populated library, a loaded thumbnail/preview, both displays, a settings change after reload, fixture wallpaper/playlist actions and resulting UI invalidation, and Workshop unavailability. Restart the backend to assess reconnect and recovery. Include empty and missing-backend scenarios when those states are affected. Stop only the runner you started. Do not claim a live browser pass from unit tests, a build, or a screenshot alone.

Desktop tray/close/startup behavior, real Steam access/downloads, autostart entries, native display controls and actual wallpaper rendering still require native desktop checks. Browser fixtures simulate those boundaries.

## CI and Nix

The development-check workflow installs the frozen Bun lockfile under Node 24, runs Vite+ static checks/tests/build, and packages with Forge. No browser launch is required by default. The optional browser suite needs Chromium and Electron's system dependencies, plus a graphical session or xvfb.

Local installation refreshes `distro/nix/bun.nix` with bun2nix. CI (`CI=true`) skips regeneration so a frozen install cannot rewrite tracked source; after dependency changes run `vp run nix:lock` and commit **both** dependency locks. Nix packaging continues through Forge and uses the maintained bun2nix lock and existing offline Electron override. `nix build` requires the repository's Nix toolchain; a Forge package pass alone does not establish a Nix build pass.
