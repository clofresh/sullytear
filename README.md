# Sullytear

A solitaire roguelike. Play Klondike, and every move drives a turn-based combat system against a series of monsters.

## Tech Stack

- React 18 + TypeScript
- Vite + PWA
- React Three Fiber (3D combat arena, animated background)
- Zustand (state)
- Vitest (tests)

## Getting Started

```sh
npm install
npm run dev
```

Then open the URL Vite prints.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server. |
| `npm run build` | Type-check, compile models, and produce a production build. |
| `npm run preview` | Serve the production build locally. |
| `npm test` | Run the Vitest suite. |
| `npm run typecheck` | Type-check only, no emit. |

## Project Layout

```
src/
  components/   2D solitaire UI (board, piles, cards, screens)
  combat/       Combat HUD and R3F arena (arena/, sprites/)
  game/         Zustand stores, rules, combat event detectors
  background/   Animated R3F background and shaders
```

## Contributing

See [`docs/contributing.md`](./docs/contributing.md) for setup, pre-push checks, and conventions. For architecture details and the combat event pipeline, start from [`AGENTS.md`](./AGENTS.md).

## License

GPL-3.0 — see [`LICENSE`](./LICENSE).
