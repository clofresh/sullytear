# AGENTS.md

Index of guidelines for agentic coding assistants working on Sullytear. Read the linked docs before making changes.

- [Commands](./docs/commands.md) — dev, build, test, typecheck, and model scripts.
- [Architecture](./docs/architecture.md) — Zustand store layout, combat event detection pipeline, rendering layout, and agent notes on where to hook new behavior.
- [State Management](./docs/state-management.md) — deep dive on the four stores, the combat subscription chain, undo model, and persistence rules.
- [Game Design](./docs/game-design.md) — core loop, monster roster, difficulty scaling, and the card-action → combat-event mapping.
- [UI / UX](./docs/ui-ux.md) — screen flow, board layout, custom drag-and-drop system, and HUD conventions.
- [Art](./docs/art.md) — character model pipelines (Blender + TOML), animation contract, and HUD/background asset locations.
- [VFX](./docs/vfx.md) — combat-event → particle/shader/HUD pipeline, palette, and performance rules.
- [Testing](./docs/testing.md) — Vitest layout, `_withSuppressedEvents` pattern, and detector test conventions.
- [Build & PWA](./docs/build.md) — Vite config, prebuild scripts, service worker, and deploy notes.
- [Code Style](./docs/code-style.md) — naming, TypeScript, imports, state management, R3F, and error handling conventions.
- [Contributing](./docs/contributing.md) — setup, pre-push checks, conventions, and where to start for common tasks.

For a human-facing overview, see [`README.md`](./README.md).
