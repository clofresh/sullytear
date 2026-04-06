import { AnimatePresence, motion } from 'framer-motion';
import { useCombatStore } from '../game/combatStore';
import './RoyalAwakeningBanner.css';

function getTier(label?: string): 0 | 1 | 2 | 3 {
  if (!label) return 0;
  if (label.includes('Stirs')) return 1;
  if (label.includes('Rises')) return 2;
  if (label.includes('Awakens')) return 3;
  return 0;
}

const TIER_CONFIG = {
  1: { fontSize: '20px', color: '#9a7fcf', duration: 1.2, initScale: 0.6, glow: '10px' },
  2: { fontSize: '26px', color: '#c8a2ff', duration: 1.5, initScale: 0.6, glow: '14px' },
  3: { fontSize: '32px', color: '#ffd866', duration: 2.0, initScale: 0.3, glow: '20px' },
};

export default function RoyalAwakeningBanner() {
  const lastEvent = useCombatStore(s => s.lastEvent);
  const eventId = useCombatStore(s => s.eventId);

  const isFaceCard = lastEvent?.type === 'face-card';
  const tier = isFaceCard ? getTier(lastEvent?.label) : 0;

  return (
    <AnimatePresence mode="wait">
      {isFaceCard && tier > 0 && lastEvent && (
        <motion.div
          key={eventId}
          className={`royal-awakening-banner tier-${tier}`}
          initial={{ opacity: 0, scale: TIER_CONFIG[tier as 1 | 2 | 3].initScale, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{
            duration: TIER_CONFIG[tier as 1 | 2 | 3].duration,
            ease: 'easeOut',
          }}
          style={{
            fontSize: TIER_CONFIG[tier as 1 | 2 | 3].fontSize,
            color: TIER_CONFIG[tier as 1 | 2 | 3].color,
            textShadow: `0 0 ${TIER_CONFIG[tier as 1 | 2 | 3].glow} ${TIER_CONFIG[tier as 1 | 2 | 3].color}, 0 0 6px rgba(0,0,0,0.9)`,
            textTransform: tier === 3 ? 'uppercase' : undefined,
          }}
        >
          {lastEvent.label}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
