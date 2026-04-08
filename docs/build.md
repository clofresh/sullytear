# Build & PWA

Sullytear ships as a static PWA via Vite. Everything runs client-side — there is no backend.

## Toolchain

- **Vite 5** with `@vitejs/plugin-react`.
- **`vite-plugin-pwa`** with Workbox for the service worker.
- **TypeScript** with project references (`tsc -b`).
- **Node scripts** under `scripts/` run in `prebuild`/`predev` hooks.

## Build pipeline

```
npm run build
  └─ prebuild
     ├─ scripts/generate-build-info.js   → src/generated/buildInfo.ts
     ├─ scripts/compile-models.mjs       → public/models/*.glb (from art/*.model.toml)
     └─ scripts/validate-gltf.mjs        → checks every public/models/*.glb
  └─ tsc -b                              → type-check with project refs
  └─ vite build                          → bundle + service worker + PWA manifest
```

`npm run dev` runs `predev` (just `generate-build-info.js`) then `vite --host`. `npm run typecheck` runs `generate-build-info.js` then `tsc --noEmit`.

If typecheck or build fails with a missing `src/generated/buildInfo.ts`, run the script manually:

```sh
node scripts/generate-build-info.js
```

## Generated files

- **`src/generated/buildInfo.ts`** — written by `generate-build-info.js`. Exports `COMMIT_HASH` from `git rev-parse --short HEAD`. Consumed by the app to display build identity. Not committed.
- **`public/models/*.glb`** — written by `compile-models.mjs` for any character with a `.toml` source. Committed alongside the source so a clean checkout can run without the compiler. CI fails if the committed `.glb` is stale. See [art.md](./art.md).

## PWA configuration

Defined in `vite.config.ts`:

- **Base path:** `/sullytear/` — the app is served from a subpath (GitHub Pages).
- **Register type:** `autoUpdate` — new versions activate on next load without a prompt.
- **Manifest:** `name: "Solitaire"`, theme `#1a472a`, background `#0d2818`, standalone display, any orientation.
- **Icons:** single `favicon.svg` used as `any maskable`.
- **Workbox globs:** `**/*.{js,css,html,svg,png,woff2}`. Anything outside these extensions (e.g. `.glb`) is **not** precached — models load on demand.
- **navigateFallbackDenylist:** `/pr-preview/` is excluded so PR previews don't get swallowed by the SW shell.

### Service worker gotchas

- The SW caches aggressively. After deploying a fix, users may still see the old build until the auto-update cycle completes. For local testing, unregister the SW via DevTools → Application.
- Precache globs **do not** include `.glb`. If you add new binary asset types, either update `globPatterns` or accept that first load fetches them over the network.
- `autoUpdate` means new code can ship mid-session. Don't rely on module-scope state surviving across a deploy.

## Model pipeline in build

`prebuild` runs the model compiler and validator unconditionally. This means:

- Adding a new `art/<name>.model.toml` will regenerate its `.glb` on the next `npm run build`.
- Hand-authored `.blend` / `.glb` pairs are **not** recompiled — only validated. See [art.md](./art.md).
- A broken mesh (missing animations, wrong scale, feet off the floor) fails the build. CI runs the same validator on every PR that touches `public/models/**`.

## Environment and config

- No `.env` files. No runtime secrets.
- No feature flags. Behavior is compiled in.
- Target browsers: modern evergreen (WebGL2 + ES2020 baseline). No transpile shims for IE.

## Deploy

The repo deploys to GitHub Pages at `/sullytear/`. Anything that breaks the base path (hard-coded `/` URLs, absolute `fetch` calls) breaks production. Use Vite's `import.meta.env.BASE_URL` for runtime asset paths.
