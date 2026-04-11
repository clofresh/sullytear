/**
 * Core simulation loop: drives the real Zustand stores to play N runs
 * and returns one JSONL record per run. Imported from runner.mjs in
 * both the main thread (single-worker fast path) and worker threads.
 *
 * Store singletons are per-module-instance — each worker gets its own.
 */

import { useGameStore } from '../../src/game/store.ts';
import { useCombatStore } from '../../src/game/combatStore.ts';
import { useRunStore } from '../../src/game/runStore.ts';
// Importing the orchestrator wires up EventDetector + combat bridge.
import '../../src/game/orchestrator.ts';
import { _setDeckRng } from '../../src/game/deck.ts';
import { mulberry32, childSeed } from './rng.ts';
import { chooseAction, type GameView, type CombatView } from './playerGreedy.ts';

export interface RunRecord {
  seed: number;
  difficulty: string;
  player: string;
  result: 'victory' | 'defeat' | 'stuck';
  encountersCleared: number;
  turns: number;
  deckCycles: number;
  heroHpCurve: number[];
  damageBySource: Record<string, number>;
  healBySource: Record<string, number>;
  finalHeroHp: number;
}

interface ChunkArgs {
  start: number;
  end: number;
  seed: number;
  player: string;
  difficulty: string;
  maxTurns: number;
}

export async function runChunk(args: ChunkArgs): Promise<string[]> {
  const lines: string[] = [];
  for (let i = args.start; i < args.end; i++) {
    const runSeed = childSeed(args.seed, i);
    const record = playOneRun(runSeed, args.player, args.difficulty as 'normal' | 'hard' | 'nightmare', args.maxTurns);
    lines.push(JSON.stringify(record));
  }
  return lines;
}

function playOneRun(
  seed: number,
  player: string,
  difficulty: 'normal' | 'hard' | 'nightmare',
  maxTurns: number,
): RunRecord {
  _setDeckRng(mulberry32(seed));

  const damageBySource: Record<string, number> = {};
  const healBySource: Record<string, number> = {};
  const heroHpCurve: number[] = [];

  // Subscribe to combat events to collect damage/heal breakdown.
  const unsubCombat = useCombatStore.subscribe((state, prev) => {
    if (state.eventId === prev.eventId) return;
    const evt = state.lastEvent;
    if (!evt) return;
    const label = evt.label ?? evt.type;
    if (evt.type === 'hero-attack' || evt.type === 'poison') {
      damageBySource[label] = (damageBySource[label] ?? 0) + evt.damage;
    } else if (evt.type === 'hero-heal') {
      healBySource[label] = (healBySource[label] ?? 0) + evt.damage;
    }
  });

  try {
    useRunStore.getState().startRun(difficulty);
    heroHpCurve.push(useCombatStore.getState().heroHp);

    let turns = 0;
    let stuck = false;
    const totalCap = maxTurns * 5; // 5 encounters in a run
    while (turns < totalCap) {
      const run = useRunStore.getState();
      if (run.runResult !== 'none') break;

      const combat = useCombatStore.getState();
      if (combat.combatResult === 'defeat') {
        useRunStore.getState().endRun('defeat');
        break;
      }
      if (combat.combatResult === 'victory') {
        useRunStore.getState().advanceEncounter();
        heroHpCurve.push(useCombatStore.getState().heroHp);
        turns++;
        continue;
      }

      const game = useGameStore.getState();
      const view: GameView = {
        stock: game.stock,
        waste: game.waste,
        tableau: game.tableau,
        foundations: game.foundations,
        stockCycleCount: game.stockCycleCount,
        drawMode: game.drawMode,
      };
      const cview: CombatView = {
        monsterThreat: combat.monsterThreat,
        monsterThreatMax: combat.monsterThreatMax,
        monsterAttackDamage: combat.monsterAttackDamage,
        heroHp: combat.heroHp,
      };

      const action = player === 'random'
        ? randomAction(view)
        : chooseAction(view, cview);

      if (action.kind === 'done') {
        // Stuck: no legal progress and can't safely cycle stock.
        useRunStore.getState().endRun('defeat');
        stuck = true;
        break;
      }
      if (action.kind === 'draw') {
        useGameStore.getState().drawFromStock();
      } else {
        useGameStore.getState().moveCards({
          cards: [],
          from: action.from as never,
          fromIndex: action.fromIndex,
          to: action.to as never,
        });
      }

      heroHpCurve.push(useCombatStore.getState().heroHp);
      turns++;
    }

    const run = useRunStore.getState();
    const combat = useCombatStore.getState();
    return {
      seed,
      difficulty,
      player,
      result: stuck ? 'stuck' : (run.runResult === 'victory' ? 'victory' : 'defeat'),
      encountersCleared: run.currentEncounterIndex,
      turns,
      deckCycles: useGameStore.getState().stockCycleCount,
      heroHpCurve,
      damageBySource,
      healBySource,
      finalHeroHp: combat.heroHp,
    };
  } finally {
    unsubCombat();
  }
}

// Random legal-move baseline player. Kept minimal — it just picks a
// move uniformly from those the greedy player would consider legal.
function randomAction(view: GameView) {
  // Delegate to greedy for enumeration, then randomize. We import
  // lazily only because scoring in greedy is fine to reuse.
  const moves: { from: string; fromIndex: number; to: string }[] = [];
  const { tableau, foundations } = view;

  for (let t = 0; t < 7; t++) {
    const pile = tableau[t];
    if (pile.length === 0) continue;
    const top = pile[pile.length - 1];
    if (!top.faceUp) continue;
    for (let f = 0; f < 4; f++) {
      if (foundations[f].length === 0 ? top.rank === 1 : false) {
        moves.push({ from: `tableau-${t}`, fromIndex: pile.length - 1, to: `foundation-${f}` });
      }
    }
  }
  if (moves.length === 0) return view.stock.length > 0 ? { kind: 'draw' as const } : { kind: 'done' as const };
  const pick = moves[Math.floor(Math.random() * moves.length)];
  return { kind: 'move' as const, ...pick };
}
