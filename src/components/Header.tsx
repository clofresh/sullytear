import { useGameStore } from '../game/store';
import { useRunStore } from '../game/runStore';
import { useMetaStore } from '../game/metaStore';
import { useTimer } from '../hooks/useTimer';
import { canAutoComplete } from '../game/rules';
import { COMMIT_HASH } from '../generated/buildInfo';
import './Header.css';

export default function Header() {
  const undo = useGameStore(s => s.undo);
  const autoCompleteAction = useGameStore(s => s.autoComplete);
  const moves = useGameStore(s => s.moves);
  const undoStack = useGameStore(s => s.undoStack);
  const stock = useGameStore(s => s.stock);
  const waste = useGameStore(s => s.waste);
  const tableau = useGameStore(s => s.tableau);
  const isWon = useGameStore(s => s.isWon);
  const time = useTimer();

  const isRunActive = useRunStore(s => s.isRunActive);
  const endRun = useRunStore(s => s.endRun);
  const goldEarned = useRunStore(s => s.goldEarned);
  const gold = useMetaStore(s => s.gold);

  const showAutoComplete = !isWon && canAutoComplete(stock, waste, tableau);

  const handleAbandon = () => {
    endRun('defeat');
  };

  return (
    <header className="header">
      <div className="header-left">
        <span className="header-title">Sullytear</span>
        {isRunActive && (
          <button className="header-btn" onClick={handleAbandon}>Abandon</button>
        )}
        <button className="header-btn" onClick={undo} disabled={undoStack.length === 0}>Undo</button>
        {showAutoComplete && (
          <button className="header-btn" onClick={autoCompleteAction} style={{ color: 'var(--gold)' }}>
            Auto
          </button>
        )}
      </div>
      <div className="header-right">
        <div className="header-stat header-gold">&#9733; {gold + goldEarned}</div>
        <div className="header-stat">Moves: <span>{moves}</span></div>
        <div className="header-stat">Time: <span>{time}</span></div>
        <div className="header-stat header-hash">{COMMIT_HASH}</div>
      </div>
    </header>
  );
}
