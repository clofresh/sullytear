import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function GoblinModel() {
  const groupRef = useRef<THREE.Group>(null!);
  const daggerRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Idle sway
    groupRef.current.rotation.z = Math.sin(t * 1.2) * 0.03;
    groupRef.current.position.y = Math.sin(t * 2) * 0.03;

    // Dagger menacing wave
    if (daggerRef.current) {
      daggerRef.current.rotation.z = Math.sin(t * 3) * 0.15 - 0.3;
    }
  });

  const green = '#5a8a3a';
  const darkGreen = '#3d6b24';

  return (
    <group ref={groupRef} position={[0, -0.6, 0]}>
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.3, 0.5, 8, 16]} />
        <meshStandardMaterial color={green} roughness={0.7} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.7, 0]}>
        <sphereGeometry args={[0.3, 16, 12]} />
        <meshStandardMaterial color={green} roughness={0.6} />
      </mesh>

      {/* Left ear */}
      <mesh position={[-0.35, 0.9, 0]} rotation={[0, 0, -0.5]}>
        <coneGeometry args={[0.08, 0.35, 6]} />
        <meshStandardMaterial color={green} />
      </mesh>

      {/* Right ear */}
      <mesh position={[0.35, 0.9, 0]} rotation={[0, 0, 0.5]}>
        <coneGeometry args={[0.08, 0.35, 6]} />
        <meshStandardMaterial color={green} />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.1, 0.75, 0.25]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0.1, 0.75, 0.25]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.4} />
      </mesh>

      {/* Nose */}
      <mesh position={[0, 0.65, 0.28]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshStandardMaterial color={darkGreen} />
      </mesh>

      {/* Left arm */}
      <mesh position={[-0.4, 0.1, 0]} rotation={[0, 0, -0.4]}>
        <capsuleGeometry args={[0.07, 0.35, 4, 8]} />
        <meshStandardMaterial color={green} />
      </mesh>

      {/* Right arm + dagger */}
      <group ref={daggerRef} position={[0.4, 0.15, 0]} rotation={[0, 0, 0.3]}>
        <mesh>
          <capsuleGeometry args={[0.07, 0.35, 4, 8]} />
          <meshStandardMaterial color={green} />
        </mesh>
        {/* Dagger blade */}
        <mesh position={[0.05, 0.35, 0]} rotation={[0, 0, 0.2]}>
          <coneGeometry args={[0.03, 0.3, 4]} />
          <meshStandardMaterial color="#cccccc" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Legs */}
      <mesh position={[-0.12, -0.5, 0]}>
        <capsuleGeometry args={[0.08, 0.3, 4, 8]} />
        <meshStandardMaterial color={darkGreen} />
      </mesh>
      <mesh position={[0.12, -0.5, 0]}>
        <capsuleGeometry args={[0.08, 0.3, 4, 8]} />
        <meshStandardMaterial color={darkGreen} />
      </mesh>
    </group>
  );
}
