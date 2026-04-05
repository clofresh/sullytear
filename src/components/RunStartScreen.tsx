import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRunStore } from '../game/runStore';
import { useMetaStore } from '../game/metaStore';
import { type Difficulty, DIFFICULTY_CONFIG } from '../game/difficulty';
import './RunStartScreen.css';

export default function RunStartScreen() {
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const startRun = useRunStore(s => s.startRun);
  const gold = useMetaStore(s => s.gold);
  const totalMonstersSlain = useMetaStore(s => s.totalMonstersSlain);
  const totalRunsCompleted = useMetaStore(s => s.totalRunsCompleted);

  return (
    <motion.div
      className="run-start-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="run-start-content"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
      >
        <h1 className="run-start-title">Sullytear</h1>
        <p className="run-start-subtitle">Solitaire Combat RPG</p>

        <div className="run-start-gold">
          <span className="run-start-gold-icon">&#9733;</span>
          {gold} Gold
        </div>

        <div className="difficulty-section">
          <div className="difficulty-label">Difficulty</div>
          <div className="difficulty-buttons">
            {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((d) => (
              <button
                key={d}
                className={`difficulty-btn ${difficulty === d ? `selected ${d}` : ''}`}
                onClick={() => setDifficulty(d)}
              >
                {DIFFICULTY_CONFIG[d].label}
              </button>
            ))}
          </div>
        </div>

        <button className="start-run-btn" onClick={() => startRun(difficulty)}>
          Start Gauntlet
        </button>

        <div className="run-start-stats">
          <div>
            Slain: <span className="run-start-stat-value">{totalMonstersSlain}</span>
          </div>
          <div>
            Runs: <span className="run-start-stat-value">{totalRunsCompleted}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
