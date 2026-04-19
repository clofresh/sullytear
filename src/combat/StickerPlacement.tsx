import { useState } from 'react';
import { useRunStore } from '../game/runStore';
import { STICKER_REGISTRY } from '../game/stickers/registry';
import type { Sticker, StickerDefId, StickerTarget } from '../game/stickers/types';
import type { PileId } from '../game/types';
import StickerView from '../components/Sticker';
import './RewardScreen.css';

function makeInstanceId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `sticker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const FOUNDATION_SUITS: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = [
  'hearts',
  'diamonds',
  'clubs',
  'spades',
];

export default function StickerPlacement() {
  const rewardPhase = useRunStore((s) => s.rewardPhase);
  const pickedDefId = useRunStore((s) => s.pickedStickerDefId) as StickerDefId | null;
  const pendingDeal = useRunStore((s) => s.pendingDeal);
  const pendingIndex = useRunStore((s) => s.pendingEncounterIndex);
  const encounters = useRunStore((s) => s.encounters);
  const addSticker = useRunStore((s) => s.addSticker);
  const commitEncounter = useRunStore((s) => s.commitEncounter);

  const [placed, setPlaced] = useState<Sticker | null>(null);

  // Charges skip placement entirely.
  if (
    rewardPhase === 'placement' &&
    pickedDefId &&
    !placed &&
    STICKER_REGISTRY[pickedDefId].validTargetKinds.includes('charge')
  ) {
    const def = STICKER_REGISTRY[pickedDefId];
    const sticker: Sticker = {
      id: makeInstanceId(),
      defId: pickedDefId,
      target: { kind: 'charge' },
      usesLeft: def.defaultUses,
    };
    addSticker(sticker);
    setPlaced(sticker);
  }

  if (rewardPhase !== 'placement' || !pickedDefId) return null;

  const def = STICKER_REGISTRY[pickedDefId];
  const legalKinds = new Set(def.validTargetKinds);
  const nextMonster = pendingIndex !== null ? encounters[pendingIndex] : undefined;

  const commit = (target: StickerTarget) => {
    if (placed) return;
    const sticker: Sticker = {
      id: makeInstanceId(),
      defId: pickedDefId,
      target,
      usesLeft: def.defaultUses,
    };
    addSticker(sticker);
    setPlaced(sticker);
  };

  const cardClass = (cardId: string, isPlaceable: boolean) => {
    if (placed) return 'placement-card face-down';
    if (isPlaceable && legalKinds.has('card')) {
      if (placed && (placed as Sticker).target.kind === 'card') {
        const t = (placed as Sticker).target;
        if (t.kind === 'card' && t.cardId === cardId) return 'placement-card face-down sticker-target-legal';
      }
      return 'placement-card face-down sticker-target-legal';
    }
    return 'placement-card face-down';
  };

  return (
    <div className="placement-screen">
      <div className="placement-screen-header">
        <h2>Place: {def.name}</h2>
        <p>{def.description}</p>
        <p>Next encounter is face-down. Pick a target.</p>
      </div>

      <div className="placement-preview">
        {/* Monster + hero portraits */}
        <div className="placement-portraits">
          <div
            className={
              'placement-portrait' +
              (legalKinds.has('hero') && !placed ? ' sticker-target-legal' : '')
            }
            onClick={
              legalKinds.has('hero') && !placed
                ? () => commit({ kind: 'hero' })
                : undefined
            }
          >
            Hero
          </div>
          <div
            className={
              'placement-portrait' +
              (legalKinds.has('monster') && !placed ? ' sticker-target-legal' : '')
            }
            onClick={
              legalKinds.has('monster') && !placed
                ? () => commit({ kind: 'monster', scope: 'next' })
                : undefined
            }
          >
            {nextMonster?.name ?? 'Next Monster'}
          </div>
        </div>

        {/* Foundations + stock as pile buttons */}
        <div className="placement-piles">
          <span className="placement-preview-label">Piles</span>
          {FOUNDATION_SUITS.map((suit, i) => {
            const pileId: PileId = `foundation-${i}`;
            const legal = legalKinds.has('pile') && !placed;
            return (
              <div
                key={suit}
                className={
                  'placement-card face-down' + (legal ? ' sticker-target-legal' : '')
                }
                title={`Foundation ${suit}`}
                onClick={legal ? () => commit({ kind: 'pile', pileId }) : undefined}
              />
            );
          })}
          {(() => {
            const legal = legalKinds.has('pile') && !placed;
            return (
              <div
                className={
                  'placement-card face-down' + (legal ? ' sticker-target-legal' : '')
                }
                title="Stock"
                onClick={legal ? () => commit({ kind: 'pile', pileId: 'stock' }) : undefined}
              />
            );
          })()}
        </div>

        {/* Tableau, face-down */}
        {pendingDeal && (
          <div className="placement-tableau">
            {pendingDeal.tableau.map((col, ci) => (
              <div key={ci} className="placement-tableau-col">
                {col.map((card) => (
                  <div
                    key={card.id}
                    className={cardClass(card.id, true)}
                    title={`card slot`}
                    onClick={
                      legalKinds.has('card') && !placed
                        ? () => commit({ kind: 'card', cardId: card.id })
                        : undefined
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="placement-screen-footer">
        {placed && (
          <span style={{ color: '#ffd24a', fontSize: 13 }}>
            <StickerView defId={pickedDefId} size="badge" instanceId={placed.id} /> placed
          </span>
        )}
        <button
          type="button"
          className="placement-begin-btn"
          disabled={!placed}
          onClick={() => {
            setPlaced(null);
            commitEncounter();
          }}
        >
          Begin Encounter
        </button>
      </div>
    </div>
  );
}
