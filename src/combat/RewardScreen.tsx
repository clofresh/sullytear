import { useMemo } from 'react';
import { useRunStore } from '../game/runStore';
import { rollStickerOffer } from '../game/stickers/offer';
import { STICKER_REGISTRY } from '../game/stickers/registry';
import Sticker from '../components/Sticker';
import './RewardScreen.css';

export default function RewardScreen() {
  const rewardPhase = useRunStore((s) => s.rewardPhase);
  const rewardSeed = useRunStore((s) => s.rewardSeed);
  const lastGoldAwarded = useRunStore((s) => s.lastGoldAwarded);
  const pickSticker = useRunStore((s) => s.pickSticker);

  const offer = useMemo(() => rollStickerOffer(rewardSeed, 1), [rewardSeed]);

  if (rewardPhase !== 'draft') return null;

  return (
    <div className="reward-screen">
      <div className="reward-screen-content">
        <h2 className="reward-screen-title">Monster Defeated</h2>
        <div className="reward-screen-gold">+{lastGoldAwarded} Gold</div>
        <p className="reward-screen-subtitle">Pick a sticker to take with you.</p>
        <div className="reward-screen-offer">
          {offer.map((defId) => {
            const def = STICKER_REGISTRY[defId];
            return (
              <button
                key={defId}
                type="button"
                className="reward-screen-card"
                onClick={() => pickSticker(defId)}
              >
                <Sticker defId={defId} size="card" instanceId={`offer-${defId}`} />
                <div className="reward-screen-card-name">{def.name}</div>
                <div className="reward-screen-card-desc">{def.description}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
