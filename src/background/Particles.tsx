import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CombatVisualState } from './useCombatEffects';

const CARD_COUNT = 400;

// Card aspect ratio (~poker card proportions)
const CARD_W = 0.12;
const CARD_H = 0.17;

const vertexShader = /* glsl */ `
  precision highp float;

  attribute vec3 aOffset;      // world position of this card
  attribute vec4 aRotation;    // xyz = euler seed, w = spin speed
  attribute float aSize;       // scale multiplier
  attribute float aSuit;       // 0-3 → suit type
  attribute vec3 aColor;       // base tint per card

  uniform float uTime;
  uniform vec3 uTintColor;
  uniform float uTintStrength;

  varying vec2 vUv;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSuit;
  varying float vFaceDir;

  mat3 rotateXYZ(vec3 angles) {
    float cx = cos(angles.x); float sx = sin(angles.x);
    float cy = cos(angles.y); float sy = sin(angles.y);
    float cz = cos(angles.z); float sz = sin(angles.z);
    return mat3(
      cy*cz,              cy*sz,              -sy,
      sx*sy*cz - cx*sz,   sx*sy*sz + cx*cz,   sx*cy,
      cx*sy*cz + sx*sz,   cx*sy*sz - sx*cz,   cx*cy
    );
  }

  void main() {
    vUv = uv;
    vSuit = aSuit;

    // Per-card rotation: seed + time-based spin
    vec3 angles = aRotation.xyz + uTime * aRotation.w;
    mat3 rot = rotateXYZ(angles);

    // Use the card's facing direction for front/back detection
    vec3 faceNormal = rot * vec3(0.0, 0.0, 1.0);
    vec3 viewDir = normalize(cameraPosition - aOffset);
    vFaceDir = dot(faceNormal, viewDir);

    vec3 pos = rot * (position * aSize) + aOffset;

    vec3 baseColor = mix(aColor, uTintColor, uTintStrength);
    vColor = baseColor;

    // Distance fade
    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    float distFade = smoothstep(12.0, 6.0, -mvPos.z);
    vAlpha = distFade * 0.7;

    gl_Position = projectionMatrix * mvPos;
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSuit;
  varying float vFaceDir;

  // SDF for a rounded rectangle
  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  // Heart shape SDF
  float sdHeart(vec2 p) {
    p.y -= 0.3;
    p.x = abs(p.x);
    float a = atan(p.x, p.y) / 3.14159;
    float r = length(p);
    float h = clamp(a, 0.0, 1.0);
    float d = r - 0.5 * (1.0 + h * 0.3);
    return d;
  }

  // Diamond shape
  float sdDiamond(vec2 p) {
    p = abs(p);
    return (p.x + p.y - 0.55) * 0.707;
  }

  // Club shape (3 circles + stem)
  float sdClub(vec2 p) {
    float d1 = length(p - vec2(-0.15, 0.1)) - 0.18;
    float d2 = length(p - vec2(0.15, 0.1)) - 0.18;
    float d3 = length(p - vec2(0.0, 0.3)) - 0.18;
    float stem = sdRoundedBox(p - vec2(0.0, -0.1), vec2(0.05, 0.18), 0.02);
    return min(min(d1, d2), min(d3, stem));
  }

  // Spade shape (inverted heart + stem)
  float sdSpade(vec2 p) {
    vec2 hp = vec2(p.x, -p.y + 0.55);
    hp.x = abs(hp.x);
    float a = atan(hp.x, hp.y) / 3.14159;
    float r = length(hp);
    float h = clamp(a, 0.0, 1.0);
    float heart = r - 0.45 * (1.0 + h * 0.3);
    float stem = sdRoundedBox(p - vec2(0.0, -0.1), vec2(0.04, 0.2), 0.02);
    return min(heart, stem);
  }

  float getSuitSDF(vec2 p, float suit) {
    if (suit < 0.5) return sdHeart(p);
    if (suit < 1.5) return sdDiamond(p);
    if (suit < 2.5) return sdClub(p);
    return sdSpade(p);
  }

  void main() {
    if (vAlpha < 0.01) discard;

    // Map UV to centered coords
    vec2 p = vUv * 2.0 - 1.0;

    // Card body — rounded rectangle
    float cardDist = sdRoundedBox(p, vec2(0.85, 0.85), 0.15);
    float cardMask = 1.0 - smoothstep(-0.02, 0.02, cardDist);
    if (cardMask < 0.01) discard;

    // Determine if showing front or back
    bool isFront = vFaceDir > 0.0;

    vec3 col;
    if (isFront) {
      // White card face
      col = vec3(0.95, 0.93, 0.90);

      // Card border
      float borderDist = sdRoundedBox(p, vec2(0.78, 0.78), 0.12);
      float border = smoothstep(-0.02, 0.0, borderDist) * (1.0 - smoothstep(0.0, 0.02, borderDist));
      col = mix(col, vec3(0.7, 0.65, 0.6), border * 0.5);

      // Suit symbol in center
      vec2 suitP = p * 1.5;
      float suitDist = getSuitSDF(suitP, vSuit);
      float suitMask = 1.0 - smoothstep(-0.02, 0.02, suitDist);

      // Red for hearts/diamonds, dark for clubs/spades
      vec3 suitColor = vSuit < 1.5 ? vec3(0.85, 0.1, 0.1) : vec3(0.12, 0.12, 0.12);
      col = mix(col, suitColor, suitMask);

      // Subtle tint from combat state
      col = mix(col, vColor, 0.15);
    } else {
      // Card back — dark pattern with tint
      col = mix(vec3(0.1, 0.22, 0.36), vColor, 0.3);

      // Crosshatch pattern
      float pattern = sin(p.x * 20.0) * sin(p.y * 20.0);
      col += pattern * 0.06;

      // Inner border
      float innerDist = sdRoundedBox(p, vec2(0.72, 0.72), 0.1);
      float innerBorder = smoothstep(-0.02, 0.0, innerDist) * (1.0 - smoothstep(0.0, 0.02, innerDist));
      col += innerBorder * 0.15;
    }

    // Boost for bloom pickup
    gl_FragColor = vec4(col * 1.5, cardMask * vAlpha);
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
      vertexShader,
      fragmentShader,
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
