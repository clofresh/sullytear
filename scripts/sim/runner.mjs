#!/usr/bin/env node
/**
 * Headless Sullytear simulator — entry point.
 *
 * Imports the real Zustand stores (solitaire + combat + run + orchestrator)
 * and drives them with a heuristic player. Each "game" is one full run
 * (5 encounters on Normal, fewer if the hero dies). Emits one JSONL
 * record per run to stdout or to an output file.
 *
 * Usage:
 *   node scripts/sim/runner.mjs --runs 200 --player greedy --difficulty normal --seed 42
 *
 * Flags:
 *   --runs <N>           number of runs (default 100)
 *   --player <name>      greedy | random (default greedy)
 *   --difficulty <name>  normal | hard | nightmare (default normal)
 *   --seed <N>           base RNG seed (default 1)
 *   --workers <N>        worker_threads count (default 1)
 *   --out <path>         JSONL output file (default: stdout)
 *   --max-turns <N>      per-encounter turn cap (default 400)
 *
 * Worker model: if --workers > 1, the main thread spawns N workers,
 * splits the run indices into chunks, and concatenates the JSONL output
 * into the final destination. With --workers 1 the main thread does the
 * work directly (useful for stack traces).
 */

import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);

// Stub localStorage so the zustand `persist` middleware in gameStore
// and metaStore has a sink in Node. Without this, every set() logs a
// noisy "storage unavailable" warning. Must run before any dynamic
// import that pulls the stores in.
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
  // Zustand's `persist` default storage is `() => window.localStorage`,
  // so both `window` and `localStorage` need to exist for the in-process
  // sim. Worker threads run this same module, so each gets its own.
  globalThis.window = { localStorage: storage };
  globalThis.localStorage = storage;
}

const VALID_DIFFICULTIES = ['normal', 'hard', 'nightmare'];
const VALID_PLAYERS = ['greedy', 'random'];

function fail(msg) {
  console.error(`sim: ${msg}`);
  console.error(`  difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}`);
  console.error(`  player must be one of: ${VALID_PLAYERS.join(', ')}`);
  process.exit(2);
}

function parseArgs(argv) {
  const out = {
    runs: 100,
    player: 'greedy',
    difficulty: 'normal',
    seed: 1,
    workers: 1,
    out: null,
    maxTurns: 400,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--runs': out.runs = Number(next()); break;
      case '--player': out.player = next(); break;
      case '--difficulty': out.difficulty = next(); break;
      case '--seed': out.seed = Number(next()); break;
      case '--workers': out.workers = Number(next()); break;
      case '--out': out.out = next(); break;
      case '--max-turns': out.maxTurns = Number(next()); break;
      case '--help':
      case '-h':
        console.log(fs.readFileSync(__filename, 'utf8').split('\n').filter(l => l.startsWith(' *')).join('\n'));
        process.exit(0);
    }
  }
  if (!VALID_DIFFICULTIES.includes(out.difficulty)) {
    fail(`unknown --difficulty '${out.difficulty}'`);
  }
  if (!VALID_PLAYERS.includes(out.player)) {
    fail(`unknown --player '${out.player}'`);
  }
  return out;
}

// ---- Main thread -------------------------------------------------------

async function runMain() {
  const opts = parseArgs(process.argv.slice(2));

  // Split runs into worker chunks.
  const chunks = [];
  const perWorker = Math.ceil(opts.runs / opts.workers);
  for (let w = 0; w < opts.workers; w++) {
    const start = w * perWorker;
    const end = Math.min(start + perWorker, opts.runs);
    if (start >= end) break;
    chunks.push({ start, end });
  }

  const lines = [];
  if (opts.workers <= 1) {
    // In-process — avoids worker spawn overhead and makes debugging easy.
    const { runChunk } = await import('./runnerCore.ts');
    const results = await runChunk({ ...opts, start: 0, end: opts.runs });
    lines.push(...results);
  } else {
    await Promise.all(chunks.map((chunk) => new Promise((resolve, reject) => {
      const w = new Worker(__filename, {
        workerData: { ...opts, start: chunk.start, end: chunk.end },
      });
      w.on('message', (msg) => {
        if (msg.kind === 'line') lines.push(msg.line);
        else if (msg.kind === 'done') resolve();
      });
      w.on('error', reject);
      w.on('exit', (code) => {
        if (code !== 0) reject(new Error(`worker exited with code ${code}`));
      });
    })));
  }

  const payload = lines.join('\n') + '\n';
  if (opts.out) {
    fs.mkdirSync(path.dirname(opts.out), { recursive: true });
    fs.writeFileSync(opts.out, payload);
  } else {
    process.stdout.write(payload);
  }

  // Aggregate summary to stderr so piping stdout to a file still works.
  const summary = summarize(lines.map((l) => JSON.parse(l)));
  process.stderr.write(JSON.stringify(summary, null, 2) + '\n');
}

function summarize(records) {
  const wins = records.filter((r) => r.result === 'victory').length;
  const losses = records.length - wins;
  const avgTurns = records.reduce((s, r) => s + r.turns, 0) / (records.length || 1);
  const avgEnc = records.reduce((s, r) => s + r.encountersCleared, 0) / (records.length || 1);
  return {
    runs: records.length,
    wins,
    losses,
    winRate: records.length ? wins / records.length : 0,
    avgTurns,
    avgEncountersCleared: avgEnc,
  };
}

// ---- Worker entrypoint -------------------------------------------------

async function runWorker() {
  const { runChunk } = await import('./runnerCore.ts');
  const results = await runChunk(workerData);
  for (const line of results) parentPort.postMessage({ kind: 'line', line });
  parentPort.postMessage({ kind: 'done' });
}

if (isMainThread) {
  runMain().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  runWorker().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
