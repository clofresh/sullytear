import { useFrame } from '@react-three/fiber';
import type { RefObject } from 'react';
import * as THREE from 'three';

export interface IdleAnimationConfig {
  /** Base Y position the model rests at. */
  baseY?: number;
  /** Sine animation applied to position.y (breathing/floating). */
  breath?: { rate: number; amount: number };
  /** Sine animation applied to rotation.z (sway). */
  sway?: { rate: number; amount: number };
  /**
   * Optional extra per-frame callback. Use this for monster-specific
   * animation (wing flap, sword arm, jaw chatter, etc.) so each model
   * file stays declarative for its idle parts.
   */
  extra?: (t: number) => void;
}

/**
 * Shared idle-animation hook for combat arena models.
 *
 * Every monster model used to inline a near-identical `useFrame` block:
 * a sine-based breath on `position.y` and a subtle sway on `rotation.z`,
 * plus monster-specific extras. This hook centralizes the breath/sway
 * boilerplate while letting each model pass its quirky bits via `extra`.
 */
export function useIdleAnimation(
  groupRef: RefObject<THREE.Group>,
  config: IdleAnimationConfig,
) {
  const baseY = config.baseY ?? 0;
  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const t = clock.elapsedTime;
    if (config.breath) {
      g.position.y = baseY + Math.sin(t * config.breath.rate) * config.breath.amount;
    } else {
      g.position.y = baseY;
    }
    if (config.sway) {
      g.rotation.z = Math.sin(t * config.sway.rate) * config.sway.amount;
    }
    config.extra?.(t);
  });
}
