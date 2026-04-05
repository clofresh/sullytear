import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCombatStore } from '../../game/combatStore';
import KnightModel from './models/KnightModel';

export default function HeroModel() {
  const groupRef = useRef<THREE.Group>(null!);
  const glowRef = useRef<THREE.PointLight>(null!);
  const lastEventId = useRef(-1);
  const hitTime = useRef(0);

  useFrame((_, delta) => {
    const cs = useCombatStore.getState();
    const group = groupRef.current;
    if (!group) return;

    // Detect monster-attack events -> trigger shake
    if (cs.eventId !== lastEventId.current && cs.lastEvent) {
      lastEventId.current = cs.eventId;
      if (cs.lastEvent.type === 'monster-attack') {
        hitTime.current = 0.4;
      }
    }

    // Shake along local Z (maps to world X after Y rotation)
    if (hitTime.current > 0) {
      hitTime.current -= delta;
      const intensity = hitTime.current * 8;
      group.position.z = Math.sin(hitTime.current * 60) * intensity * 0.05;
    } else {
      group.position.z = 0;
    }

    // Empowered glow
    if (glowRef.current) {
      glowRef.current.intensity = cs.empowered
        ? 1.5 + Math.sin(Date.now() * 0.005) * 0.5
        : 0;
    }
  });

  return (
    <group ref={groupRef}>
      <KnightModel />
      <pointLight ref={glowRef} color="#d4a843" intensity={0} distance={2} position={[0, 0.3, 0]} />
    </group>
  );
}
