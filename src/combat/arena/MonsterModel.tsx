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

  useFrame((_, delta) => {
    const cs = useCombatStore.getState();
    const group = groupRef.current;
    if (!group) return;

    // Detect hit events
    if (cs.eventId !== lastEventId.current && cs.lastEvent) {
      lastEventId.current = cs.eventId;
      if (cs.lastEvent.type === 'hero-attack' || cs.lastEvent.type === 'poison') {
        hitTime.current = 0.4; // 400ms of shake
      }
    }

    // Hit shake
    if (hitTime.current > 0) {
      hitTime.current -= delta;
      const intensity = hitTime.current * 8;
      group.position.x = Math.sin(hitTime.current * 60) * intensity * 0.05;
    } else {
      group.position.x = 0;
    }
  });

  return (
    <group ref={groupRef}>
      <Model />
    </group>
  );
}
