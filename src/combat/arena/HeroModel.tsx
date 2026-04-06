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
      if (cs.lastEvent.type === 'monster-attack') {
        hitTime.current = 0.4;
      }
      if (cs.lastEvent.type === 'hero-attack') {
        attackPhase.current = 'anticipate';
        attackTimer.current = 0;
      }
    }

    // Attack animation (local Z: +Z = toward monster after Y rotation)
    if (attackPhase.current !== 'idle') {
      attackTimer.current += delta;
      if (attackPhase.current === 'anticipate') {
        // Wind up: pull back over 0.12s
        const t = Math.min(attackTimer.current / 0.12, 1);
        group.position.z = -0.3 * t;
        group.rotation.x = -0.1 * t;
        if (t >= 1) { attackPhase.current = 'strike'; attackTimer.current = 0; }
      } else if (attackPhase.current === 'strike') {
        // Lunge forward over 0.08s
        const t = Math.min(attackTimer.current / 0.08, 1);
        group.position.z = -0.3 + 0.7 * t;
        group.rotation.x = -0.1 + 0.2 * t;
        if (t >= 1) { attackPhase.current = 'return'; attackTimer.current = 0; }
      } else if (attackPhase.current === 'return') {
        // Ease back over 0.25s
        const t = Math.min(attackTimer.current / 0.25, 1);
        const ease = t * t * (3 - 2 * t); // smoothstep
        group.position.z = 0.4 * (1 - ease);
        group.rotation.x = 0.1 * (1 - ease);
        if (t >= 1) { attackPhase.current = 'idle'; group.position.z = 0; group.rotation.x = 0; }
      }
    }

    // Shake along local Z when hit (only if not mid-attack)
    if (hitTime.current > 0 && attackPhase.current === 'idle') {
      hitTime.current -= delta;
      const intensity = hitTime.current * 8;
      group.position.z = Math.sin(hitTime.current * 60) * intensity * 0.05;
    } else if (attackPhase.current === 'idle' && hitTime.current <= 0) {
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
