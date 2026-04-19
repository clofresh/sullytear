import { describe, it, expect, beforeEach } from 'vitest';
import { useRunStore } from '../runStore';
import type { Sticker } from '../stickers/types';

describe('runStore placement flow', () => {
  beforeEach(() => {
    useRunStore.setState({
      stickers: [],
      rewardPhase: 'none',
      pendingDeal: null,
      pendingEncounterIndex: null,
      pickedStickerDefId: null,
      isRunActive: false,
    });
  });

  it('pickSticker transitions to placement and records the defId', () => {
    useRunStore.setState({ rewardPhase: 'draft' });
    useRunStore.getState().pickSticker('sharpened');
    const s = useRunStore.getState();
    expect(s.rewardPhase).toBe('placement');
    expect(s.pickedStickerDefId).toBe('sharpened');
  });

  it('addSticker with a card target appends a well-formed instance', () => {
    const sticker: Sticker = {
      id: 'test-1',
      defId: 'sharpened',
      target: { kind: 'card', cardId: 'hearts-7' },
    };
    useRunStore.getState().addSticker(sticker);
    const stickers = useRunStore.getState().stickers;
    expect(stickers).toHaveLength(1);
    expect(stickers[0]).toEqual(sticker);
    expect(stickers[0].target.kind).toBe('card');
    if (stickers[0].target.kind === 'card') {
      expect(stickers[0].target.cardId).toBe('hearts-7');
    }
  });

  it('addSticker for a charge target carries usesLeft', () => {
    useRunStore.getState().addSticker({
      id: 'c1',
      defId: 'surge',
      target: { kind: 'charge' },
      usesLeft: 1,
    });
    const s = useRunStore.getState().stickers[0];
    expect(s.target.kind).toBe('charge');
    expect(s.usesLeft).toBe(1);
  });
});
