import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../game/store';

export function useTimer(): string {
  const startTime = useGameStore(s => s.startTime);
  const isWon = useGameStore(s => s.isWon);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!startTime || isWon) {
      if (startTime) {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }
      return;
    }

    setElapsed(Math.floor((Date.now() - startTime) / 1000));
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startTime, isWon]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
