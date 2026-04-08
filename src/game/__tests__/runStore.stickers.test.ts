import { describe, it, expect, beforeEach } from 'vitest';
import { useRunStore } from '../runStore';
import { foundationId } from '../pileId';

describe('runStore stickers slice', () => {
  beforeEach(() => {
    useRunStore.setState({ stickers: [], isRunActive: false });
  });

  it('startRun clears stickers', () => {
    useRunStore.setState({
      stickers: [{ id: 'x', defId: 'sharpened', target: { kind: 'card', cardId: 'c1' } }],
    });
    useRunStore.getState().startRun('normal');
    expect(useRunStore.getState().stickers).toEqual([]);
  });

  it('addSticker appends', () => {
    useRunStore.getState().addSticker({
      id: 's1',
      defId: 'forge',
      target: { kind: 'pile', pileId: foundationId(0) },
    });
    expect(useRunStore.getState().stickers).toHaveLength(1);
  });

  it('decrementStickerUses removes when usesLeft hits zero', () => {
    useRunStore.setState({
      stickers: [{ id: 's1', defId: 'surge', target: { kind: 'charge' }, usesLeft: 1 }],
    });
    useRunStore.getState().decrementStickerUses('s1');
    expect(useRunStore.getState().stickers).toHaveLength(0);
  });
});
