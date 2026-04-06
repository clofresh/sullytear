import { getDropPreview } from '../game/dropPreview';
import { dragState } from '../game/dragState';
import './DropPreview.css';

interface DropPreviewProps {
  targetPileId: string;
}

export default function DropPreview({ targetPileId }: DropPreviewProps) {
  const text = getDropPreview(dragState.cards, targetPileId, dragState.sourcePileId ?? undefined);
  if (!text) return null;

  const isDamage = text.startsWith('-');
  const isFaceEffect = text.includes('Rises') || text.includes('Awakens');
  const colorClass = isFaceEffect ? 'drop-preview-royal' : isDamage ? 'drop-preview-damage' : '';

  return (
    <div className={`drop-preview ${colorClass}`}>
      {text}
    </div>
  );
}
