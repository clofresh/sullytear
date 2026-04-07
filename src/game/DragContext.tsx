import { createContext, useContext, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react';
import type { Card } from './types';

export interface DragSnapshot {
  active: boolean;
  cards: readonly Card[];
  sourcePileId: string;
  validTargets: ReadonlySet<string>;
}

export interface DragApi {
  start(cards: Card[], sourcePileId: string): void;
  /** Clears drag state and returns the snapshot just before clearing
   *  (so handleDragEnd can read validTargets). */
  end(): DragSnapshot;
  registerValidTarget(pileId: string, valid: boolean): void;
  getSnapshot(): DragSnapshot;
  subscribe(listener: () => void): () => void;
}

const EMPTY_SNAPSHOT: DragSnapshot = {
  active: false,
  cards: [],
  sourcePileId: '',
  validTargets: new Set<string>(),
};

function createDragStore(): DragApi {
  let snapshot: DragSnapshot = EMPTY_SNAPSHOT;
  const listeners = new Set<() => void>();
  // validTargets is a mutable set that lives across snapshots so it can be
  // mutated by registerValidTarget without breaking equality checks for
  // unrelated consumers.
  let validTargets = new Set<string>();

  const emit = () => {
    snapshot = {
      active: snapshot.active,
      cards: snapshot.cards,
      sourcePileId: snapshot.sourcePileId,
      validTargets: new Set(validTargets),
    };
    listeners.forEach(l => l());
  };

  return {
    start(cards, sourcePileId) {
      validTargets = new Set<string>();
      snapshot = {
        active: true,
        cards: [...cards],
        sourcePileId,
        validTargets: new Set(validTargets),
      };
      listeners.forEach(l => l());
    },
    end() {
      const captured = snapshot;
      validTargets = new Set<string>();
      snapshot = EMPTY_SNAPSHOT;
      listeners.forEach(l => l());
      return captured;
    },
    registerValidTarget(pileId, valid) {
      const had = validTargets.has(pileId);
      if (valid && !had) {
        validTargets.add(pileId);
        emit();
      } else if (!valid && had) {
        validTargets.delete(pileId);
        emit();
      }
    },
    getSnapshot() {
      return snapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const DragContext = createContext<DragApi | null>(null);

export function DragProvider({ children }: { children: ReactNode }) {
  const apiRef = useRef<DragApi | null>(null);
  if (apiRef.current === null) apiRef.current = createDragStore();
  const value = useMemo(() => apiRef.current!, []);
  return <DragContext.Provider value={value}>{children}</DragContext.Provider>;
}

export function useDragApi(): DragApi {
  const ctx = useContext(DragContext);
  if (!ctx) throw new Error('useDragApi must be used inside <DragProvider>');
  return ctx;
}

export function useDragState(): DragSnapshot {
  const api = useDragApi();
  return useSyncExternalStore(api.subscribe, api.getSnapshot, api.getSnapshot);
}
