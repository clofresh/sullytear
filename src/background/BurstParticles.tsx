import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { EffectEvent } from './useCombatEffects';

const POOL_SIZE = 300;

const vertexShader = /* glsl */ `
  precision highp float;
  attribute float aAlpha;
  attribute float aSize;
  attribute vec3 aColor;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPos;
    gl_PointSize = min(aSize * (800.0 / -mvPos.z), 64.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float dist = distance(gl_PointCoord, vec2(0.5));
    float alpha = 1.0 - smoothstep(0.2, 0.5, dist);
    alpha *= vAlpha;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

interface ParticleData {
  active: boolean;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  gravity: number;
  drag: number;
}

// Color constants
const C_GREEN = new THREE.Color('#66cc77');
const C_WHITE = new THREE.Color('#ffffff');
const C_RED = new THREE.Color('#ff4444');
const C_HEAL_GREEN = new THREE.Color('#44dd44');
const C_PURPLE = new THREE.Color('#aa44dd');
const C_GOLD = new THREE.Color('#d4a843');
const C_DARK_RED = new THREE.Color('#661111');

function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return new THREE.Color(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t,
  );
}

interface Props {
  effectQueue: React.RefObject<EffectEvent[]>;
}

export default function BurstParticles({ effectQueue }: Props) {
  const meshRef = useRef<THREE.Points>(null);
  const nextIdx = useRef(0);

  const { pool, positions, alphas, sizes, colors, geometry } = useMemo(() => {
    const positions = new Float32Array(POOL_SIZE * 3);
    const alphas = new Float32Array(POOL_SIZE);
    const sizes = new Float32Array(POOL_SIZE);
    const colors = new Float32Array(POOL_SIZE * 3);
    const pool: ParticleData[] = [];

    for (let i = 0; i < POOL_SIZE; i++) {
      positions[i * 3 + 2] = -100; // off-screen
      alphas[i] = 0;
      sizes[i] = 0;
      pool.push({ active: false, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1, gravity: 0, drag: 0.98 });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    return { pool, positions, alphas, sizes, colors, geometry: geo };
  }, []);

  function spawn(
    count: number,
    x: number, y: number, z: number,
    velFn: (i: number) => [number, number, number],
    color: THREE.Color,
    size: [number, number],
    life: [number, number],
    gravity: number = 0,
    drag: number = 0.98,
    colorVariant?: THREE.Color,
  ) {
    for (let n = 0; n < count; n++) {
      const idx = nextIdx.current % POOL_SIZE;
      nextIdx.current++;

      const [vx, vy, vz] = velFn(n);
      positions[idx * 3] = x + (Math.random() - 0.5) * 0.5;
      positions[idx * 3 + 1] = y + (Math.random() - 0.5) * 0.5;
      positions[idx * 3 + 2] = z + (Math.random() - 0.5) * 0.5;

      const c = colorVariant ? lerpColor(color, colorVariant, Math.random()) : color;
      colors[idx * 3] = c.r;
      colors[idx * 3 + 1] = c.g;
      colors[idx * 3 + 2] = c.b;

      sizes[idx] = size[0] + Math.random() * (size[1] - size[0]);
      alphas[idx] = 1;

      const p = pool[idx];
      p.active = true;
      p.vx = vx;
      p.vy = vy;
      p.vz = vz;
      p.maxLife = life[0] + Math.random() * (life[1] - life[0]);
      p.life = p.maxLife;
      p.gravity = gravity;
      p.drag = drag;
    }
  }

  function processEvent(ev: EffectEvent) {
    const isVictory = ev.label === 'victory';
    const isDefeat = ev.label === 'defeat';
    const isCombo = ev.label?.startsWith('Combo');

    if (isVictory) {
      // Gold explosion from center
      spawn(100, 0, 0, 0,
        () => [(Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.2],
        C_GOLD, [0.15, 0.35], [1.5, 3], -0.002, 0.97, C_WHITE);
      return;
    }
    if (isDefeat) {
      // Dark red particles sinking
      spawn(50, 0, 4, 0,
        () => [(Math.random() - 0.5) * 0.3, -Math.random() * 0.15 - 0.05, (Math.random() - 0.5) * 0.1],
        C_DARK_RED, [0.12, 0.25], [2, 4], 0.005, 0.99, C_RED);
      return;
    }

    switch (ev.type) {
      case 'hero-attack': {
        const count = isCombo ? Math.min(60, 20 + ev.damage) : 30;
        const intensity = isCombo ? 0.4 : 0.3;
        // Burst upward from bottom
        spawn(count, 0, -6, 0,
          () => [(Math.random() - 0.5) * intensity, Math.random() * 0.25 + 0.1, (Math.random() - 0.5) * 0.05],
          C_GREEN, [0.1, 0.25], [0.8, 1.8], -0.003, 0.97, C_WHITE);
        break;
      }
      case 'monster-attack': {
        // Rain down from top, red
        spawn(25, 0, 6, 0,
          () => [(Math.random() - 0.5) * 0.2, -Math.random() * 0.2 - 0.08, (Math.random() - 0.5) * 0.05],
          C_RED, [0.08, 0.18], [0.8, 1.5], 0.004, 0.98);
        break;
      }
      case 'hero-heal': {
        // Gentle float up, bright green
        spawn(20, 0, -2, 0,
          () => [(Math.random() - 0.5) * 0.1, Math.random() * 0.1 + 0.03, (Math.random() - 0.5) * 0.03],
          C_HEAL_GREEN, [0.08, 0.15], [1, 2], -0.001, 0.99, C_WHITE);
        break;
      }
      case 'poison': {
        // Spiral outward, purple
        spawn(20, 0, 0, 0,
          (i) => {
            const angle = (i / 20) * Math.PI * 2;
            return [Math.cos(angle) * 0.15, Math.sin(angle) * 0.15, (Math.random() - 0.5) * 0.03];
          },
          C_PURPLE, [0.1, 0.18], [0.8, 1.5], 0, 0.96);
        break;
      }
      case 'empower': {
        // Ring expansion, gold
        spawn(25, 0, 0, 0,
          (i) => {
            const angle = (i / 25) * Math.PI * 2;
            return [Math.cos(angle) * 0.18, Math.sin(angle) * 0.18, 0];
          },
          C_GOLD, [0.1, 0.2], [0.8, 1.5], 0, 0.97, C_WHITE);
        break;
      }
    }
  }

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    // Process queued events
    const queue = effectQueue.current;
    while (queue.length > 0) {
      const ev = queue.shift()!;
      processEvent(ev);
    }

    // Update active particles
    const dt60 = delta * 60;
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = pool[i];
      if (!p.active) continue;

      p.life -= delta;
      if (p.life <= 0) {
        p.active = false;
        alphas[i] = 0;
        positions[i * 3 + 2] = -100;
        continue;
      }

      // Physics
      p.vy -= p.gravity * dt60;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vz *= p.drag;

      positions[i * 3] += p.vx * dt60;
      positions[i * 3 + 1] += p.vy * dt60;
      positions[i * 3 + 2] += p.vz * dt60;

      // Fade based on remaining life
      const lifeRatio = p.life / p.maxLife;
      alphas[i] = lifeRatio * lifeRatio; // quadratic fade
    }

    // Mark attributes as needing update
    geometry.attributes.position.needsUpdate = true;
    (geometry.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
    (geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (geometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <points ref={meshRef} geometry={geometry}>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{}}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
