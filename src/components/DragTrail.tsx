import { useRef, useEffect, useCallback } from 'react';
import './DragTrail.css';

interface TrailParticle {
  el: HTMLDivElement;
  born: number;
}

const PARTICLE_LIFETIME = 400; // ms
const SPAWN_INTERVAL = 30; // ms between spawns
const POOL_SIZE = 20;

export default function DragTrail() {
  const containerRef = useRef<HTMLDivElement>(null);
  const poolRef = useRef<TrailParticle[]>([]);
  const nextIdx = useRef(0);
  const isDragging = useRef(false);
  const lastSpawn = useRef(0);
  const rafRef = useRef<number>(0);

  // Initialize particle pool
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const pool: TrailParticle[] = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const el = document.createElement('div');
      el.className = 'trail-particle';
      el.style.opacity = '0';
      container.appendChild(el);
      pool.push({ el, born: 0 });
    }
    poolRef.current = pool;

    return () => {
      pool.forEach(p => p.el.remove());
    };
  }, []);

  // Animate particles
  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      for (const p of poolRef.current) {
        if (p.born === 0) continue;
        const age = now - p.born;
        if (age > PARTICLE_LIFETIME) {
          p.el.style.opacity = '0';
          p.born = 0;
        } else {
          const t = age / PARTICLE_LIFETIME;
          p.el.style.opacity = String((1 - t) * 0.7);
          p.el.style.transform = `translate(-50%, -50%) scale(${1 + t * 0.5})`;
        }
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const spawnParticle = useCallback((x: number, y: number) => {
    const pool = poolRef.current;
    if (pool.length === 0) return;
    const idx = nextIdx.current % POOL_SIZE;
    nextIdx.current++;
    const p = pool[idx];
    p.el.style.left = `${x}px`;
    p.el.style.top = `${y}px`;
    p.el.style.opacity = '0.7';
    p.el.style.transform = 'translate(-50%, -50%) scale(1)';
    p.born = Date.now();
  }, []);

  // Listen for drag events on the document
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.card')) {
        isDragging.current = true;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const now = Date.now();
      if (now - lastSpawn.current < SPAWN_INTERVAL) return;
      lastSpawn.current = now;
      spawnParticle(e.clientX, e.clientY);
    };

    const handlePointerUp = () => {
      isDragging.current = false;
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [spawnParticle]);

  return <div ref={containerRef} className="drag-trail-container" />;
}
