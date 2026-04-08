import type { StickerDefId, StickerTarget } from './types';

export interface StickerDef {
  id: StickerDefId;
  name: string;
  tag: string;
  description: string;
  validTargetKinds: StickerTarget['kind'][];
  /** For charges only — initial usesLeft when placed. */
  defaultUses?: number;
}

export const STICKER_REGISTRY: Record<StickerDefId, StickerDef> = {
  sharpened: {
    id: 'sharpened',
    name: 'Sharpened',
    tag: 'SHRP',
    description: '+3 damage when this card is foundationed.',
    validTargetKinds: ['card'],
  },
  volatile: {
    id: 'volatile',
    name: 'Volatile',
    tag: 'VOLT',
    description: "When revealed, deals damage equal to this card's rank.",
    validTargetKinds: ['card'],
  },
  forge: {
    id: 'forge',
    name: 'Forge',
    tag: 'FRG',
    description: '+2 damage to all foundations of this suit.',
    validTargetKinds: ['pile'],
  },
  vampire: {
    id: 'vampire',
    name: 'Vampire',
    tag: 'VAMP',
    description: '10% of foundation damage heals the hero (min 1).',
    validTargetKinds: ['hero'],
  },
  frostbitten: {
    id: 'frostbitten',
    name: 'Frostbitten',
    tag: 'FRST',
    description: "Next monster's threat max is reduced by 4.",
    validTargetKinds: ['monster'],
  },
  surge: {
    id: 'surge',
    name: 'Surge',
    tag: 'SRG',
    description: 'Next foundation deals double damage. One-shot.',
    validTargetKinds: ['charge'],
    defaultUses: 1,
  },
};

export function getStickerDef(id: StickerDefId): StickerDef {
  const def = STICKER_REGISTRY[id];
  if (!def) throw new Error(`Unknown sticker def: ${id}`);
  return def;
}
