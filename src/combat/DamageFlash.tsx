import { AnimatePresence, motion } from 'framer-motion';

interface DamageFlashProps {
  damage: number;
  type: 'hero-attack' | 'monster-attack';
  eventId: number;
}

export default function DamageFlash({ damage, type, eventId }: DamageFlashProps) {
  const color = type === 'hero-attack' ? '#ff4444' : '#ff8844';
  const xDir = type === 'hero-attack' ? 10 : -10;

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
          fontSize: '20px',
          textShadow: `0 0 8px ${color}, 0 0 4px rgba(0,0,0,0.8)`,
          position: 'absolute',
          top: '4px',
          pointerEvents: 'none',
          left: type === 'hero-attack' ? undefined : '4px',
          right: type === 'hero-attack' ? '4px' : undefined,
          zIndex: 10,
        }}
      >
        -{damage}
      </motion.div>
    </AnimatePresence>
  );
}
