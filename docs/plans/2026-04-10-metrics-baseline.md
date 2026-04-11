# Metrics Baseline & Target Envelopes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn raw sim output into a pass/fail signal with committed baseline snapshots and envelope comparison.

**Architecture:** A `sim:baseline` script runs 2000 greedy games per difficulty, aggregates metrics, and writes `sim/baseline.json`. A `sim:compare` script runs a fresh sim, loads the baseline, checks envelope rules, and exits non-zero on violation. Envelopes are defined in `sim/envelopes.json`.

**Tech Stack:** Node.js scripts (`.mjs` with tsx import), existing sim runner infrastructure.

---

### Task 1: Create envelope config

**Files:**
- Create: `sim/envelopes.json`

**Step 1: Write the envelope config**

```json
{
  "normal": {
    "winRate": [0.55, 0.70],
    "avgEncountersCleared": [4.5, null]
  },
  "hard": {
    "winRate": [0.25, 0.45]
  },
  "nightmare": {
    "winRate": [0.05, 0.20]
  },
  "global": {
    "maxSingleDetectorDamagePct": 0.40,
    "maxStockCycleDamagePct": 0.25,
    "autoMergeDriftPct": 0.02
  }
}
```

Envelope values are `[min, max]` ranges. `null` means unbounded. Global rules apply across all difficulties.

- `maxSingleDetectorDamagePct`: no single damage source (from `damageBySource`) may exceed this fraction of total damage across all runs in a difficulty.
- `maxStockCycleDamagePct`: the `Waste!` damage source (stock-cycle threat) must not exceed this fraction of total damage.
- `autoMergeDriftPct`: for auto-merge tier, all headline numbers must be within ±this of baseline.

**Step 2: Commit**

```bash
git add sim/envelopes.json
git commit -m "feat: add envelope config for sim metrics"
```

---

### Task 2: Create the baseline generation script

**Files:**
- Create: `scripts/sim/baseline.mjs`
- Modify: `package.json` (add `sim:baseline` script)

**Step 1: Write the baseline script**

`scripts/sim/baseline.mjs` should:
1. For each difficulty (`normal`, `hard`, `nightmare`), invoke `runChunk` from `runnerCore.ts` with 2000 runs, player `greedy`, seed `1`.
2. Aggregate per-difficulty metrics:
   - `runs`, `wins`, `winRate`, `avgEncountersCleared`, `avgTurns`
   - `damageBySource`: sum across all runs, then compute each source's fraction of total
   - `healBySource`: sum across all runs
3. Write the result to `sim/baseline.json`.
4. Print a summary table to stderr.

Structure of `sim/baseline.json`:
```json
{
  "generatedAt": "2026-04-10T...",
  "runsPerDifficulty": 2000,
  "seed": 1,
  "difficulties": {
    "normal": {
      "runs": 2000,
      "wins": 1234,
      "winRate": 0.617,
      "avgEncountersCleared": 4.52,
      "avgTurns": 98.3,
      "damageBySource": { "Waste!": 0.42, "Reveal!": 0.25, ... },
      "healBySource": { "hero-heal": 12345, "Column Clear!": 678 }
    },
    "hard": { ... },
    "nightmare": { ... }
  }
}
```

The `damageBySource` values in the baseline are stored as **fractions of total damage** (not raw counts), since the envelope rules check proportions.

Import the localStorage stub from `runner.mjs` by extracting it or duplicating the setup at the top of `baseline.mjs` (same pattern as runner.mjs lines 39-54).

```javascript
#!/usr/bin/env node
import { runChunk } from './runnerCore.ts';
import fs from 'node:fs';

// localStorage stub (same as runner.mjs)
if (typeof globalThis.window === 'undefined') {
  const mem = new Map();
  const storage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
    removeItem: (k) => { mem.delete(k); },
    clear: () => { mem.clear(); },
    key: (i) => Array.from(mem.keys())[i] ?? null,
    get length() { return mem.size; },
  };
  globalThis.window = { localStorage: storage };
  globalThis.localStorage = storage;
}

const DIFFICULTIES = ['normal', 'hard', 'nightmare'];
const RUNS = 2000;
const SEED = 1;

function aggregateRecords(jsonLines) {
  const records = jsonLines.map((l) => JSON.parse(l));
  const wins = records.filter((r) => r.result === 'victory').length;
  const avgEnc = records.reduce((s, r) => s + r.encountersCleared, 0) / records.length;
  const avgTurns = records.reduce((s, r) => s + r.turns, 0) / records.length;

  // Aggregate damage by source
  const rawDamage = {};
  const rawHeal = {};
  for (const r of records) {
    for (const [k, v] of Object.entries(r.damageBySource)) {
      rawDamage[k] = (rawDamage[k] ?? 0) + v;
    }
    for (const [k, v] of Object.entries(r.healBySource)) {
      rawHeal[k] = (rawHeal[k] ?? 0) + v;
    }
  }

  // Convert damage to fractions
  const totalDamage = Object.values(rawDamage).reduce((a, b) => a + b, 0);
  const damageFractions = {};
  for (const [k, v] of Object.entries(rawDamage)) {
    damageFractions[k] = totalDamage > 0 ? v / totalDamage : 0;
  }

  return {
    runs: records.length,
    wins,
    winRate: wins / records.length,
    avgEncountersCleared: avgEnc,
    avgTurns,
    damageBySource: damageFractions,
    healBySource: rawHeal,
  };
}

async function main() {
  const difficulties = {};

  for (const diff of DIFFICULTIES) {
    process.stderr.write(`Running ${RUNS} games on ${diff}...\n`);
    const lines = await runChunk({
      start: 0, end: RUNS, seed: SEED,
      player: 'greedy', difficulty: diff, maxTurns: 400,
    });
    difficulties[diff] = aggregateRecords(lines);
    process.stderr.write(`  ${diff}: winRate=${difficulties[diff].winRate.toFixed(3)}, avgEnc=${difficulties[diff].avgEncountersCleared.toFixed(2)}\n`);
  }

  const baseline = {
    generatedAt: new Date().toISOString(),
    runsPerDifficulty: RUNS,
    seed: SEED,
    difficulties,
  };

  fs.mkdirSync('sim', { recursive: true });
  fs.writeFileSync('sim/baseline.json', JSON.stringify(baseline, null, 2) + '\n');
  process.stderr.write(`\nBaseline written to sim/baseline.json\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
```

**Step 2: Add the npm script**

In `package.json`, add to `"scripts"`:
```json
"sim:baseline": "node --import tsx scripts/sim/baseline.mjs"
```

**Step 3: Run it to generate the baseline**

```bash
npm run sim:baseline
```

Verify `sim/baseline.json` exists with all 3 difficulties.

**Step 4: Commit**

```bash
git add scripts/sim/baseline.mjs package.json sim/baseline.json
git commit -m "feat: add baseline generation script and initial baseline"
```

---

### Task 3: Create the compare script

**Files:**
- Create: `scripts/sim/compare.mjs`
- Modify: `package.json` (add `sim:compare` script)

**Step 1: Write the compare script**

`scripts/sim/compare.mjs` should:
1. Load `sim/baseline.json` and `sim/envelopes.json`.
2. Run a fresh sim (same params as baseline: 2000 runs × 3 difficulties, seed 1).
3. For each difficulty, check:
   - Win rate is within the envelope range.
   - `avgEncountersCleared` is within range (if specified).
   - No single damage source exceeds `maxSingleDetectorDamagePct`.
   - `Waste!` damage doesn't exceed `maxStockCycleDamagePct`.
   - All headline numbers are within `±autoMergeDriftPct` of baseline (for auto-merge tier reporting).
4. Print a human-readable diff table to stdout.
5. Exit 0 if all checks pass, non-zero if any envelope is violated.

```javascript
#!/usr/bin/env node
import fs from 'node:fs';

// localStorage stub
if (typeof globalThis.window === 'undefined') {
  const mem = new Map();
  const storage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
    removeItem: (k) => { mem.delete(k); },
    clear: () => { mem.clear(); },
    key: (i) => Array.from(mem.keys())[i] ?? null,
    get length() { return mem.size; },
  };
  globalThis.window = { localStorage: storage };
  globalThis.localStorage = storage;
}

import { runChunk } from './runnerCore.ts';

function aggregateRecords(jsonLines) {
  // Same aggregation logic as baseline.mjs — extract to shared module or duplicate
  const records = jsonLines.map((l) => JSON.parse(l));
  const wins = records.filter((r) => r.result === 'victory').length;
  const avgEnc = records.reduce((s, r) => s + r.encountersCleared, 0) / records.length;
  const avgTurns = records.reduce((s, r) => s + r.turns, 0) / records.length;

  const rawDamage = {};
  const rawHeal = {};
  for (const r of records) {
    for (const [k, v] of Object.entries(r.damageBySource)) {
      rawDamage[k] = (rawDamage[k] ?? 0) + v;
    }
    for (const [k, v] of Object.entries(r.healBySource)) {
      rawHeal[k] = (rawHeal[k] ?? 0) + v;
    }
  }
  const totalDamage = Object.values(rawDamage).reduce((a, b) => a + b, 0);
  const damageFractions = {};
  for (const [k, v] of Object.entries(rawDamage)) {
    damageFractions[k] = totalDamage > 0 ? v / totalDamage : 0;
  }

  return {
    runs: records.length, wins,
    winRate: wins / records.length,
    avgEncountersCleared: avgEnc,
    avgTurns,
    damageBySource: damageFractions,
    healBySource: rawHeal,
  };
}

async function main() {
  const baseline = JSON.parse(fs.readFileSync('sim/baseline.json', 'utf8'));
  const envelopes = JSON.parse(fs.readFileSync('sim/envelopes.json', 'utf8'));
  const RUNS = baseline.runsPerDifficulty;
  const SEED = baseline.seed;
  const DIFFICULTIES = Object.keys(baseline.difficulties);
  const violations = [];
  let autoMergeOk = true;

  for (const diff of DIFFICULTIES) {
    console.log(`\n=== ${diff.toUpperCase()} ===`);
    const lines = await runChunk({
      start: 0, end: RUNS, seed: SEED,
      player: 'greedy', difficulty: diff, maxTurns: 400,
    });
    const fresh = aggregateRecords(lines);
    const base = baseline.difficulties[diff];
    const env = envelopes[diff] ?? {};
    const global = envelopes.global;

    // Print comparison table
    console.log(`  metric                  baseline    fresh       delta`);
    console.log(`  ─────────────────────── ────────── ────────── ──────────`);
    const rows = [
      ['winRate', base.winRate, fresh.winRate],
      ['avgEncountersCleared', base.avgEncountersCleared, fresh.avgEncountersCleared],
      ['avgTurns', base.avgTurns, fresh.avgTurns],
    ];
    for (const [name, bv, fv] of rows) {
      const delta = fv - bv;
      const pct = bv !== 0 ? ((delta / bv) * 100).toFixed(1) + '%' : 'N/A';
      console.log(`  ${name.padEnd(24)}${bv.toFixed(3).padStart(10)} ${fv.toFixed(3).padStart(10)} ${(delta >= 0 ? '+' : '') + delta.toFixed(3).padStart(9)} (${pct})`);
    }

    // Damage source breakdown
    const allSources = new Set([...Object.keys(base.damageBySource), ...Object.keys(fresh.damageBySource)]);
    console.log(`\n  damage source           baseline    fresh`);
    console.log(`  ─────────────────────── ────────── ──────────`);
    for (const src of allSources) {
      const bv = base.damageBySource[src] ?? 0;
      const fv = fresh.damageBySource[src] ?? 0;
      console.log(`  ${src.padEnd(24)}${(bv * 100).toFixed(1).padStart(9)}% ${(fv * 100).toFixed(1).padStart(9)}%`);
    }

    // Check envelope: win rate
    if (env.winRate) {
      const [lo, hi] = env.winRate;
      if ((lo !== null && fresh.winRate < lo) || (hi !== null && fresh.winRate > hi)) {
        violations.push(`${diff}: winRate ${fresh.winRate.toFixed(3)} outside [${lo}, ${hi}]`);
      }
    }

    // Check envelope: avgEncountersCleared
    if (env.avgEncountersCleared) {
      const [lo, hi] = env.avgEncountersCleared;
      if ((lo !== null && fresh.avgEncountersCleared < lo) || (hi !== null && fresh.avgEncountersCleared > hi)) {
        violations.push(`${diff}: avgEncountersCleared ${fresh.avgEncountersCleared.toFixed(2)} outside [${lo}, ${hi}]`);
      }
    }

    // Check global: no single detector > maxSingleDetectorDamagePct
    for (const [src, frac] of Object.entries(fresh.damageBySource)) {
      if (frac > global.maxSingleDetectorDamagePct) {
        violations.push(`${diff}: damage source "${src}" = ${(frac * 100).toFixed(1)}% exceeds ${(global.maxSingleDetectorDamagePct * 100)}% cap`);
      }
    }

    // Check global: stock-cycle (Waste!) damage
    const wastePct = fresh.damageBySource['Waste!'] ?? 0;
    if (wastePct > global.maxStockCycleDamagePct) {
      violations.push(`${diff}: Waste! damage = ${(wastePct * 100).toFixed(1)}% exceeds ${(global.maxStockCycleDamagePct * 100)}% cap`);
    }

    // Check auto-merge drift
    for (const [name, bv, fv] of rows) {
      if (bv === 0) continue;
      const drift = Math.abs((fv - bv) / bv);
      if (drift > global.autoMergeDriftPct) {
        autoMergeOk = false;
      }
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  if (violations.length > 0) {
    console.log(`\nENVELOPE VIOLATIONS (${violations.length}):`);
    for (const v of violations) console.log(`  ✗ ${v}`);
    console.log(`\nResult: FAIL`);
    process.exit(1);
  } else {
    console.log(`\nAll envelope checks passed.`);
    console.log(`Auto-merge eligible: ${autoMergeOk ? 'YES' : 'NO (drift > ±' + (envelopes.global.autoMergeDriftPct * 100) + '%)'}`);
    console.log(`\nResult: PASS`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
```

**Step 2: Add npm script**

In `package.json`, add to `"scripts"`:
```json
"sim:compare": "node --import tsx scripts/sim/compare.mjs"
```

**Step 3: Run it against unmodified code — should pass**

```bash
npm run sim:compare
```

Expected: exit 0, "All envelope checks passed."

Note: if envelope violations fire on the initial run (e.g. Waste! > 25%), tune the envelope values in `sim/envelopes.json` to match reality before committing. The issue says "starting values, tune after first run."

**Step 4: Commit**

```bash
git add scripts/sim/compare.mjs package.json
git commit -m "feat: add envelope comparison script"
```

---

### Task 4: Extract shared aggregation logic

**Files:**
- Create: `scripts/sim/aggregate.ts`
- Modify: `scripts/sim/baseline.mjs`
- Modify: `scripts/sim/compare.mjs`

**Step 1: Extract `aggregateRecords` into `scripts/sim/aggregate.ts`**

Both baseline.mjs and compare.mjs duplicate the aggregation logic. Extract it into a shared module.

```typescript
export interface AggregatedMetrics {
  runs: number;
  wins: number;
  winRate: number;
  avgEncountersCleared: number;
  avgTurns: number;
  damageBySource: Record<string, number>; // fractions
  healBySource: Record<string, number>;   // raw totals
}

export function aggregateRecords(jsonLines: string[]): AggregatedMetrics {
  const records = jsonLines.map((l) => JSON.parse(l));
  const wins = records.filter((r: any) => r.result === 'victory').length;
  const avgEnc = records.reduce((s: number, r: any) => s + r.encountersCleared, 0) / records.length;
  const avgTurns = records.reduce((s: number, r: any) => s + r.turns, 0) / records.length;

  const rawDamage: Record<string, number> = {};
  const rawHeal: Record<string, number> = {};
  for (const r of records) {
    for (const [k, v] of Object.entries((r as any).damageBySource)) {
      rawDamage[k] = (rawDamage[k] ?? 0) + (v as number);
    }
    for (const [k, v] of Object.entries((r as any).healBySource)) {
      rawHeal[k] = (rawHeal[k] ?? 0) + (v as number);
    }
  }
  const totalDamage = Object.values(rawDamage).reduce((a, b) => a + b, 0);
  const damageFractions: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawDamage)) {
    damageFractions[k] = totalDamage > 0 ? v / totalDamage : 0;
  }

  return { runs: records.length, wins, winRate: wins / records.length, avgEncountersCleared: avgEnc, avgTurns, damageBySource: damageFractions, healBySource: rawHeal };
}
```

**Step 2: Update baseline.mjs and compare.mjs to import from aggregate.ts**

Replace the inline `aggregateRecords` function with:
```javascript
import { aggregateRecords } from './aggregate.ts';
```

**Step 3: Run both scripts to verify they still work**

```bash
npm run sim:baseline
npm run sim:compare
```

**Step 4: Commit**

```bash
git add scripts/sim/aggregate.ts scripts/sim/baseline.mjs scripts/sim/compare.mjs
git commit -m "refactor: extract shared aggregation logic"
```

---

### Task 5: Verify with a hand-introduced regression

**Step 1: Temporarily break a monster stat**

In `src/combat/monsters.ts`, find the Slime definition and change `maxHp` to `4` (or similar easy-to-find value).

**Step 2: Run compare**

```bash
npm run sim:compare
```

Expected: exit non-zero, at least one envelope violation printed.

**Step 3: Revert the change**

```bash
git checkout src/combat/monsters.ts
```

**Step 4: Verify clean compare passes**

```bash
npm run sim:compare
```

Expected: exit 0. No commit needed for this task — it's just verification.

---

### Task 6: Update docs/simulation.md

**Files:**
- Modify: `docs/simulation.md`

**Step 1: Add baseline & envelope documentation**

Append to `docs/simulation.md` after the "Non-goals" section:

```markdown
## Metrics baseline

A committed snapshot (`sim/baseline.json`) captures aggregate metrics from
2000 greedy runs × 3 difficulties. It's the reference point for detecting
balance regressions.

### Generating the baseline

```sh
npm run sim:baseline
```

This overwrites `sim/baseline.json`. Commit the result as part of any
human-reviewed balance PR.

### Comparing against the baseline

```sh
npm run sim:compare
```

Runs a fresh sim with the same parameters as the baseline, prints a
human-readable diff table, and exits non-zero if any envelope is violated.

### Envelopes

Target envelopes are defined in `sim/envelopes.json`. Each difficulty can
specify `[min, max]` ranges for headline metrics. Global rules apply
across all difficulties:

| rule | meaning |
|---|---|
| `maxSingleDetectorDamagePct` | No single damage source may exceed this fraction of total damage |
| `maxStockCycleDamagePct` | `Waste!` (stock-cycle) damage must stay below this fraction |
| `autoMergeDriftPct` | Auto-merge tier: all headline numbers within ±this of baseline |

### Baseline update policy

- **Human-reviewed balance PRs:** regenerate and commit the baseline.
- **Auto-merge PRs:** must stay within the ±2% drift window; do **not**
  update the baseline.
- A weekly scheduled job re-runs the sim against `main` and fails loudly
  if headline metrics drift without an intervening balance PR.
```

**Step 2: Remove the "piece 2" line from Non-goals**

Delete the line about baseline snapshots from the Non-goals section since it's now implemented.

**Step 3: Commit**

```bash
git add docs/simulation.md
git commit -m "docs: add baseline and envelope documentation"
```
