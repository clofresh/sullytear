import { useRef, useEffect, useCallback } from 'react';
import './DragTrail.css';

interface TrailParticle {
  el: HTMLDivElement;
  born: number;
  dist: number; // distance from card center when spawned
}

const PARTICLE_LIFETIME = 500; // ms
const SPAWN_INTERVAL = 25; // ms between spawns
const POOL_SIZE = 25;
const MAX_SIZE = 24; // px, at card center
const MIN_SIZE = 6;  // px, far from card

export default function DragTrail() {
  const containerRef = useRef<HTMLDivElement>(null);
  const poolRef = useRef<TrailParticle[]>([]);
  const nextIdx = useRef(0);
  const isDragging = useRef(false);
  const lastSpawn = useRef(0);
  const rafRef = useRef<number>(0);
  const cardCenter = useRef({ x: 0, y: 0 });

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
      pool.push({ el, born: 0, dist: 0 });
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
          // Proximity factor: 1.0 at card center, 0.0 at 150px+ away
          const proxFactor = Math.max(0, 1 - p.dist / 150);
          const size = MIN_SIZE + (MAX_SIZE - MIN_SIZE) * proxFactor;
          const startOpacity = 0.4 + proxFactor * 0.5; // brighter near card
          p.el.style.opacity = String((1 - t) * startOpacity);
          p.el.style.width = `${size}px`;
          p.el.style.height = `${size}px`;
          p.el.style.transform = `translate(-50%, -50%) scale(${1 + t * 0.8})`;
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

    // Distance from card center
    const dx = x - cardCenter.current.x;
    const dy = y - cardCenter.current.y;
    p.dist = Math.sqrt(dx * dx + dy * dy);

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
      const card = target.closest('.card');
      if (card) {
        isDragging.current = true;
        const rect = card.getBoundingClientRect();
        cardCenter.current.x = rect.left + rect.width / 2;
        cardCenter.current.y = rect.top + rect.height / 2;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;

      // Update card center tracking (card moves with pointer)
      const card = document.querySelector('.card.dragging');
      if (card) {
        const rect = card.getBoundingClientRect();
        cardCenter.current.x = rect.left + rect.width / 2;
        cardCenter.current.y = rect.top + rect.height / 2;
      }

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
