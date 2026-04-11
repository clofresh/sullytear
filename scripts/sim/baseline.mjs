#!/usr/bin/env node
/**
 * Baseline generator — runs 2000 greedy games per difficulty and writes
 * aggregated metrics to sim/baseline.json.
 *
 * Usage:
 *   npm run sim:baseline
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

const DIFFICULTIES = ['normal', 'hard', 'nightmare'];
const RUNS_PER_DIFFICULTY = 2000;
const SEED = 1;
const MAX_TURNS = 400;

const difficulties = {};

for (const difficulty of DIFFICULTIES) {
  process.stderr.write(`[baseline] Running ${RUNS_PER_DIFFICULTY} games on ${difficulty}...\n`);
  const lines = await runChunk({
    start: 0,
    end: RUNS_PER_DIFFICULTY,
    seed: SEED,
    player: 'greedy',
    difficulty,
    maxTurns: MAX_TURNS,
  });
  process.stderr.write(`[baseline] ${difficulty}: ${lines.length} games done\n`);
  difficulties[difficulty] = aggregateRecords(lines);
}

const baseline = {
  generatedAt: new Date().toISOString(),
  runsPerDifficulty: RUNS_PER_DIFFICULTY,
  seed: SEED,
  difficulties,
};

const outPath = path.join(repoRoot, 'sim', 'baseline.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(baseline, null, 2) + '\n');
process.stderr.write(`[baseline] Written to ${outPath}\n`);
