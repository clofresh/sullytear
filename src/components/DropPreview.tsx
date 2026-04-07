import { getDropPreview } from '../game/dropPreview';
import { useDragState } from '../game/DragContext';
import './DropPreview.css';

interface DropPreviewProps {
  targetPileId: string;
}

export default function DropPreview({ targetPileId }: DropPreviewProps) {
  const drag = useDragState();
  const text = getDropPreview([...drag.cards], targetPileId, drag.sourcePileId || undefined);
  if (!text) return null;

  const hasFaceEffect = text.includes('Rises') || text.includes('Awakens');
  const parts = text.split(' · ');

  return (
    <div className={`drop-preview ${hasFaceEffect ? 'drop-preview-royal' : 'drop-preview-damage'}`}>
      <span className="drop-preview-dmg">{parts[0]}</span>
      {parts[1] && <span className="drop-preview-effect">{parts[1]}</span>}
    </div>
  );
}
