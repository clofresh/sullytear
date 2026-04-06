import { getDropPreview } from '../game/dropPreview';
import { dragState } from '../game/dragState';
import './DropPreview.css';

interface DropPreviewProps {
  targetPileId: string;
}

export default function DropPreview({ targetPileId }: DropPreviewProps) {
  const text = getDropPreview(dragState.cards, targetPileId, dragState.sourcePileId ?? undefined);
  if (!text) return null;

  const hasFaceEffect = text.includes('Rises') || text.includes('Awakens');
  // Split on " · " to separate damage from face card effect
  const parts = text.split(' · ');

  return (
    <div className={`drop-preview ${hasFaceEffect ? 'drop-preview-royal' : 'drop-preview-damage'}`}>
      <span className="drop-preview-dmg">{parts[0]}</span>
      {parts[1] && <span className="drop-preview-effect">{parts[1]}</span>}
    </div>
  );
}
