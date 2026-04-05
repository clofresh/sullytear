import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function SkeletonModel() {
  const groupRef = useRef<THREE.Group>(null!);
  const jawRef = useRef<THREE.Mesh>(null!);
  const swordRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Rattling idle sway
    groupRef.current.rotation.z = Math.sin(t * 2.5) * 0.02;
    groupRef.current.position.y = Math.sin(t * 3) * 0.015;

    // Jaw chatter
    if (jawRef.current) {
      jawRef.current.position.y = -0.12 - Math.abs(Math.sin(t * 5)) * 0.03;
    }

    // Sword idle swing
    if (swordRef.current) {
      swordRef.current.rotation.z = Math.sin(t * 1.5) * 0.1 + 0.3;
    }
  });

  const bone = '#e8e0d0';

  return (
    <group ref={groupRef} position={[0, -0.5, 0]}>
      {/* Skull */}
      <mesh position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.25, 12, 10]} />
        <meshStandardMaterial color={bone} roughness={0.8} />
      </mesh>

      {/* Eye sockets — dark inset */}
      <mesh position={[-0.08, 0.9, 0.2]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#ff3333" emissive="#ff2222" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0.08, 0.9, 0.2]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#ff3333" emissive="#ff2222" emissiveIntensity={0.8} />
      </mesh>

      {/* Jaw */}
      <mesh ref={jawRef} position={[0, 0.73, 0.08]}>
        <boxGeometry args={[0.18, 0.06, 0.15]} />
        <meshStandardMaterial color={bone} roughness={0.8} />
      </mesh>

      {/* Spine */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.6, 6]} />
        <meshStandardMaterial color={bone} roughness={0.8} />
      </mesh>

      {/* Ribcage */}
      {[-0.12, 0, 0.12].map((offset, i) => (
        <mesh key={i} position={[0, 0.4 + offset, 0]}>
          <torusGeometry args={[0.15, 0.02, 4, 12, Math.PI]} />
          <meshStandardMaterial color={bone} roughness={0.8} />
        </mesh>
      ))}

      {/* Left arm */}
      <mesh position={[-0.25, 0.35, 0]} rotation={[0, 0, -0.5]}>
        <cylinderGeometry args={[0.025, 0.025, 0.5, 4]} />
        <meshStandardMaterial color={bone} />
      </mesh>

      {/* Right arm + sword */}
      <group ref={swordRef} position={[0.25, 0.35, 0]}>
        <mesh rotation={[0, 0, 0.5]}>
          <cylinderGeometry args={[0.025, 0.025, 0.5, 4]} />
          <meshStandardMaterial color={bone} />
        </mesh>
        {/* Sword */}
        <mesh position={[0.2, 0.35, 0]}>
          <boxGeometry args={[0.04, 0.6, 0.02]} />
          <meshStandardMaterial color="#aaaaaa" metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0.2, 0.05, 0]}>
          <boxGeometry args={[0.15, 0.04, 0.03]} />
          <meshStandardMaterial color="#8B6914" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>

      {/* Pelvis */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.25, 0.1, 0.12]} />
        <meshStandardMaterial color={bone} roughness={0.8} />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.08, -0.25, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.5, 4]} />
        <meshStandardMaterial color={bone} />
      </mesh>
      <mesh position={[0.08, -0.25, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.5, 4]} />
        <meshStandardMaterial color={bone} />
      </mesh>
    </group>
  );
}
