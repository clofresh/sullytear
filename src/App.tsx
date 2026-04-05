import { lazy, Suspense } from 'react';
import Header from './components/Header';
import GameBoard from './components/GameBoard';
import WinScreen from './components/WinScreen';
import CombatBar from './combat/CombatBar';
import CombatOverlay from './combat/CombatOverlay';
import DragTrail from './components/DragTrail';
import './App.css';

const AnimatedBackground = lazy(() => import('./background/AnimatedBackground'));

export default function App() {
  return (
    <>
      <Suspense fallback={null}>
        <AnimatedBackground />
      </Suspense>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Header />
        <CombatBar />
        <GameBoard />
        <WinScreen />
        <CombatOverlay />
        <DragTrail />
      </div>
    </>
  );
}
