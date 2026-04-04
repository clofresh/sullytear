import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CombatVisualState } from './useCombatEffects';

const PARTICLE_COUNT = 300;

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uTime;
  uniform vec3 uTintColor;
  uniform float uTintStrength;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 baseColor = mix(aColor, uTintColor, uTintStrength);
    vColor = baseColor;
    // Breathing pulse
    vAlpha = sin(uTime * 0.5) * 0.1 + 0.9;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPos;
    // Size attenuation
    gl_PointSize = aSize * (300.0 / -mvPos.z);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float dist = distance(gl_PointCoord, vec2(0.5));
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
    alpha *= vAlpha * 0.35;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

// Tint color targets
const TINT_NONE = new THREE.Color('#4a8a5a');
const TINT_RED = new THREE.Color('#cc4444');
const TINT_PURPLE = new THREE.Color('#aa44dd');
const TINT_GOLD = new THREE.Color('#d4a843');
const TINT_VICTORY_GOLD = new THREE.Color('#ffcc44');
const TINT_DEFEAT_RED = new THREE.Color('#882222');

interface Props {
  combatState: React.RefObject<CombatVisualState>;
}

export default function Particles({ combatState }: Props) {
  const meshRef = useRef<THREE.Points>(null);

  const { velocities, geometry } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    const baseColor = new THREE.Color('#4a8a5a');
    const hsl = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5;

      velocities[i * 3] = (Math.random() - 0.5) * 0.002;
      velocities[i * 3 + 1] = 0.003 + Math.random() * 0.005;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.001;

      // Per-particle size variation
      sizes[i] = 0.02 + Math.random() * 0.06;

      // Per-particle color variation (hue ± 0.05)
      const c = new THREE.Color();
      c.setHSL(hsl.h + (Math.random() - 0.5) * 0.1, hsl.s, hsl.l + (Math.random() - 0.5) * 0.1);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    return { positions, velocities, geometry: geo };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uTintColor: { value: TINT_NONE.clone() },
    uTintStrength: { value: 0 },
  }), []);

  const targetTint = useMemo(() => TINT_NONE.clone(), []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const posAttr = meshRef.current.geometry.attributes.position;
    const pos = posAttr.array as Float32Array;
    const cs = combatState.current;
    const isWon = cs.isWon;
    const speed = isWon || cs.combatResult === 'victory' ? 5 : cs.combatResult === 'defeat' ? 0.3 : 1;

    // Update positions
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] += velocities[i * 3] * delta * 60 * speed;
      pos[i * 3 + 1] += velocities[i * 3 + 1] * delta * 60 * speed;
      pos[i * 3 + 2] += velocities[i * 3 + 2] * delta * 60 * speed;

      // Sinusoidal horizontal drift
      pos[i * 3] += Math.sin(Date.now() * 0.001 + i) * 0.001 * speed;

      // On defeat, particles sink
      if (cs.combatResult === 'defeat') {
        pos[i * 3 + 1] -= 0.01 * delta * 60;
      }

      // Wrap around
      if (pos[i * 3 + 1] > 10) pos[i * 3 + 1] = -10;
      if (pos[i * 3 + 1] < -12) pos[i * 3 + 1] = -10; // sink wrap
      if (pos[i * 3] > 10) pos[i * 3] = -10;
      if (pos[i * 3] < -10) pos[i * 3] = 10;
    }
    posAttr.needsUpdate = true;

    // Update uniforms
    uniforms.uTime.value += delta;

    // Determine tint target
    let targetStrength = 0;
    if (cs.combatResult === 'victory' || isWon) {
      targetTint.copy(TINT_VICTORY_GOLD);
      targetStrength = 0.8;
    } else if (cs.combatResult === 'defeat') {
      targetTint.copy(TINT_DEFEAT_RED);
      targetStrength = 0.8;
    } else if (cs.empowered) {
      targetTint.copy(TINT_GOLD);
      targetStrength = 0.5;
    } else if (cs.poisonActive) {
      targetTint.copy(TINT_PURPLE);
      targetStrength = 0.4;
    } else if (cs.hpRatio < 0.3) {
      targetTint.copy(TINT_RED);
      targetStrength = 0.5;
    } else {
      targetStrength = 0;
    }

    const lerpRate = 1 - Math.pow(0.05, delta);
    uniforms.uTintColor.value.lerp(targetTint, lerpRate);
    uniforms.uTintStrength.value += (targetStrength - uniforms.uTintStrength.value) * lerpRate;
  });

  return (
    <points ref={meshRef} geometry={geometry}>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
