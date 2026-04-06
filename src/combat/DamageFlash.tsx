import { AnimatePresence, motion } from 'framer-motion';
import type { CombatEvent } from '../game/combatStore';

interface DamageFlashProps {
  event: CombatEvent;
  eventId: number;
}

function getStyle(event: CombatEvent) {
  switch (event.type) {
    case 'hero-attack':
      return { color: '#ff4444', prefix: '-', xDir: 10 };
    case 'monster-attack':
      return { color: '#ff8844', prefix: '-', xDir: -10 };
    case 'hero-heal':
      return { color: '#44dd44', prefix: '+', xDir: 0 };
    case 'poison':
      return { color: '#aa44dd', prefix: '-', xDir: 10 };
    case 'empower':
      return { color: '#d4a843', prefix: '', xDir: 0 };
    case 'face-card':
      return { color: '#c8a2ff', prefix: '', xDir: 0 };
  }
}

function getFaceCardTier(label?: string): 0 | 1 | 2 | 3 {
  if (!label) return 0;
  if (label.includes('Stirs')) return 1;
  if (label.includes('Rises')) return 2;
  if (label.includes('Awakens')) return 3;
  return 0;
}

const TIER_COLORS = {
  1: '#9a7fcf',   // muted purple — subtle
  2: '#c8a2ff',   // bright purple — striking
  3: '#ffd866',   // gold — regal
};

export default function DamageFlash({ event, eventId }: DamageFlashProps) {
  const { color: baseColor, prefix, xDir } = getStyle(event);
  const tier = event.type === 'face-card' ? getFaceCardTier(event.label) : 0;
  const color = tier > 0 ? TIER_COLORS[tier as 1 | 2 | 3] : baseColor;

  const text = event.type === 'face-card'
    ? event.label ?? ''
    : event.label
      ? `${prefix}${event.damage} ${event.label}`
      : `${prefix}${event.damage}`;

  // Tier-scaled animation
  const fontSize = tier === 3 ? '22px' : tier === 2 ? '20px' : '18px';
  const endScale = tier === 3 ? 1.6 : tier === 2 ? 1.4 : 1.3;
  const duration = tier === 3 ? 1.2 : tier === 2 ? 1.0 : 0.8;
  const yTravel = tier === 3 ? -45 : tier === 2 ? -35 : -30;
  const glowRadius = tier === 3 ? '16px' : tier === 2 ? '12px' : '8px';
  const glowRadius2 = tier === 3 ? '8px' : tier === 2 ? '6px' : '4px';

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={eventId}
        className="damage-flash"
        initial={{ opacity: 1, y: 0, x: 0, scale: tier === 3 ? 0.3 : 0.5 }}
        animate={{ opacity: 0, y: yTravel, x: xDir, scale: endScale }}
        exit={{ opacity: 0 }}
        transition={{ duration, ease: 'easeOut' }}
        style={{
          color,
          fontWeight: 'bold',
          fontSize,
          textShadow: `0 0 ${glowRadius} ${color}, 0 0 ${glowRadius2} rgba(0,0,0,0.8)`,
          position: 'absolute',
          top: '4px',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          left: event.type === 'hero-attack' || event.type === 'poison' ? undefined : '4px',
          right: event.type === 'hero-attack' || event.type === 'poison' ? '4px' : undefined,
          zIndex: 10,
        }}
      >
        {text}
      </motion.div>
    </AnimatePresence>
  );
}
