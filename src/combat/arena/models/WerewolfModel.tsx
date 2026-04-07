import { useRef } from 'react';
import * as THREE from 'three';
import { useIdleAnimation } from './useIdleAnimation';

export default function WerewolfModel() {
  const groupRef = useRef<THREE.Group>(null!);
  const chestRef = useRef<THREE.Mesh>(null!);

  useIdleAnimation(groupRef, {
    baseY: 0,
    breath: { rate: 1.6, amount: 0.02 },
    sway: { rate: 0.8, amount: 0.02 },
    extra: (t) => {
      if (chestRef.current) {
        const breathe = Math.sin(t * 1.8) * 0.04;
        chestRef.current.scale.set(1 + breathe, 1 - breathe * 0.3, 1 + breathe * 0.5);
      }
    },
  });

  const fur = '#4a4a5a';
  const darkFur = '#333344';

  return (
    <group ref={groupRef}>
      {/* Torso */}
      <mesh ref={chestRef} position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.35, 0.5, 8, 16]} />
        <meshStandardMaterial color={fur} roughness={0.9} />
      </mesh>

      {/* Head / snout */}
      <mesh position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.28, 12, 10]} />
        <meshStandardMaterial color={fur} roughness={0.9} />
      </mesh>
      {/* Snout */}
      <mesh position={[0, 1.08, 0.22]} rotation={[0.3, 0, 0]}>
        <capsuleGeometry args={[0.1, 0.15, 6, 8]} />
        <meshStandardMaterial color={darkFur} roughness={0.8} />
      </mesh>
      {/* Nose */}
      <mesh position={[0, 1.1, 0.35]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* Ears */}
      <mesh position={[-0.18, 1.4, 0]} rotation={[0, 0, -0.3]}>
        <coneGeometry args={[0.07, 0.2, 4]} />
        <meshStandardMaterial color={fur} />
      </mesh>
      <mesh position={[0.18, 1.4, 0]} rotation={[0, 0, 0.3]}>
        <coneGeometry args={[0.07, 0.2, 4]} />
        <meshStandardMaterial color={fur} />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.1, 1.22, 0.22]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0.1, 1.22, 0.22]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.6} />
      </mesh>

      {/* Arms — bulky */}
      <mesh position={[-0.45, 0.55, 0]} rotation={[0, 0, -0.3]}>
        <capsuleGeometry args={[0.1, 0.45, 6, 8]} />
        <meshStandardMaterial color={fur} roughness={0.9} />
      </mesh>
      <mesh position={[0.45, 0.55, 0]} rotation={[0, 0, 0.3]}>
        <capsuleGeometry args={[0.1, 0.45, 6, 8]} />
        <meshStandardMaterial color={fur} roughness={0.9} />
      </mesh>

      {/* Claws (left hand) */}
      {[-0.04, 0, 0.04].map((z, i) => (
        <mesh key={`cl${i}`} position={[-0.58, -0.12, z]} rotation={[0, 0, -0.5]}>
          <coneGeometry args={[0.015, 0.1, 4]} />
          <meshStandardMaterial color="#cccccc" />
        </mesh>
      ))}
      {/* Claws (right hand) */}
      {[-0.04, 0, 0.04].map((z, i) => (
        <mesh key={`cr${i}`} position={[0.58, -0.12, z]} rotation={[0, 0, 0.5]}>
          <coneGeometry args={[0.015, 0.1, 4]} />
          <meshStandardMaterial color="#cccccc" />
        </mesh>
      ))}

      {/* Legs */}
      <mesh position={[-0.15, 0.15, 0]}>
        <capsuleGeometry args={[0.1, 0.4, 6, 8]} />
        <meshStandardMaterial color={darkFur} roughness={0.9} />
      </mesh>
      <mesh position={[0.15, 0.15, 0]}>
        <capsuleGeometry args={[0.1, 0.4, 6, 8]} />
        <meshStandardMaterial color={darkFur} roughness={0.9} />
      </mesh>

      {/* Tail */}
      <mesh position={[0, 0.55, -0.35]} rotation={[0.8, 0, 0]}>
        <capsuleGeometry args={[0.04, 0.35, 4, 8]} />
        <meshStandardMaterial color={fur} />
      </mesh>
    </group>
  );
}
