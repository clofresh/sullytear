import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function DragonModel() {
  const groupRef = useRef<THREE.Group>(null!);
  const wingLRef = useRef<THREE.Mesh>(null!);
  const wingRRef = useRef<THREE.Mesh>(null!);
  const tailRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Breathing
    groupRef.current.position.y = Math.sin(t * 1.0) * 0.04;
    groupRef.current.rotation.z = Math.sin(t * 0.6) * 0.015;

    // Wing flap
    if (wingLRef.current && wingRRef.current) {
      const flap = Math.sin(t * 1.5) * 0.2;
      wingLRef.current.rotation.z = -0.6 + flap;
      wingRRef.current.rotation.z = 0.6 - flap;
    }

    // Tail sway
    if (tailRef.current) {
      tailRef.current.rotation.y = Math.sin(t * 1.2) * 0.2;
    }
  });

  const bodyColor = '#8B2500';
  const bellyColor = '#cc6633';
  const wingColor = '#6a1a00';

  return (
    <group ref={groupRef} position={[0, -0.3, 0]}>
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.4, 0.6, 8, 16]} />
        <meshStandardMaterial color={bodyColor} roughness={0.7} />
      </mesh>

      {/* Belly plate */}
      <mesh position={[0, -0.05, 0.3]}>
        <capsuleGeometry args={[0.25, 0.3, 6, 12]} />
        <meshStandardMaterial color={bellyColor} roughness={0.6} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 0.5, 0.15]} rotation={[0.3, 0, 0]}>
        <capsuleGeometry args={[0.15, 0.3, 6, 8]} />
        <meshStandardMaterial color={bodyColor} roughness={0.7} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.8, 0.25]}>
        <sphereGeometry args={[0.22, 12, 10]} />
        <meshStandardMaterial color={bodyColor} roughness={0.7} />
      </mesh>

      {/* Snout */}
      <mesh position={[0, 0.75, 0.45]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.15, 0.1, 0.2]} />
        <meshStandardMaterial color={bodyColor} roughness={0.7} />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.1, 0.85, 0.4]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0.1, 0.85, 0.4]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.6} />
      </mesh>

      {/* Horns */}
      <mesh position={[-0.12, 0.95, 0.15]} rotation={[0.3, 0, -0.3]}>
        <coneGeometry args={[0.03, 0.2, 4]} />
        <meshStandardMaterial color="#5a1a00" />
      </mesh>
      <mesh position={[0.12, 0.95, 0.15]} rotation={[0.3, 0, 0.3]}>
        <coneGeometry args={[0.03, 0.2, 4]} />
        <meshStandardMaterial color="#5a1a00" />
      </mesh>

      {/* Left wing */}
      <mesh ref={wingLRef} position={[-0.4, 0.3, -0.1]} rotation={[0, 0, -0.6]}>
        <planeGeometry args={[0.8, 0.5, 1, 1]} />
        <meshStandardMaterial color={wingColor} side={THREE.DoubleSide} roughness={0.8} />
      </mesh>

      {/* Right wing */}
      <mesh ref={wingRRef} position={[0.4, 0.3, -0.1]} rotation={[0, 0, 0.6]}>
        <planeGeometry args={[0.8, 0.5, 1, 1]} />
        <meshStandardMaterial color={wingColor} side={THREE.DoubleSide} roughness={0.8} />
      </mesh>

      {/* Tail */}
      <group ref={tailRef} position={[0, -0.2, -0.4]}>
        <mesh rotation={[0.5, 0, 0]}>
          <capsuleGeometry args={[0.08, 0.4, 4, 8]} />
          <meshStandardMaterial color={bodyColor} roughness={0.7} />
        </mesh>
        {/* Tail tip */}
        <mesh position={[0, -0.15, -0.35]} rotation={[0.8, 0, 0]}>
          <coneGeometry args={[0.06, 0.15, 4]} />
          <meshStandardMaterial color="#cc4400" />
        </mesh>
      </group>

      {/* Front claws */}
      <mesh position={[-0.3, -0.35, 0.15]} rotation={[0, 0, -0.2]}>
        <capsuleGeometry args={[0.07, 0.25, 4, 8]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      <mesh position={[0.3, -0.35, 0.15]} rotation={[0, 0, 0.2]}>
        <capsuleGeometry args={[0.07, 0.25, 4, 8]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
    </group>
  );
}
