import { useRef } from 'react';
import * as THREE from 'three';
import { useIdleAnimation } from './useIdleAnimation';

export default function LichModel() {
  const groupRef = useRef<THREE.Group>(null!);
  const orbRef = useRef<THREE.Mesh>(null!);
  const eyeLRef = useRef<THREE.Mesh>(null!);
  const eyeRRef = useRef<THREE.Mesh>(null!);

  useIdleAnimation(groupRef, {
    baseY: 0,
    breath: { rate: 1.2, amount: 0.06 },
    sway: { rate: 0.7, amount: 0.02 },
    extra: (t) => {
      if (orbRef.current) {
        const pulse = 0.5 + Math.sin(t * 2.5) * 0.3;
        (orbRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
        orbRef.current.scale.setScalar(1 + Math.sin(t * 2.5) * 0.1);
      }
      const flicker = 0.6 + Math.sin(t * 4) * 0.3;
      if (eyeLRef.current) (eyeLRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = flicker;
      if (eyeRRef.current) (eyeRRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = flicker;
    },
  });

  const robe = '#3a1a5a';

  return (
    <group ref={groupRef}>
      {/* Robe body — cone */}
      <mesh position={[0, 0.1, 0]}>
        <coneGeometry args={[0.5, 1.2, 8]} />
        <meshStandardMaterial color={robe} roughness={0.9} />
      </mesh>

      {/* Hood */}
      <mesh position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.28, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <meshStandardMaterial color={robe} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* Face shadow */}
      <mesh position={[0, 0.75, 0.1]}>
        <sphereGeometry args={[0.18, 10, 8]} />
        <meshStandardMaterial color="#0a0015" roughness={1} />
      </mesh>

      {/* Glowing eyes */}
      <mesh ref={eyeLRef} position={[-0.07, 0.78, 0.2]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#aa44ff" emissive="#aa44ff" emissiveIntensity={0.8} />
      </mesh>
      <mesh ref={eyeRRef} position={[0.07, 0.78, 0.2]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#aa44ff" emissive="#aa44ff" emissiveIntensity={0.8} />
      </mesh>

      {/* Staff */}
      <mesh position={[0.5, 0.4, 0]}>
        <cylinderGeometry args={[0.02, 0.025, 1.4, 6]} />
        <meshStandardMaterial color="#555555" roughness={0.6} />
      </mesh>

      {/* Staff orb */}
      <mesh ref={orbRef} position={[0.5, 1.15, 0]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color="#7733cc" emissive="#7733cc" emissiveIntensity={0.5} transparent opacity={0.9} />
      </mesh>

      {/* Skeletal hands */}
      <mesh position={[-0.3, 0.4, 0.15]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshStandardMaterial color="#d0c8b8" roughness={0.8} />
      </mesh>
      <mesh position={[0.35, 0.6, 0.1]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshStandardMaterial color="#d0c8b8" roughness={0.8} />
      </mesh>
    </group>
  );
}
