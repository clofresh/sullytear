import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/store';

const PARTICLE_COUNT = 300;

export default function Particles() {
  const meshRef = useRef<THREE.Points>(null);
  const isWon = useGameStore(s => s.isWon);

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5;

      velocities[i * 3] = (Math.random() - 0.5) * 0.002;
      velocities[i * 3 + 1] = 0.003 + Math.random() * 0.005;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.001;

    }

    return { positions, velocities };
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const posAttr = meshRef.current.geometry.attributes.position;
    const pos = posAttr.array as Float32Array;
    const speed = isWon ? 5 : 1;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] += velocities[i * 3] * delta * 60 * speed;
      pos[i * 3 + 1] += velocities[i * 3 + 1] * delta * 60 * speed;
      pos[i * 3 + 2] += velocities[i * 3 + 2] * delta * 60 * speed;

      // Sinusoidal horizontal drift
      pos[i * 3] += Math.sin(Date.now() * 0.001 + i) * 0.001 * speed;

      // Wrap around
      if (pos[i * 3 + 1] > 10) pos[i * 3 + 1] = -10;
      if (pos[i * 3] > 10) pos[i * 3] = -10;
      if (pos[i * 3] < -10) pos[i * 3] = 10;
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={meshRef} geometry={geometry}>
      <pointsMaterial
        size={isWon ? 0.08 : 0.04}
        color={isWon ? '#d4a843' : '#4a8a5a'}
        transparent
        opacity={isWon ? 0.6 : 0.3}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
