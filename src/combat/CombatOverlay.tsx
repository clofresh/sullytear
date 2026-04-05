import { motion, AnimatePresence } from 'framer-motion';
import { useCombatStore } from '../game/combatStore';
import { useRunStore } from '../game/runStore';
import './CombatOverlay.css';

export default function CombatOverlay() {
  const combatResult = useCombatStore(s => s.combatResult);
  const monsterName = useCombatStore(s => s.monsterName);
  const isRunActive = useRunStore(s => s.isRunActive);
  const currentIndex = useRunStore(s => s.currentEncounterIndex);
  const encounters = useRunStore(s => s.encounters);
  const goldEarned = useRunStore(s => s.goldEarned);
  const advanceEncounter = useRunStore(s => s.advanceEncounter);
  const endRun = useRunStore(s => s.endRun);

  const isFinalEncounter = currentIndex >= encounters.length - 1;
  const encounterProgress = `${currentIndex + 1} / ${encounters.length}`;

  return (
    <AnimatePresence>
      {combatResult === 'victory' && isRunActive && !isFinalEncounter && (
        <motion.div
          className="combat-overlay combat-victory"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          key="victory-mid"
        >
          <motion.div
            className="combat-overlay-content"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
          >
            <div className="combat-overlay-icon">&#9876;</div>
            <h2 className="combat-overlay-title victory-title">{monsterName} Defeated!</h2>
            <div className="combat-overlay-progress">Fight {encounterProgress}</div>
            <p className="combat-overlay-subtitle">Prepare for the next challenger.</p>
            <button className="combat-overlay-btn victory-btn" onClick={advanceEncounter}>
              Next Encounter
            </button>
          </motion.div>
        </motion.div>
      )}

      {combatResult === 'victory' && isRunActive && isFinalEncounter && (
        <motion.div
          className="combat-overlay combat-victory"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          key="victory-final"
        >
          <motion.div
            className="combat-overlay-content"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
          >
            <div className="combat-overlay-icon">&#127942;</div>
            <h2 className="combat-overlay-title victory-title">Gauntlet Complete!</h2>
            <div className="combat-overlay-gold">&#9733; {goldEarned} Gold Earned</div>
            <p className="combat-overlay-subtitle">All challengers have fallen before you.</p>
            <button className="combat-overlay-btn victory-btn" onClick={() => advanceEncounter()}>
              Claim Rewards
            </button>
          </motion.div>
        </motion.div>
      )}

      {combatResult === 'defeat' && isRunActive && (
        <motion.div
          className="combat-overlay combat-defeat"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          key="defeat"
        >
          <motion.div
            className="combat-overlay-content"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
          >
            <div className="combat-overlay-icon">&#9760;</div>
            <h2 className="combat-overlay-title defeat-title">Run Over</h2>
            <div className="combat-overlay-progress">Fell at fight {encounterProgress}</div>
            {goldEarned > 0 && (
              <div className="combat-overlay-gold">&#9733; {goldEarned} Gold Earned</div>
            )}
            <p className="combat-overlay-subtitle">The {monsterName.toLowerCase()} has overwhelmed you.</p>
            <button className="combat-overlay-btn defeat-btn" onClick={() => endRun('defeat')}>
              Return to Menu
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
