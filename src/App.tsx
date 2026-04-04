import { lazy, Suspense } from 'react';
import Header from './components/Header';
import GameBoard from './components/GameBoard';
import WinScreen from './components/WinScreen';
import './App.css';

const AnimatedBackground = lazy(() => import('./background/AnimatedBackground'));

export default function App() {
  return (
    <>
      <Suspense fallback={null}>
        <AnimatedBackground />
      </Suspense>
      <Header />
      <GameBoard />
      <WinScreen />
    </>
  );
}
