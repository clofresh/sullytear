import SlimeModel from './models/SlimeModel';
import GoblinModel from './models/GoblinModel';
import SkeletonModel from './models/SkeletonModel';
import WerewolfModel from './models/WerewolfModel';
import LichModel from './models/LichModel';
import DragonModel from './models/DragonModel';
import { useCombatStore } from '../../game/combatStore';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const ARENA_FLOOR_OFFSET = -1.0;

const MODEL_MAP: Record<string, React.ComponentType> = {
  slime: SlimeModel,
  goblin: GoblinModel,
  skeleton: SkeletonModel,
  werewolf: WerewolfModel,
  lich: LichModel,
  dragon: DragonModel,
};

interface Props {
  monsterId: string;
}

export default function MonsterModel({ monsterId }: Props) {
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
