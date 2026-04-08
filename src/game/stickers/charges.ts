import { useRunStore } from '../runStore';
import { useCombatStore } from '../combatStore';

/**
 * Activate a charge sticker by id. Applies its one-shot effect (via the
 * existing empowerMultiplier hook for Surge), then decrements its uses
 * (removing the sticker when usesLeft hits 0). Called from the UI tray
 * when the player clicks a charge. No-op for unknown ids or non-charge
 * stickers — keeps the call site cheap.
 */
export function activateCharge(stickerId: string): void {
  const sticker = useRunStore.getState().stickers.find((s) => s.id === stickerId);
  if (!sticker) return;
  if (sticker.target.kind !== 'charge') return;

  switch (sticker.defId) {
    case 'surge':
      useCombatStore.getState().setEmpowerMultiplier(2.0);
      break;
    default:
      return;
  }

  useRunStore.getState().decrementStickerUses(stickerId);
}
