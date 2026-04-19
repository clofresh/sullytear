import { describe, it, expect, beforeEach } from 'vitest';
import { useRunStore } from '../../runStore';
import { useCombatStore } from '../../combatStore';
import { activateCharge } from '../charges';

describe('activateCharge', () => {
  beforeEach(() => {
    useRunStore.setState({ stickers: [] });
    useCombatStore.setState({ empowerMultiplier: 1.0 });
  });

  it('Surge sets empowerMultiplier to 2.0 and removes the sticker', () => {
    useRunStore.setState({
      stickers: [
        { id: 's1', defId: 'surge', target: { kind: 'charge' }, usesLeft: 1 },
      ],
    });
    activateCharge('s1');
    expect(useCombatStore.getState().empowerMultiplier).toBe(2.0);
    expect(useRunStore.getState().stickers).toHaveLength(0);
  });

  it('is a no-op for unknown sticker id', () => {
    activateCharge('missing');
    expect(useCombatStore.getState().empowerMultiplier).toBe(1.0);
  });

  it('is a no-op for non-charge sticker', () => {
    useRunStore.setState({
      stickers: [
        { id: 's2', defId: 'sharpened', target: { kind: 'card', cardId: 'c1' } },
      ],
    });
    activateCharge('s2');
    expect(useCombatStore.getState().empowerMultiplier).toBe(1.0);
    expect(useRunStore.getState().stickers).toHaveLength(1);
  });
});
