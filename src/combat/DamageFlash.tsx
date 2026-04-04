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
  }
}

export default function DamageFlash({ event, eventId }: DamageFlashProps) {
  const { color, prefix, xDir } = getStyle(event);
  const text = event.label
    ? `${prefix}${event.damage} ${event.label}`
    : `${prefix}${event.damage}`;

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={eventId}
        className="damage-flash"
        initial={{ opacity: 1, y: 0, x: 0, scale: 0.5 }}
        animate={{ opacity: 0, y: -30, x: xDir, scale: 1.3 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{
          color,
          fontWeight: 'bold',
          fontSize: '18px',
          textShadow: `0 0 8px ${color}, 0 0 4px rgba(0,0,0,0.8)`,
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
