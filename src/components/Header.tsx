import { useGameStore } from '../game/store';
import { useCombatStore } from '../game/combatStore';
import { useTimer } from '../hooks/useTimer';
import { canAutoComplete } from '../game/rules';
import { COMMIT_HASH } from '../generated/buildInfo';
import './Header.css';

export default function Header() {
  const newGame = useGameStore(s => s.newGame);
  const resetCombat = useCombatStore(s => s.resetCombat);
  const undo = useGameStore(s => s.undo);
  const autoCompleteAction = useGameStore(s => s.autoComplete);
  const moves = useGameStore(s => s.moves);
  const undoStack = useGameStore(s => s.undoStack);
  const stock = useGameStore(s => s.stock);
  const waste = useGameStore(s => s.waste);
  const tableau = useGameStore(s => s.tableau);
  const isWon = useGameStore(s => s.isWon);
  const time = useTimer();

  const showAutoComplete = !isWon && canAutoComplete(stock, waste, tableau);

  const handleNewGame = () => {
    newGame();
    resetCombat();
  };

  return (
    <header className="header">
      <div className="header-left">
        <span className="header-title">Solitaire</span>
        <button className="header-btn" onClick={handleNewGame}>New</button>
        <button className="header-btn" onClick={undo} disabled={undoStack.length === 0}>Undo</button>
        {showAutoComplete && (
          <button className="header-btn" onClick={autoCompleteAction} style={{ color: 'var(--gold)' }}>
            Auto
          </button>
        )}
      </div>
      <div className="header-right">
        <div className="header-stat">Moves: <span>{moves}</span></div>
        <div className="header-stat">Time: <span>{time}</span></div>
        <div className="header-stat header-hash">{COMMIT_HASH}</div>
      </div>
    </header>
  );
}
