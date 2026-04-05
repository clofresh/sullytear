import { useRef, useEffect, useCallback } from 'react';
import { useCombatStore } from '../game/combatStore';
import { portraitPositions } from '../game/portraitPositions';
import HealthBar from './HealthBar';
import HeroSprite from './HeroSprite';
import MonsterSprite from './MonsterSprite';
import DamageFlash from './DamageFlash';
import './CombatBar.css';

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
  const monsterHp = useCombatStore(s => s.monsterHp);
  const monsterMaxHp = useCombatStore(s => s.monsterMaxHp);
  const monsterName = useCombatStore(s => s.monsterName);
  const lastEvent = useCombatStore(s => s.lastEvent);
  const eventId = useCombatStore(s => s.eventId);
  const isActive = useCombatStore(s => s.isActive);
  const empowered = useCombatStore(s => s.empowered);
  const poisonTurns = useCombatStore(s => s.poisonTurns);

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
            <div className="combatant-name">Hero</div>
            <HealthBar current={heroHp} max={heroMaxHp} side="left" />
          </div>
          {isHeroHit && lastEvent && (
            <DamageFlash event={lastEvent} eventId={eventId} />
          )}
          {isHeroHeal && lastEvent && (
            <DamageFlash event={lastEvent} eventId={eventId} />
          )}
        </div>

        {/* VS divider */}
        <div className="combat-vs">VS</div>

        {/* Monster side */}
        <div className="combatant monster-side">
          {isMonsterHit && lastEvent && (
            <DamageFlash event={lastEvent} eventId={eventId} />
          )}
          <div className="combatant-info">
            <div className="combatant-name">{monsterName}</div>
            <HealthBar current={monsterHp} max={monsterMaxHp} side="right" />
          </div>
          <div ref={monsterRef}><MonsterSprite shake={isMonsterHit} poisoned={poisonTurns > 0} /></div>
        </div>
      </div>
    </div>
  );
}
