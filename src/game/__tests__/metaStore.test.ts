import { describe, it, expect, beforeEach } from 'vitest';
import { useMetaStore } from '../metaStore';

function resetMeta() {
  useMetaStore.setState({
    gold: 0,
    totalGold: 0,
    totalMonstersSlain: 0,
    totalRunsCompleted: 0,
    totalRunsStarted: 0,
  });
}

describe('Meta Store', () => {
  beforeEach(() => resetMeta());

  it('starts with zero gold and stats', () => {
    const s = useMetaStore.getState();
    expect(s.gold).toBe(0);
    expect(s.totalGold).toBe(0);
    expect(s.totalMonstersSlain).toBe(0);
    expect(s.totalRunsCompleted).toBe(0);
    expect(s.totalRunsStarted).toBe(0);
  });

  it('addGold increases gold and totalGold', () => {
    useMetaStore.getState().addGold(10);
    expect(useMetaStore.getState().gold).toBe(10);
    expect(useMetaStore.getState().totalGold).toBe(10);

    useMetaStore.getState().addGold(5);
    expect(useMetaStore.getState().gold).toBe(15);
    expect(useMetaStore.getState().totalGold).toBe(15);
  });

  it('recordMonsterSlain increments counter', () => {
    useMetaStore.getState().recordMonsterSlain();
    useMetaStore.getState().recordMonsterSlain();
    expect(useMetaStore.getState().totalMonstersSlain).toBe(2);
  });

  it('recordRunCompleted increments counter', () => {
    useMetaStore.getState().recordRunCompleted();
    expect(useMetaStore.getState().totalRunsCompleted).toBe(1);
  });

  it('recordRunStarted increments counter', () => {
    useMetaStore.getState().recordRunStarted();
    useMetaStore.getState().recordRunStarted();
    expect(useMetaStore.getState().totalRunsStarted).toBe(2);
  });
});
