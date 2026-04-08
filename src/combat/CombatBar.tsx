import { useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useCombatStore } from '../game/combatStore';
import { useRunStore } from '../game/runStore';
import { portraitPositions } from '../game/portraitPositions';
import HealthBar from './HealthBar';
import HeroSprite from './HeroSprite';
import MonsterSprite from './MonsterSprite';
import DamageFlash from './DamageFlash';
import StickerTray from './StickerTray';
import Sticker from '../components/Sticker';
import {
  findHeroStickers,
  findMonsterStickers,
} from '../game/stickers/queries';
import './CombatBar.css';
import './StickerTray.css';

function ThreatBar({ current, max }: { current: number; max: number }) {
  const ratio = Math.max(0, Math.min(1, max > 0 ? current / max : 0));
  return (
    <div className="threat-bar-container" title={`Threat ${current}/${max}`}>
      <div className="threat-bar-track">
        <motion.div
          className="threat-bar-fill"
          animate={{ width: `${ratio * 100}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>
      <div className="threat-bar-text">{current}/{max}</div>
    </div>
  );
}

export default function CombatBar() {
  const heroRef = useRef<HTMLDivElement>(null);
  const monsterRef = useRef<HTMLDivElement>(null);

  const updatePositions = useCallback(() => {
    if (heroRef.current) {
      const r = heroRef.current.getBoundingClientRect();
      portraitPositions.hero.x = (r.left + r.width / 2) / window.innerWidth;
      portraitPositions.hero.y = (r.top + r.height / 2) / window.innerHeight;
    }
    if (monsterRef.current) {
      const r = monsterRef.current.getBoundingClientRect();
      portraitPositions.monster.x = (r.left + r.width / 2) / window.innerWidth;
      portraitPositions.monster.y = (r.top + r.height / 2) / window.innerHeight;
    }
  }, []);

  useEffect(() => {
    updatePositions();
    window.addEventListener('resize', updatePositions);
    return () => window.removeEventListener('resize', updatePositions);
  }, [updatePositions]);
  const heroHp = useCombatStore(s => s.heroHp);
  const heroMaxHp = useCombatStore(s => s.heroMaxHp);
  const heroArmor = useCombatStore(s => s.heroArmor);
  const heroDefense = useCombatStore(s => s.heroDefense);
  const monsterHp = useCombatStore(s => s.monsterHp);
  const monsterMaxHp = useCombatStore(s => s.monsterMaxHp);
  const monsterThreat = useCombatStore(s => s.monsterThreat);
  const monsterThreatMax = useCombatStore(s => s.monsterThreatMax);
  const monsterName = useCombatStore(s => s.monsterName);
  const lastEvent = useCombatStore(s => s.lastEvent);
  const eventId = useCombatStore(s => s.eventId);
  const isActive = useCombatStore(s => s.isActive);
  const empowered = useCombatStore(s => s.empowered);
  const poisonTurns = useCombatStore(s => s.poisonTurns);
  const monsterId = useCombatStore(s => s.monsterId);
  const currentIndex = useRunStore(s => s.currentEncounterIndex);
  const encounters = useRunStore(s => s.encounters);
  const allStickers = useRunStore(s => s.stickers);
  const heroStickers = findHeroStickers(allStickers);
  const monsterStickers = findMonsterStickers(allStickers, 'current');
  const pileStickers = allStickers.filter((s) => s.target.kind === 'pile');

  if (!isActive) return null;

  const isHeroHit = lastEvent?.type === 'monster-attack';
  const isMonsterHit = lastEvent?.type === 'hero-attack' || lastEvent?.type === 'poison';
  const isHeroHeal = lastEvent?.type === 'hero-heal';
  return (
    <div className="combat-bar">
      <div className="combat-bar-inner">
        {/* Hero side */}
        <div className="combatant hero-side">
          <div ref={heroRef}><HeroSprite shake={isHeroHit} empowered={empowered} /></div>
          <div className="combatant-info">
            <div className="combatant-name">
              Hero
              {heroArmor > 0 && <span className="hero-armor"> · {heroArmor} ARM</span>}
              {heroDefense > 0 && <span className="hero-defense"> · {heroDefense}% DEF</span>}
            </div>
            <HealthBar current={heroHp} max={heroMaxHp} side="left" />
            {heroStickers.length > 0 && (
              <div className="hud-sticker-row">
                {heroStickers.map((s) => (
                  <Sticker key={s.id} defId={s.defId} instanceId={s.id} size="badge" />
                ))}
              </div>
            )}
          </div>
          {isHeroHit && lastEvent && (
            <DamageFlash event={lastEvent} eventId={eventId} />
          )}
          {isHeroHeal && lastEvent && (
            <DamageFlash event={lastEvent} eventId={eventId} />
          )}
        </div>

        {/* VS divider */}
        <div className="combat-vs">
          <span>VS</span>
          {encounters.length > 0 && (
            <span className="combat-progress">{currentIndex + 1}/{encounters.length}</span>
          )}
        </div>

        {/* Monster side */}
        <div className="combatant monster-side">
          {isMonsterHit && lastEvent && (
            <DamageFlash event={lastEvent} eventId={eventId} />
          )}
          <div className="combatant-info">
            <div className="combatant-name">{monsterName}</div>
            <HealthBar current={monsterHp} max={monsterMaxHp} side="right" />
            <ThreatBar current={monsterThreat} max={monsterThreatMax} />
            {monsterStickers.length > 0 && (
              <div className="hud-sticker-row">
                {monsterStickers.map((s) => (
                  <Sticker key={s.id} defId={s.defId} instanceId={s.id} size="badge" />
                ))}
              </div>
            )}
          </div>
          <div ref={monsterRef}><MonsterSprite shake={isMonsterHit} poisoned={poisonTurns > 0} monsterId={monsterId} /></div>
        </div>
      </div>
      {pileStickers.length > 0 && (
        <div className="hud-sticker-row" style={{ justifyContent: 'center', padding: '4px 8px' }}>
          <span className="hud-sticker-row-label">PILES</span>
          {pileStickers.map((s) => {
            const pileLabel =
              s.target.kind === 'pile' ? String(s.target.pileId) : '';
            return (
              <Sticker
                key={s.id}
                defId={s.defId}
                instanceId={s.id}
                size="badge"
                title={`${s.defId} — ${pileLabel}`}
              />
            );
          })}
        </div>
      )}
      <StickerTray />
    </div>
  );
}
