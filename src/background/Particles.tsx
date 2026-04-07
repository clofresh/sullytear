import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CombatVisualState } from './useCombatEffects';
import { cardsVertexShader, cardsFragmentShader } from './shaders/cards';

const CARD_COUNT = 400;

// Card aspect ratio (~poker card proportions)
const CARD_W = 0.12;
const CARD_H = 0.17;

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
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const { velocities, offsets, rotations } = useMemo(() => {
    const offsets = new Float32Array(CARD_COUNT * 3);
    const velocities = new Float32Array(CARD_COUNT * 3);
    const rotations = new Float32Array(CARD_COUNT * 4);
    const sizes = new Float32Array(CARD_COUNT);
    const suits = new Float32Array(CARD_COUNT);
    const colors = new Float32Array(CARD_COUNT * 3);

    const baseColor = new THREE.Color('#4a8a5a');
    const hsl = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);

    for (let i = 0; i < CARD_COUNT; i++) {
      // Spread across the scene
      offsets[i * 3] = (Math.random() - 0.5) * 20;
      offsets[i * 3 + 1] = (Math.random() - 0.5) * 20;
      offsets[i * 3 + 2] = (Math.random() - 0.5) * 5;

      // Gentle drift velocities
      velocities[i * 3] = (Math.random() - 0.5) * 0.003;
      velocities[i * 3 + 1] = 0.002 + Math.random() * 0.004;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.001;

      // Random initial rotation + spin speed
      rotations[i * 4] = Math.random() * Math.PI * 2;
      rotations[i * 4 + 1] = Math.random() * Math.PI * 2;
      rotations[i * 4 + 2] = Math.random() * Math.PI * 2;
      rotations[i * 4 + 3] = 0.3 + Math.random() * 0.8; // spin speed

      // Size variation
      sizes[i] = 0.5 + Math.random() * 0.8;

      // Random suit (0-3)
      suits[i] = Math.floor(Math.random() * 4);

      // Per-card color variation
      const c = new THREE.Color();
      c.setHSL(hsl.h + (Math.random() - 0.5) * 0.1, hsl.s, hsl.l + (Math.random() - 0.5) * 0.1);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    return { offsets, velocities, rotations, sizes, suits, colors };
  }, []);

  // Build instanced geometry with custom attributes
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(CARD_W, CARD_H);

    // Add instanced attributes
    geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
    geo.setAttribute('aRotation', new THREE.InstancedBufferAttribute(rotations, 4));

    const sizesArr = new Float32Array(CARD_COUNT);
    const suitsArr = new Float32Array(CARD_COUNT);
    const colorsArr = new Float32Array(CARD_COUNT * 3);
    const baseColor = new THREE.Color('#4a8a5a');
    const hsl = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);

    for (let i = 0; i < CARD_COUNT; i++) {
      sizesArr[i] = 0.5 + Math.random() * 0.8;
      suitsArr[i] = Math.floor(Math.random() * 4);
      const c = new THREE.Color();
      c.setHSL(hsl.h + (Math.random() - 0.5) * 0.1, hsl.s, hsl.l + (Math.random() - 0.5) * 0.1);
      colorsArr[i * 3] = c.r;
      colorsArr[i * 3 + 1] = c.g;
      colorsArr[i * 3 + 2] = c.b;
    }

    geo.setAttribute('aSize', new THREE.InstancedBufferAttribute(sizesArr, 1));
    geo.setAttribute('aSuit', new THREE.InstancedBufferAttribute(suitsArr, 1));
    geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(colorsArr, 3));

    const mat = new THREE.ShaderMaterial({
      vertexShader: cardsVertexShader,
      fragmentShader: cardsFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uTintColor: { value: TINT_NONE.clone() },
        uTintStrength: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    return { geometry: geo, material: mat };
  }, [offsets, rotations]);

  const targetTint = useMemo(() => TINT_NONE.clone(), []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    const cs = combatState.current;
    if (!cs) return;
    const isWon = cs.isWon;
    const speed = isWon || cs.combatResult === 'victory' ? 5 : cs.combatResult === 'defeat' ? 0.3 : 1;

    const offsetAttr = meshRef.current.geometry.attributes.aOffset;
    const off = offsetAttr.array as Float32Array;

    for (let i = 0; i < CARD_COUNT; i++) {
      off[i * 3] += velocities[i * 3] * delta * 60 * speed;
      off[i * 3 + 1] += velocities[i * 3 + 1] * delta * 60 * speed;
      off[i * 3 + 2] += velocities[i * 3 + 2] * delta * 60 * speed;

      // Sinusoidal drift
      off[i * 3] += Math.sin(Date.now() * 0.001 + i) * 0.001 * speed;

      // Defeat: cards sink
      if (cs.combatResult === 'defeat') {
        off[i * 3 + 1] -= 0.01 * delta * 60;
      }

      // Wrap around
      if (off[i * 3 + 1] > 10) off[i * 3 + 1] = -10;
      if (off[i * 3 + 1] < -12) off[i * 3 + 1] = -10;
      if (off[i * 3] > 10) off[i * 3] = -10;
      if (off[i * 3] < -10) off[i * 3] = 10;
    }
    offsetAttr.needsUpdate = true;

    // Update uniforms
    material.uniforms.uTime.value += delta;

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
    material.uniforms.uTintColor.value.lerp(targetTint, lerpRate);
    material.uniforms.uTintStrength.value += (targetStrength - material.uniforms.uTintStrength.value) * lerpRate;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, CARD_COUNT]}
    />
  );
}
