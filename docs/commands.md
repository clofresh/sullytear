# Commands

- `npm run dev` — start Vite dev server (runs `generate-build-info.js` first).
- `npm run build` — `tsc -b && vite build` (also compiles and validates GLTF models).
- `npm run typecheck` — type-check only, no emit.
- `npm test` — run Vitest once (`vitest run`).
- Run a single test file: `npx vitest run src/game/__tests__/store.test.ts`
- Run tests matching a name: `npx vitest run -t "pattern"`
- `npm run preview` — serve the production build.
- `npm run build:models` / `npm run validate:models` — compile/validate GLTF assets.

Note: `prebuild`/`predev` hooks invoke `scripts/generate-build-info.js`, which writes a build-info module consumed by the app. If typecheck or build fails complaining about missing build info, run that script manually.

For what each script actually does and how the PWA is wired, see [build.md](./build.md).
