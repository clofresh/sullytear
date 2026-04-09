import { Card, SUITS, RANKS } from './types';

export function createDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ id: `${suit}-${rank}`, suit, rank, faceUp: false });
    }
  }
  return cards;
}

// Pluggable RNG for deterministic simulation. Production always uses
// Math.random. The headless sim (scripts/sim) reseeds this via
// SULLYTEAR_SIM_SEED at module-load time so thousands of games can be
// replayed from a single integer seed.
let rng: () => number = Math.random;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Activate seeded RNG when the sim env flag is present. Kept inside this
// module so the production bundle path (Vite) never sees process.env.
if (typeof process !== 'undefined' && process.env && process.env.SULLYTEAR_SIM_SEED) {
  const seed = Number(process.env.SULLYTEAR_SIM_SEED);
  if (Number.isFinite(seed)) {
    rng = mulberry32(seed);
  }
}

/** @internal — used by the sim runner to reseed between runs. */
export function _setDeckRng(fn: () => number): void {
  rng = fn;
}

export function shuffle(deck: Card[]): Card[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function dealTableau(deck: Card[]): { tableau: Card[][]; stock: Card[] } {
  const cards = [...deck];
  const tableau: Card[][] = [];

  for (let col = 0; col < 7; col++) {
    const pile: Card[] = [];
    for (let row = 0; row <= col; row++) {
      const card = cards.pop()!;
      card.faceUp = row === col;
      pile.push(card);
    }
    tableau.push(pile);
  }

  // Remaining cards become stock (all face down)
  const stock = cards.map(c => ({ ...c, faceUp: false }));

  return { tableau, stock };
}
