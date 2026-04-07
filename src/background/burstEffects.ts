import * as THREE from 'three';
import type { EffectEvent } from './useCombatEffects';

/**
 * Burst-particle palette + per-event spawn dispatcher.
 *
 * `BurstParticles.tsx` owns the GPU buffer pool and the spawn primitive;
 * this module owns the *what* — color constants, world-position lookup,
 * and the `processEvent` switch that maps an EffectEvent to one or more
 * `spawn(...)` calls. Pulled out so the .tsx file can stay focused on
 * Three.js plumbing.
 */

// --- Palette ---
export const C_GREEN = new THREE.Color('#66cc77');
export const C_WHITE = new THREE.Color('#ffffff');
export const C_RED = new THREE.Color('#ff4444');
export const C_HEAL_GREEN = new THREE.Color('#44dd44');
export const C_PURPLE = new THREE.Color('#aa44dd');
export const C_GOLD = new THREE.Color('#d4a843');
export const C_DARK_RED = new THREE.Color('#661111');
export const C_ROYAL_PURPLE = new THREE.Color('#c8a2ff');
export const C_ROYAL_GOLD = new THREE.Color('#ffd866');

export function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return new THREE.Color(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t,
  );
}

// --- Spawn primitive contract ---
//
// Matches the signature of the `spawn()` function inside BurstParticles.tsx.
// Defined here so the dispatcher is decoupled from the buffer-pool internals.
export type SpawnFn = (
  count: number,
  x: number, y: number, z: number,
  velFn: (i: number) => [number, number, number],
  color: THREE.Color,
  size: [number, number],
  life: [number, number],
  gravity?: number,
  drag?: number,
  colorVariant?: THREE.Color,
) => void;

export interface EffectContext {
  spawn: SpawnFn;
  /** Resolved hero portrait position in world coords. */
  heroPos: [number, number];
  /** Resolved monster portrait position in world coords. */
  monsterPos: [number, number];
}

/**
 * Dispatch an EffectEvent to spawn calls.
 *
 * Pure w.r.t. its inputs — given the same event + same spawn stub it
 * makes the same calls. Easy to test by passing a vi.fn() spawn.
 */
export function processEvent(ev: EffectEvent, ctx: EffectContext): void {
  const { spawn, heroPos, monsterPos } = ctx;
  const [heroX, heroY] = heroPos;
  const [monsterX, monsterY] = monsterPos;

  const isVictory = ev.label === 'victory';
  const isDefeat = ev.label === 'defeat';
  const isCombo = ev.label?.startsWith('Combo');

  if (isVictory) {
    spawn(100, 0, 0, 0,
      () => [(Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.2],
      C_GOLD, [0.15, 0.35], [1.5, 3], -0.002, 0.97, C_WHITE);
    return;
  }
  if (isDefeat) {
    spawn(50, 0, 4, 0,
      () => [(Math.random() - 0.5) * 0.3, -Math.random() * 0.15 - 0.05, (Math.random() - 0.5) * 0.1],
      C_DARK_RED, [0.12, 0.25], [2, 4], 0.005, 0.99, C_RED);
    return;
  }

  switch (ev.type) {
    case 'hero-attack': {
      const count = isCombo ? Math.min(60, 20 + ev.damage) : 30;
      const intensity = isCombo ? 0.4 : 0.3;
      spawn(count, monsterX, monsterY, 0,
        () => [(Math.random() - 0.5) * intensity, Math.random() * 0.25 + 0.1, (Math.random() - 0.5) * 0.05],
        C_GREEN, [0.1, 0.25], [0.8, 1.8], -0.003, 0.97, C_WHITE);
      break;
    }
    case 'monster-attack': {
      spawn(25, heroX, heroY, 0,
        () => [(Math.random() - 0.5) * 0.2, -Math.random() * 0.2 - 0.08, (Math.random() - 0.5) * 0.05],
        C_RED, [0.08, 0.18], [0.8, 1.5], 0.004, 0.98);
      break;
    }
    case 'hero-heal': {
      spawn(20, heroX, heroY, 0,
        () => [(Math.random() - 0.5) * 0.1, Math.random() * 0.1 + 0.03, (Math.random() - 0.5) * 0.03],
        C_HEAL_GREEN, [0.08, 0.15], [1, 2], -0.001, 0.99, C_WHITE);
      break;
    }
    case 'poison': {
      spawn(20, monsterX, monsterY, 0,
        (i) => {
          const angle = (i / 20) * Math.PI * 2;
          return [Math.cos(angle) * 0.15, Math.sin(angle) * 0.15, (Math.random() - 0.5) * 0.03];
        },
        C_PURPLE, [0.1, 0.18], [0.8, 1.5], 0, 0.96);
      break;
    }
    case 'empower': {
      spawn(25, heroX, heroY, 0,
        (i) => {
          const angle = (i / 25) * Math.PI * 2;
          return [Math.cos(angle) * 0.18, Math.sin(angle) * 0.18, 0];
        },
        C_GOLD, [0.1, 0.2], [0.8, 1.5], 0, 0.97, C_WHITE);
      break;
    }
    case 'face-card': {
      const isAwakens = ev.label?.includes('Awakens');
      const isRises = ev.label?.includes('Rises');
      const count = isAwakens ? 40 : isRises ? 25 : 15;
      const speed = isAwakens ? 0.25 : isRises ? 0.18 : 0.1;
      const baseColor = isAwakens ? C_ROYAL_GOLD : C_ROYAL_PURPLE;
      const variantColor = isAwakens ? C_WHITE : C_ROYAL_GOLD;
      const sizeRange: [number, number] = isAwakens ? [0.12, 0.3] : isRises ? [0.1, 0.22] : [0.06, 0.14];
      const lifeRange: [number, number] = isAwakens ? [1.2, 2.5] : isRises ? [0.8, 1.8] : [0.6, 1.2];
      spawn(count, heroX, heroY, 0,
        (n) => {
          const angle = (n / count) * Math.PI * 2 + Math.random() * 0.3;
          const r = speed * (0.7 + Math.random() * 0.6);
          return [Math.cos(angle) * r, Math.sin(angle) * r + 0.05, (Math.random() - 0.5) * 0.05];
        },
        baseColor, sizeRange, lifeRange, -0.001, 0.97, variantColor);
      break;
    }
  }
}
