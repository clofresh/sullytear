import { motion, AnimatePresence } from 'framer-motion';
import { useCombatStore } from '../game/combatStore';
import { useGameStore } from '../game/store';
import './CombatOverlay.css';

export default function CombatOverlay() {
  const combatResult = useCombatStore(s => s.combatResult);
  const resetCombat = useCombatStore(s => s.resetCombat);
  const monsterName = useCombatStore(s => s.monsterName);
  const newGame = useGameStore(s => s.newGame);

  const handleNewGame = () => {
    newGame();
    resetCombat();
  };

  return (
    <AnimatePresence>
      {combatResult === 'victory' && (
        <motion.div
          className="combat-overlay combat-victory"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="combat-overlay-content"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
          >
            <div className="combat-overlay-icon">&#9876;</div>
            <h2 className="combat-overlay-title victory-title">{monsterName} Defeated!</h2>
            <p className="combat-overlay-subtitle">Your solitaire prowess has vanquished the beast.</p>
            <button className="combat-overlay-btn victory-btn" onClick={handleNewGame}>
              New Battle
            </button>
          </motion.div>
        </motion.div>
      )}

      {combatResult === 'defeat' && (
        <motion.div
          className="combat-overlay combat-defeat"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="combat-overlay-content"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
          >
            <div className="combat-overlay-icon">&#9760;</div>
            <h2 className="combat-overlay-title defeat-title">Game Over</h2>
            <p className="combat-overlay-subtitle">The {monsterName.toLowerCase()} has overwhelmed you.</p>
            <button className="combat-overlay-btn defeat-btn" onClick={handleNewGame}>
              Try Again
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
