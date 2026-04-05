import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import CardSurfaceMaterial from '../CardSurfaceMaterial';

export default function LichModel() {
  const groupRef = useRef<THREE.Group>(null!);
  const orbRef = useRef<THREE.ShaderMaterial>(null!);
  const eyeLRef = useRef<THREE.ShaderMaterial>(null!);
  const eyeRRef = useRef<THREE.ShaderMaterial>(null!);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Hovering float
    groupRef.current.position.y = Math.sin(t * 1.2) * 0.06;
    groupRef.current.rotation.z = Math.sin(t * 0.7) * 0.02;

    // Staff orb pulse
    if (orbRef.current) {
      const pulse = 0.5 + Math.sin(t * 2.5) * 0.3;
      orbRef.current.uniforms.uEmissiveIntensity.value = pulse;
    }

    // Eye flicker
    const flicker = 0.6 + Math.sin(t * 4) * 0.3;
    if (eyeLRef.current) eyeLRef.current.uniforms.uEmissiveIntensity.value = flicker;
    if (eyeRRef.current) eyeRRef.current.uniforms.uEmissiveIntensity.value = flicker;
  });

  const robe = '#3a1a5a';

  return (
    <group ref={groupRef} position={[0, -0.3, 0]}>
      {/* Robe body — cone */}
      <mesh position={[0, -0.2, 0]}>
        <coneGeometry args={[0.5, 1.2, 8]} />
        <CardSurfaceMaterial color={robe} cardDensity={14} gapSize={0.07} />
      </mesh>

      {/* Hood */}
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.28, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <CardSurfaceMaterial color={robe} cardDensity={10} gapSize={0.06} side={THREE.DoubleSide} />
      </mesh>

      {/* Face shadow */}
      <mesh position={[0, 0.45, 0.1]}>
        <sphereGeometry args={[0.18, 10, 8]} />
        <CardSurfaceMaterial color="#0a0015" cardDensity={8} gapSize={0.06} />
      </mesh>

      {/* Glowing eyes */}
      <mesh position={[-0.07, 0.48, 0.2]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <CardSurfaceMaterial ref={eyeLRef} color="#aa44ff" emissive="#aa44ff" emissiveIntensity={0.8} cardDensity={3} gapSize={0.04} />
      </mesh>
      <mesh position={[0.07, 0.48, 0.2]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <CardSurfaceMaterial ref={eyeRRef} color="#aa44ff" emissive="#aa44ff" emissiveIntensity={0.8} cardDensity={3} gapSize={0.04} />
      </mesh>

      {/* Staff */}
      <mesh position={[0.5, 0.1, 0]}>
        <cylinderGeometry args={[0.02, 0.025, 1.4, 6]} />
        <CardSurfaceMaterial color="#555555" cardDensity={6} gapSize={0.06} />
      </mesh>

      {/* Staff orb */}
      <mesh position={[0.5, 0.85, 0]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <CardSurfaceMaterial ref={orbRef} color="#7733cc" emissive="#7733cc" emissiveIntensity={0.5} opacity={0.9} transparent cardDensity={6} gapSize={0.05} />
      </mesh>

      {/* Skeletal hands */}
      <mesh position={[-0.3, 0.1, 0.15]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <CardSurfaceMaterial color="#d0c8b8" cardDensity={4} gapSize={0.05} />
      </mesh>
      <mesh position={[0.35, 0.3, 0.1]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <CardSurfaceMaterial color="#d0c8b8" cardDensity={4} gapSize={0.05} />
      </mesh>
    </group>
  );
}
