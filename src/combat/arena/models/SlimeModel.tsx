import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function SlimeModel() {
  const bodyRef = useRef<THREE.Mesh>(null!);
  const eyeLRef = useRef<THREE.Mesh>(null!);
  const eyeRRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Breathing squash/stretch
    const breathe = Math.sin(t * 2) * 0.08;
    bodyRef.current.scale.set(1 + breathe, 1 - breathe * 0.6, 1 + breathe);
    bodyRef.current.position.y = -0.3 + breathe * 0.1;

    // Jiggle bounce
    const bounce = Math.abs(Math.sin(t * 1.5)) * 0.1;
    bodyRef.current.position.y += bounce;

    // Eyes follow body scale
    const eyeY = 0.15 + bounce - breathe * 0.3;
    eyeLRef.current.position.y = eyeY;
    eyeRRef.current.position.y = eyeY;
  });

  return (
    <group position={[0, -0.5, 0]}>
      {/* Body — flattened sphere */}
      <mesh ref={bodyRef} position={[0, -0.3, 0]}>
        <sphereGeometry args={[0.7, 24, 16]} />
        <meshStandardMaterial color="#44cc44" roughness={0.2} metalness={0.1} />
      </mesh>

      {/* Left eye */}
      <mesh ref={eyeLRef} position={[-0.2, 0.15, 0.55]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-0.2, 0.15, 0.63]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#111111" />
      </mesh>

      {/* Right eye */}
      <mesh ref={eyeRRef} position={[0.2, 0.15, 0.55]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.2, 0.15, 0.63]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#111111" />
      </mesh>

      {/* Highlight/sheen */}
      <mesh position={[-0.15, 0.25, 0.5]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#88ff88" emissive="#88ff88" emissiveIntensity={0.3} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}
