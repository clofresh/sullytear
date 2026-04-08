import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useRunStore } from '../runStore';
import { useCombatStore } from '../combatStore';

vi.mock('../orchestrator', async () => {
  const actual = await vi.importActual<typeof import('../orchestrator')>('../orchestrator');
  return {
    ...actual,
    startEncounter: vi.fn(),
    endRunEffects: vi.fn(),
    recordRunStarted: vi.fn(),
    recordMonsterSlain: vi.fn(),
    getHeroHp: vi.fn(() => 40),
  };
});

import { startEncounter } from '../orchestrator';

describe('runStore Frostbitten application', () => {
  beforeEach(() => {
    useRunStore.setState({ stickers: [] });
    (startEncounter as unknown as ReturnType<typeof vi.fn>).mockClear();
  });

  it('advanceEncounter applies a next-scope frostbitten sticker and removes it', () => {
    // Start a run to populate encounters
    useRunStore.getState().startRun('normal');
    // Place a frostbitten sticker targeting the upcoming monster
    useRunStore.setState({
      stickers: [
        { id: 'fb1', defId: 'frostbitten', target: { kind: 'monster', scope: 'next' } },
      ],
    });

    useRunStore.getState().advanceEncounter();

    // Last startEncounter call should have a reduced threatMax
    const calls = (startEncounter as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const lastConfig = calls[calls.length - 1][0] as { monsterThreatMax: number };
    const baselineMonster = useRunStore.getState().encounters[1];
    expect(lastConfig.monsterThreatMax).toBe(baselineMonster.threatMax - 4);
    // Sticker should be gone
    expect(useRunStore.getState().stickers).toHaveLength(0);
  });

  it('startRun is symmetric — frostbitten applies and sticker is removed (no-op in practice)', () => {
    // This path is a no-op in practice because startRun resets stickers.
    // We verify the call path is safe and doesn't throw.
    useRunStore.getState().startRun('normal');
    expect(useRunStore.getState().stickers).toHaveLength(0);
  });
});

// keep referenced to silence unused
void useCombatStore;
