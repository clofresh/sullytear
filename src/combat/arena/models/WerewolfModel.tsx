import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import CardSurfaceMaterial from '../CardSurfaceMaterial';

export default function WerewolfModel() {
  const groupRef = useRef<THREE.Group>(null!);
  const chestRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Heavy breathing
    if (chestRef.current) {
      const breathe = Math.sin(t * 1.8) * 0.04;
      chestRef.current.scale.set(1 + breathe, 1 - breathe * 0.3, 1 + breathe * 0.5);
    }
    // Menacing sway
    groupRef.current.rotation.z = Math.sin(t * 0.8) * 0.02;
    groupRef.current.position.y = Math.sin(t * 1.6) * 0.02;
  });

  const fur = '#4a4a5a';
  const darkFur = '#333344';

  return (
    <group ref={groupRef} position={[0, -0.4, 0]}>
      {/* Torso */}
      <mesh ref={chestRef} position={[0, 0.1, 0]}>
        <capsuleGeometry args={[0.35, 0.5, 8, 16]} />
        <CardSurfaceMaterial color={fur} cardDensity={12} gapSize={0.07} />
      </mesh>

      {/* Head / snout */}
      <mesh position={[0, 0.75, 0]}>
        <sphereGeometry args={[0.28, 12, 10]} />
        <CardSurfaceMaterial color={fur} cardDensity={10} gapSize={0.07} />
      </mesh>
      {/* Snout */}
      <mesh position={[0, 0.68, 0.22]} rotation={[0.3, 0, 0]}>
        <capsuleGeometry args={[0.1, 0.15, 6, 8]} />
        <CardSurfaceMaterial color={darkFur} cardDensity={6} gapSize={0.06} />
      </mesh>
      {/* Nose */}
      <mesh position={[0, 0.7, 0.35]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <CardSurfaceMaterial color="#111" cardDensity={3} gapSize={0.04} />
      </mesh>

      {/* Ears */}
      <mesh position={[-0.18, 1.0, 0]} rotation={[0, 0, -0.3]}>
        <coneGeometry args={[0.07, 0.2, 4]} />
        <CardSurfaceMaterial color={fur} cardDensity={5} gapSize={0.06} />
      </mesh>
      <mesh position={[0.18, 1.0, 0]} rotation={[0, 0, 0.3]}>
        <coneGeometry args={[0.07, 0.2, 4]} />
        <CardSurfaceMaterial color={fur} cardDensity={5} gapSize={0.06} />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.1, 0.82, 0.22]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <CardSurfaceMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.6} cardDensity={4} gapSize={0.04} />
      </mesh>
      <mesh position={[0.1, 0.82, 0.22]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <CardSurfaceMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.6} cardDensity={4} gapSize={0.04} />
      </mesh>

      {/* Arms — bulky */}
      <mesh position={[-0.45, 0.15, 0]} rotation={[0, 0, -0.3]}>
        <capsuleGeometry args={[0.1, 0.45, 6, 8]} />
        <CardSurfaceMaterial color={fur} cardDensity={8} gapSize={0.07} />
      </mesh>
      <mesh position={[0.45, 0.15, 0]} rotation={[0, 0, 0.3]}>
        <capsuleGeometry args={[0.1, 0.45, 6, 8]} />
        <CardSurfaceMaterial color={fur} cardDensity={8} gapSize={0.07} />
      </mesh>

      {/* Claws (left hand) */}
      {[-0.04, 0, 0.04].map((z, i) => (
        <mesh key={`cl${i}`} position={[-0.58, -0.12, z]} rotation={[0, 0, -0.5]}>
          <coneGeometry args={[0.015, 0.1, 4]} />
          <CardSurfaceMaterial color="#cccccc" cardDensity={3} gapSize={0.04} />
        </mesh>
      ))}
      {/* Claws (right hand) */}
      {[-0.04, 0, 0.04].map((z, i) => (
        <mesh key={`cr${i}`} position={[0.58, -0.12, z]} rotation={[0, 0, 0.5]}>
          <coneGeometry args={[0.015, 0.1, 4]} />
          <CardSurfaceMaterial color="#cccccc" cardDensity={3} gapSize={0.04} />
        </mesh>
      ))}

      {/* Legs */}
      <mesh position={[-0.15, -0.45, 0]}>
        <capsuleGeometry args={[0.1, 0.4, 6, 8]} />
        <CardSurfaceMaterial color={darkFur} cardDensity={8} gapSize={0.07} />
      </mesh>
      <mesh position={[0.15, -0.45, 0]}>
        <capsuleGeometry args={[0.1, 0.4, 6, 8]} />
        <CardSurfaceMaterial color={darkFur} cardDensity={8} gapSize={0.07} />
      </mesh>

      {/* Tail */}
      <mesh position={[0, -0.05, -0.35]} rotation={[0.8, 0, 0]}>
        <capsuleGeometry args={[0.04, 0.35, 4, 8]} />
        <CardSurfaceMaterial color={fur} cardDensity={5} gapSize={0.06} />
      </mesh>
    </group>
  );
}
