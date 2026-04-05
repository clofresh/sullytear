import { lazy, Suspense } from 'react';
import Header from './components/Header';
import GameBoard from './components/GameBoard';
import WinScreen from './components/WinScreen';
import CombatBar from './combat/CombatBar';
import CombatOverlay from './combat/CombatOverlay';
import CombatArena from './combat/arena/CombatArena';
import DragTrail from './components/DragTrail';
import RunStartScreen from './components/RunStartScreen';
import { useRunStore } from './game/runStore';
import './App.css';

const AnimatedBackground = lazy(() => import('./background/AnimatedBackground'));

export default function App() {
  const isRunActive = useRunStore(s => s.isRunActive);

  return (
    <>
      <Suspense fallback={null}>
        <AnimatedBackground />
      </Suspense>
      {!isRunActive ? (
        <RunStartScreen />
      ) : (
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Header />
          <CombatBar />
          <CombatArena />
          <GameBoard />
          <WinScreen />
          <CombatOverlay />
          <DragTrail />
        </div>
      )}
    </>
  );
}
