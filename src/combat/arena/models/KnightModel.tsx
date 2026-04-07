import { useRef } from 'react';
import * as THREE from 'three';
import { useIdleAnimation } from './useIdleAnimation';

export default function KnightModel() {
  const groupRef = useRef<THREE.Group>(null!);
  const swordArmRef = useRef<THREE.Group>(null!);

  useIdleAnimation(groupRef, {
    baseY: -0.5,
    breath: { rate: 1.5, amount: 0.02 },
    sway: { rate: 1.0, amount: 0.015 },
    extra: (t) => {
      if (swordArmRef.current) {
        swordArmRef.current.rotation.z = 0.3 + Math.sin(t * 1.2) * 0.05;
      }
    },
  });

  const armor = '#6a6a7a';
  const darkArmor = '#5a5a6a';
  const blade = '#c0c0c0';
  const gold = '#d4a843';
  const shield = '#3a6a9a';
  const leather = '#8B4513';

  return (
    <group ref={groupRef} position={[0, -0.5, 0]}>
      {/* === HEAD === */}
      {/* Helmet */}
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.22, 12, 10]} />
        <meshStandardMaterial color={armor} metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Visor slit */}
      <mesh position={[0, 0.87, 0.2]}>
        <boxGeometry args={[0.2, 0.04, 0.06]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      {/* Plume */}
      <mesh position={[0, 1.15, -0.05]} rotation={[0.15, 0, 0]}>
        <coneGeometry args={[0.06, 0.3, 6]} />
        <meshStandardMaterial color="#cc3333" roughness={0.8} />
      </mesh>

      {/* === TORSO === */}
      {/* Chest armor */}
      <mesh position={[0, 0.4, 0]}>
        <capsuleGeometry args={[0.28, 0.4, 8, 16]} />
        <meshStandardMaterial color={armor} metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Belt */}
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.45, 0.06, 0.25]} />
        <meshStandardMaterial color={leather} roughness={0.9} />
      </mesh>
      {/* Belt buckle */}
      <mesh position={[0, 0.12, 0.13]}>
        <boxGeometry args={[0.06, 0.05, 0.02]} />
        <meshStandardMaterial color={gold} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* === SHIELD ARM (left, -X side) === */}
      {/* Upper arm */}
      <mesh position={[-0.35, 0.4, 0]} rotation={[0, 0, -0.2]}>
        <capsuleGeometry args={[0.08, 0.25, 4, 8]} />
        <meshStandardMaterial color={armor} metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Shield */}
      <group position={[-0.42, 0.25, 0.12]}>
        <mesh>
          <boxGeometry args={[0.05, 0.45, 0.35]} />
          <meshStandardMaterial color={shield} metalness={0.2} roughness={0.6} />
        </mesh>
        {/* Shield border */}
        <mesh position={[-0.026, 0, 0]}>
          <boxGeometry args={[0.005, 0.45, 0.35]} />
          <meshStandardMaterial color="#6aafe0" metalness={0.3} roughness={0.4} />
        </mesh>
        {/* Cross vertical */}
        <mesh position={[-0.03, 0, 0]}>
          <boxGeometry args={[0.005, 0.25, 0.06]} />
          <meshStandardMaterial color="#cc3333" />
        </mesh>
        {/* Cross horizontal */}
        <mesh position={[-0.03, 0.02, 0]}>
          <boxGeometry args={[0.005, 0.06, 0.2]} />
          <meshStandardMaterial color="#cc3333" />
        </mesh>
      </group>

      {/* === SWORD ARM (right, +X side) === */}
      <group ref={swordArmRef} position={[0.35, 0.45, 0]} rotation={[0, 0, 0.3]}>
        {/* Upper arm */}
        <mesh>
          <capsuleGeometry args={[0.08, 0.25, 4, 8]} />
          <meshStandardMaterial color={armor} metalness={0.3} roughness={0.5} />
        </mesh>
        {/* Hand / grip area */}
        <mesh position={[0.05, -0.2, 0]}>
          <sphereGeometry args={[0.05, 6, 6]} />
          <meshStandardMaterial color={leather} />
        </mesh>
        {/* Sword blade */}
        <mesh position={[0.05, 0.2, 0]}>
          <boxGeometry args={[0.04, 0.6, 0.02]} />
          <meshStandardMaterial color={blade} metalness={0.8} roughness={0.15} />
        </mesh>
        {/* Sword tip */}
        <mesh position={[0.05, 0.52, 0]} rotation={[0, 0, 0]}>
          <coneGeometry args={[0.02, 0.08, 4]} />
          <meshStandardMaterial color={blade} metalness={0.8} roughness={0.15} />
        </mesh>
        {/* Crossguard */}
        <mesh position={[0.05, -0.1, 0]}>
          <boxGeometry args={[0.15, 0.03, 0.04]} />
          <meshStandardMaterial color={gold} metalness={0.6} roughness={0.3} />
        </mesh>
      </group>

      {/* === LEGS === */}
      {/* Left leg */}
      <mesh position={[-0.12, -0.25, 0]}>
        <capsuleGeometry args={[0.09, 0.35, 4, 8]} />
        <meshStandardMaterial color={darkArmor} metalness={0.2} roughness={0.6} />
      </mesh>
      {/* Right leg */}
      <mesh position={[0.12, -0.25, 0]}>
        <capsuleGeometry args={[0.09, 0.35, 4, 8]} />
        <meshStandardMaterial color={darkArmor} metalness={0.2} roughness={0.6} />
      </mesh>
      {/* Left boot */}
      <mesh position={[-0.12, -0.52, 0.03]}>
        <boxGeometry args={[0.1, 0.08, 0.15]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
      </mesh>
      {/* Right boot */}
      <mesh position={[0.12, -0.52, 0.03]}>
        <boxGeometry args={[0.1, 0.08, 0.15]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
      </mesh>
    </group>
  );
}
