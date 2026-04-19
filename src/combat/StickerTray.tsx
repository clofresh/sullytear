import { useRunStore } from '../game/runStore';
import { activateCharge } from '../game/stickers/charges';
import Sticker from '../components/Sticker';
import './StickerTray.css';

export default function StickerTray() {
  const charges = useRunStore((s) =>
    s.stickers.filter((st) => st.target.kind === 'charge'),
  );

  if (charges.length === 0) return null;

  return (
    <div className="sticker-tray" aria-label="Charges">
      <div className="sticker-tray-label">CHARGES</div>
      <div className="sticker-tray-items">
        {charges.map((s) => (
          <div key={s.id} className="sticker-tray-item">
            <Sticker
              defId={s.defId}
              instanceId={s.id}
              size="badge"
              onClick={() => activateCharge(s.id)}
              title={`${s.defId} (click to activate)`}
            />
            {s.usesLeft !== undefined && s.usesLeft > 1 && (
              <span className="sticker-tray-uses">x{s.usesLeft}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
