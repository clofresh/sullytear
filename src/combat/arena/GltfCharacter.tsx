import { useEffect, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCombatStore } from '../../game/combatStore';

interface Props {
  url: string;
}

// Renders a glTF character with the four standard actions wired to the
// combat store. Source assets live in public/models/ and are produced either
// by an artist in Blender or by scripts/compile-models.mjs from a TOML source.
//
// The .glb is expected to satisfy the contract enforced by
// scripts/validate-gltf.mjs: feet at origin, height in [0.3, 4.0], and the
// four animations named exactly idle/attack/hit/death.
export default function GltfCharacter({ url }: Props) {
  const group = useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF(url);
  const { actions, mixer } = useAnimations(animations, group);
  const lastEventId = useRef(-1);

  // Kick off the looping idle on mount and whenever the action set changes
  // (action identities change when the GLTF cache hands us a fresh clone).
  useEffect(() => {
    const idle = actions.idle;
    if (!idle) {
      console.warn(`GltfCharacter: ${url} has no "idle" action`);
      return;
    }
    idle.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.15).play();
    return () => {
      idle.fadeOut(0.15);
    };
  }, [actions, url]);

  // React to combat events by triggering the matching one-shot action and
  // returning to idle when it finishes. We poll the store inside useFrame
  // (instead of subscribing) to match the pattern in MonsterModel.tsx.
  useFrame(() => {
    const cs = useCombatStore.getState();
    if (cs.eventId === lastEventId.current || !cs.lastEvent) return;
    lastEventId.current = cs.eventId;

    let nextName: 'attack' | 'hit' | 'death' | null = null;
    if (cs.lastEvent.type === 'monster-attack') nextName = 'attack';
    else if (cs.lastEvent.type === 'hero-attack' || cs.lastEvent.type === 'poison') nextName = 'hit';
    if (!nextName) return;

    const next = actions[nextName];
    const idle = actions.idle;
    if (!next) return;

    next.reset();
    next.setLoop(THREE.LoopOnce, 1);
    next.clampWhenFinished = false;
    if (idle) idle.fadeOut(0.1);
    next.fadeIn(0.1).play();

    const onFinished = (e: { action: THREE.AnimationAction }) => {
      if (e.action !== next) return;
      mixer.removeEventListener('finished', onFinished as never);
      next.fadeOut(0.15);
      if (idle) idle.reset().fadeIn(0.15).play();
    };
    mixer.addEventListener('finished', onFinished as never);
  });

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}
