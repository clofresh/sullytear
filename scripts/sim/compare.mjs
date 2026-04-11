#!/usr/bin/env node
/**
 * Sim compare — re-runs the baseline simulation and checks results against
 * sim/envelopes.json constraints and the baseline for auto-merge drift.
 *
 * Usage:
 *   npm run sim:compare
 *
 * Exit codes:
 *   0 — all checks pass
 *   1 — one or more violations
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

// Stub localStorage before any store imports.
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

const { runChunk } = await import('./runnerCore.ts');
const { aggregateRecords } = await import('./aggregate.ts');

const baselinePath = path.join(repoRoot, 'sim', 'baseline.json');
const envelopesPath = path.join(repoRoot, 'sim', 'envelopes.json');

if (!fs.existsSync(baselinePath)) {
  console.error('sim/baseline.json not found — run "npm run sim:baseline" first');
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const envelopes = JSON.parse(fs.readFileSync(envelopesPath, 'utf8'));

const { runsPerDifficulty, seed } = baseline;
const global_ = envelopes.global ?? {};
const maxSingleDetectorPct = global_.maxSingleDetectorDamagePct ?? 1.0;
const maxStockCyclePct = global_.maxStockCycleDamagePct ?? 1.0;
const driftPct = global_.autoMergeDriftPct ?? 0.05;

const DIFFICULTIES = ['normal', 'hard', 'nightmare'];

const violations = [];
const rows = [];

for (const difficulty of DIFFICULTIES) {
  process.stderr.write(`[compare] Running ${runsPerDifficulty} games on ${difficulty}...\n`);
  const lines = await runChunk({
    start: 0,
    end: runsPerDifficulty,
    seed,
    player: 'greedy',
    difficulty,
    maxTurns: 400,
  });
  process.stderr.write(`[compare] ${difficulty}: ${lines.length} games done\n`);

  const m = aggregateRecords(lines);
  const base = baseline.difficulties[difficulty];
  const env = envelopes[difficulty] ?? {};

  // --- Envelope checks ---

  // Win rate bounds
  if (env.winRate) {
    const [lo, hi] = env.winRate;
    if (lo !== null && m.winRate < lo) {
      violations.push(`${difficulty}: winRate ${pct(m.winRate)} below floor ${pct(lo)}`);
    }
    if (hi !== null && m.winRate > hi) {
      violations.push(`${difficulty}: winRate ${pct(m.winRate)} above ceiling ${pct(hi)}`);
    }
  }

  // avgEncountersCleared bounds
  if (env.avgEncountersCleared) {
    const [lo, hi] = env.avgEncountersCleared;
    if (lo !== null && m.avgEncountersCleared < lo) {
      violations.push(`${difficulty}: avgEncountersCleared ${m.avgEncountersCleared.toFixed(2)} below floor ${lo}`);
    }
    if (hi !== null && m.avgEncountersCleared > hi) {
      violations.push(`${difficulty}: avgEncountersCleared ${m.avgEncountersCleared.toFixed(2)} above ceiling ${hi}`);
    }
  }

  // Single damage source cap
  for (const [src, frac] of Object.entries(m.damageBySource)) {
    if (frac > maxSingleDetectorPct) {
      violations.push(`${difficulty}: damage source "${src}" = ${pct(frac)} exceeds maxSingleDetectorDamagePct ${pct(maxSingleDetectorPct)}`);
    }
  }

  // Waste!/stock-cycle damage cap
  const wasteFrac = m.damageBySource['Waste!'] ?? 0;
  if (wasteFrac > maxStockCyclePct) {
    violations.push(`${difficulty}: "Waste!" damage = ${pct(wasteFrac)} exceeds maxStockCycleDamagePct ${pct(maxStockCyclePct)}`);
  }

  // --- Auto-merge drift checks (vs baseline) ---
  const driftViolations = [];
  if (base) {
    const headlineChecks = [
      ['winRate', m.winRate, base.winRate],
      ['avgEncountersCleared', m.avgEncountersCleared, base.avgEncountersCleared],
      ['avgTurns', m.avgTurns, base.avgTurns],
    ];
    for (const [label, cur, ref] of headlineChecks) {
      if (ref === 0) continue;
      const drift = Math.abs(cur - ref) / Math.abs(ref);
      if (drift > driftPct) {
        driftViolations.push(`${label} drifted ${pct(drift)} from baseline (cur=${cur.toFixed(3)}, base=${ref.toFixed(3)})`);
      }
    }
  }

  for (const dv of driftViolations) {
    violations.push(`${difficulty}: ${dv}`);
  }

  // --- Build comparison row ---
  const baseWinRate = base ? pct(base.winRate) : 'N/A';
  const baseEnc = base ? base.avgEncountersCleared.toFixed(2) : 'N/A';
  const baseTurns = base ? base.avgTurns.toFixed(1) : 'N/A';

  rows.push({
    difficulty,
    winRate: `${pct(m.winRate)} (base: ${baseWinRate})`,
    avgEnc: `${m.avgEncountersCleared.toFixed(2)} (base: ${baseEnc})`,
    avgTurns: `${m.avgTurns.toFixed(1)} (base: ${baseTurns})`,
    wasteDmg: pct(wasteFrac),
    driftViolations,
  });
}

// --- Print table ---
console.log('\n=== Sim Compare Results ===\n');
for (const row of rows) {
  console.log(`[${row.difficulty.toUpperCase()}]`);
  console.log(`  Win rate:              ${row.winRate}`);
  console.log(`  Avg encounters:        ${row.avgEnc}`);
  console.log(`  Avg turns:             ${row.avgTurns}`);
  console.log(`  Waste! damage share:   ${row.wasteDmg}`);
  if (row.driftViolations.length > 0) {
    console.log(`  DRIFT: ${row.driftViolations.join('; ')}`);
  }
}

if (violations.length === 0) {
  console.log('\nAll checks PASSED.\n');
  process.exit(0);
} else {
  console.log('\nVIOLATIONS:');
  for (const v of violations) {
    console.log(`  - ${v}`);
  }
  console.log('');
  process.exit(1);
}

function pct(n) {
  return `${(n * 100).toFixed(1)}%`;
}
