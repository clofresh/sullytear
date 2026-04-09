# Headless simulation

The simulator drives the real Zustand stores (`gameStore`, `combatStore`,
`runStore`, `EventDetector`, orchestrator) in Node — no React, no R3F —
so agents and humans can run thousands of seeded games for balance
tuning, regression detection, and fuzz testing.

This is *piece 1* of the autonomous improvement loop (tracked in
[#75](https://github.com/clofresh/sullytear/issues/75)); it's the
prerequisite for every agent role that follows.

## Running

```sh
npm run sim -- --runs 200 --player greedy --difficulty normal --seed 42
```

Flags:

| flag | default | meaning |
|---|---|---|
| `--runs <N>` | 100 | number of runs to play |
| `--player <name>` | `greedy` | `greedy` or `random` |
| `--difficulty <name>` | `normal` | `normal` / `hard` / `nightmare` |
| `--seed <N>` | 1 | base RNG seed; child seeds derived per run |
| `--workers <N>` | 1 | `worker_threads` parallelism |
| `--out <path>` | stdout | write JSONL to a file instead of stdout |
| `--max-turns <N>` | 400 | per-encounter turn cap |

Each run emits one JSONL record to stdout (or `--out`). A summary with
win rate / average turns / encounters cleared is written to stderr so
piping to a file still works:

```sh
npm run sim -- --runs 500 --out sim/out.jsonl 2> sim/summary.json
```

## Output schema

```json
{
  "seed": 920564995,
  "difficulty": "normal",
  "player": "greedy",
  "result": "victory",
  "encountersCleared": 5,
  "turns": 149,
  "deckCycles": 0,
  "heroHpCurve": [50, 50, 48, ...],
  "damageBySource": { "Reveal!": 66, "Waste!": 218, "Combo x3!": 12 },
  "healBySource":   { "hero-heal": 43, "Column Clear!": 10 },
  "finalHeroHp": 22
}
```

`result` is `victory` (all 5 encounters cleared), `defeat` (hero HP hit
zero), or `stuck` (no legal progress and no safe stock cycle).

## Determinism

The simulator reseeds `src/game/deck.ts` via `_setDeckRng` before every
run, so identical `--seed` + `--runs` combinations produce byte-identical
output. This is the backbone of the baseline/compare workflow in piece 2.

Production code is untouched: `deck.ts` only activates a seeded RNG when
`process.env.SULLYTEAR_SIM_SEED` is set *or* `_setDeckRng` is called
explicitly (neither path runs in the Vite bundle).

## Players

- **greedy** (default) — prioritizes foundation placements and reveal
  moves, avoids sterile tableau-to-tableau swaps, and only cycles the
  stock while threat/HP headroom is safe. Roughly approximates an
  average-skill human player.
- **random** — minimal baseline (foundation-only legal moves, otherwise
  draw). Useful as a floor-difficulty signal.

An oracle player backed by a Klondike solver is a possible follow-up.

## Architecture

```
scripts/sim/
  runner.mjs        # CLI + worker_threads orchestration
  runnerCore.ts     # per-worker loop: drives the real stores
  playerGreedy.ts   # heuristic move picker
  rng.ts            # mulberry32 + child-seed derivation
```

Each worker imports its own copy of the store singletons, so runs in
different workers never share state.

## Non-goals (tracked in later pieces)

- Baseline snapshots and envelope comparison (`sim/baseline.json`) —
  **piece 2**.
- Agent roles that consume the sim — **piece 3**.
- GitHub Actions nightly orchestration — **piece 4**.
