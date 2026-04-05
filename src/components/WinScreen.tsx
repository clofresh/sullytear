import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../game/store';
import { useRunStore } from '../game/runStore';
import './WinScreen.css';

export default function WinScreen() {
  const isWon = useGameStore(s => s.isWon);
  const moves = useGameStore(s => s.moves);
  const newGame = useGameStore(s => s.newGame);
  const isRunActive = useRunStore(s => s.isRunActive);

  // During gauntlet runs, combat overlay handles end-of-encounter
  if (isRunActive) return null;

  return (
    <AnimatePresence>
      {isWon && (
        <motion.div
          className="win-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="win-content"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <h1 className="win-title">You Win!</h1>
            <p className="win-stats">Completed in {moves} moves</p>
            <motion.button
              className="win-btn"
              onClick={() => newGame()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              New Game
            </motion.button>
          </motion.div>

          {/* Confetti particles */}
          {Array.from({ length: 40 }).map((_, i) => (
            <motion.div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#d4a843', '#cc0000', '#1a472a', '#2a5a8c', '#fff'][i % 5],
              }}
              initial={{ y: '-10vh', x: 0, rotate: 0, opacity: 1 }}
              animate={{
                y: '110vh',
                x: (Math.random() - 0.5) * 200,
                rotate: Math.random() * 720 - 360,
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                delay: Math.random() * 1,
                ease: 'easeIn',
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
