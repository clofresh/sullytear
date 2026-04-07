import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { EffectEvent } from './useCombatEffects';
import { portraitPositions } from '../game/portraitPositions';
import { burstVertexShader, burstFragmentShader } from './shaders/burst';
import { processEvent, lerpColor, type SpawnFn } from './burstEffects';

const POOL_SIZE = 300;

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

interface Props {
  effectQueue: React.RefObject<EffectEvent[]>;
}

export default function BurstParticles({ effectQueue }: Props) {
  const meshRef = useRef<THREE.Points>(null);
  const nextIdx = useRef(0);
  const { camera } = useThree();

  // Convert normalized screen position (0-1) to Three.js world coords at z=0
  function screenToWorld(nx: number, ny: number): [number, number] {
    const cam = camera as THREE.PerspectiveCamera;
    const halfH = Math.tan((cam.fov * Math.PI / 180) / 2) * cam.position.z;
    const halfW = halfH * cam.aspect;
    const wx = (nx - 0.5) * 2 * halfW;
    const wy = (0.5 - ny) * 2 * halfH; // flip Y (screen Y is top-down)
    return [wx, wy];
  }

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

  const spawn: SpawnFn = (
    count,
    x, y, z,
    velFn,
    color,
    size,
    life,
    gravity = 0,
    drag = 0.98,
    colorVariant,
  ) => {
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
  };

  // Delayed events waiting for attack wind-up to finish
  const delayedEvents = useRef<{ ev: EffectEvent; fireAt: number }[]>([]);

  // Anticipation durations matching HeroModel/MonsterModel
  const HERO_ANTICIPATE = 120;   // ms, matches 0.12s in HeroModel
  const MONSTER_ANTICIPATE = 150; // ms, matches 0.15s in MonsterModel

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    const now = Date.now();

    // Process queued events — delay attack particles until wind-up ends
    const queue = effectQueue.current;
    if (!queue) return;

    const ctx = {
      spawn,
      heroPos: screenToWorld(portraitPositions.hero.x, portraitPositions.hero.y),
      monsterPos: screenToWorld(portraitPositions.monster.x, portraitPositions.monster.y),
    };

    while (queue.length > 0) {
      const ev = queue.shift()!;
      const isVictory = ev.label === 'victory';
      const isDefeat = ev.label === 'defeat';
      if (!isVictory && !isDefeat && ev.type === 'hero-attack') {
        delayedEvents.current.push({ ev, fireAt: now + HERO_ANTICIPATE });
      } else if (!isVictory && !isDefeat && ev.type === 'monster-attack') {
        delayedEvents.current.push({ ev, fireAt: now + MONSTER_ANTICIPATE });
      } else {
        processEvent(ev, ctx);
      }
    }

    // Fire delayed events whose time has come
    const pending = delayedEvents.current;
    for (let i = pending.length - 1; i >= 0; i--) {
      if (now >= pending[i].fireAt) {
        processEvent(pending[i].ev, ctx);
        pending.splice(i, 1);
      }
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
        vertexShader={burstVertexShader}
        fragmentShader={burstFragmentShader}
        uniforms={{}}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
