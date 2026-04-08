import SlimeModel from './models/SlimeModel';
import GoblinModel from './models/GoblinModel';
import SkeletonModel from './models/SkeletonModel';
import WerewolfModel from './models/WerewolfModel';
import LichModel from './models/LichModel';
import DragonModel from './models/DragonModel';
import GltfCharacter from './GltfCharacter';
import { useCombatStore } from '../../game/combatStore';
import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';

const ARENA_FLOOR_OFFSET = 0;

export const MODEL_MAP: Record<string, React.ComponentType> = {
  slime: SlimeModel,
  goblin: GoblinModel,
  skeleton: SkeletonModel,
  werewolf: WerewolfModel,
  lich: LichModel,
  dragon: DragonModel,
};

// Monsters whose meshes/animations come from a compiled .glb instead of the
// procedural TSX components above. As characters are ported, move their key
// from MODEL_MAP into here. The procedural fallback stays in place until the
// last one is ported. URLs are resolved against Vite's BASE_URL so they work
// under the GitHub Pages subpath.
//
// `offsetY` shifts the model along Y at render time. The .glb contract puts
// feet at y=0, but the arena's procedural models were each authored with
// their own ad-hoc anchor offset (the old slime's body bottom was at y≈-1.5).
// This per-monster offset matches the new asset to the legacy visual anchor.
interface GltfEntry {
  url: string;
  offsetY?: number;
}
const GLTF_MODEL_MAP: Record<string, GltfEntry> = {
  slime: { url: `${import.meta.env.BASE_URL}models/slime.glb` },
  goblin: { url: `${import.meta.env.BASE_URL}models/goblin.glb` },
  skeleton: { url: `${import.meta.env.BASE_URL}models/skeleton.glb` },
  werewolf: { url: `${import.meta.env.BASE_URL}models/werewolf.glb` },
  lich: { url: `${import.meta.env.BASE_URL}models/lich.glb` },
  dragon: { url: `${import.meta.env.BASE_URL}models/dragon.glb` },
};

// Eagerly preload known glTF assets so the first arena entry doesn't stall.
for (const entry of Object.values(GLTF_MODEL_MAP)) {
  useGLTF.preload(entry.url);
}

interface Props {
  monsterId: string;
}

export default function MonsterModel({ monsterId }: Props) {
  const gltf = GLTF_MODEL_MAP[monsterId];
  if (gltf) {
    // glTF-backed monsters drive their own animation state from the combat
    // store; the legacy attack/hit-shake wrapper below would double up with
    // the in-glb actions, so we render the GltfCharacter directly.
    return (
      <Suspense fallback={null}>
        <group position={[0, gltf.offsetY ?? 0, 0]}>
          <GltfCharacter url={gltf.url} />
        </group>
      </Suspense>
    );
  }
  const Model = MODEL_MAP[monsterId] ?? DragonModel;
  const groupRef = useRef<THREE.Group>(null!);
  const lastEventId = useRef(-1);
  const hitTime = useRef(0);
  // Attack animation: anticipation -> strike -> return
  const attackPhase = useRef<'idle' | 'anticipate' | 'strike' | 'return'>('idle');
  const attackTimer = useRef(0);

  useFrame((_, delta) => {
    const cs = useCombatStore.getState();
    const group = groupRef.current;
    if (!group) return;

    // Detect events
    if (cs.eventId !== lastEventId.current && cs.lastEvent) {
      lastEventId.current = cs.eventId;
      if (cs.lastEvent.type === 'hero-attack' || cs.lastEvent.type === 'poison') {
        hitTime.current = 0.4;
      }
      if (cs.lastEvent.type === 'monster-attack') {
        attackPhase.current = 'anticipate';
        attackTimer.current = 0;
      }
    }

    // Attack animation (local Z: +Z = toward hero after -Y rotation)
    if (attackPhase.current !== 'idle') {
      attackTimer.current += delta;
      if (attackPhase.current === 'anticipate') {
        const t = Math.min(attackTimer.current / 0.15, 1);
        group.position.z = -0.25 * t;
        group.rotation.x = -0.08 * t;
        if (t >= 1) { attackPhase.current = 'strike'; attackTimer.current = 0; }
      } else if (attackPhase.current === 'strike') {
        const t = Math.min(attackTimer.current / 0.1, 1);
        group.position.z = -0.25 + 0.65 * t;
        group.rotation.x = -0.08 + 0.18 * t;
        if (t >= 1) { attackPhase.current = 'return'; attackTimer.current = 0; }
      } else if (attackPhase.current === 'return') {
        const t = Math.min(attackTimer.current / 0.3, 1);
        const ease = t * t * (3 - 2 * t);
        group.position.z = 0.4 * (1 - ease);
        group.rotation.x = 0.1 * (1 - ease);
        if (t >= 1) { attackPhase.current = 'idle'; group.position.z = 0; group.rotation.x = 0; }
      }
    }

    // Hit shake (only when not mid-attack)
    if (hitTime.current > 0 && attackPhase.current === 'idle') {
      hitTime.current -= delta;
      const intensity = hitTime.current * 8;
      group.position.z = Math.sin(hitTime.current * 60) * intensity * 0.05;
    } else if (attackPhase.current === 'idle' && hitTime.current <= 0) {
      group.position.z = 0;
    }
  });

  return (
    <group ref={groupRef} position={[0, ARENA_FLOOR_OFFSET, 0]}>
      <Model />
    </group>
  );
}
