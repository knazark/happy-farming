import { useState, useEffect } from 'react';
import { useGame } from '../state/GameContext';
import { xpForLevel, MAX_LEVEL } from '../constants/game';
import { SEASON_INFO, WEATHER_INFO, SEASON_CROP_MULTIPLIER, SEASON_PRICE_MULTIPLIER, SEASON_DURATION } from '../constants/seasons';

interface HUDProps {
  onProfileClick: () => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function HUD({ onProfileClick }: HUDProps) {
  const { state } = useGame();
  const xpNeeded = state.level >= MAX_LEVEL ? 0 : xpForLevel(state.level);
  const xpProgress = xpNeeded > 0 ? state.xp / xpNeeded : 1;
  const displayName = state.profile.name || 'Фермер';

  const season = SEASON_INFO[state.season];
  const weather = WEATHER_INFO[state.weather.type];
  const growthMod = SEASON_CROP_MULTIPLIER[state.season];
  const priceMod = SEASON_PRICE_MULTIPLIER[state.season];

  // Tick every second for timers
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();
  const seasonTimeLeft = Math.max(0, Math.ceil(SEASON_DURATION - (now - state.seasonStartedAt) / 1000));
  const weatherTimeLeft = Math.max(0, Math.ceil((state.weather.changesAt - now) / 1000));

  return (
    <div className="hud">
      <div className="hud-left">
        <button className="hud-profile-btn" onClick={onProfileClick} title="Редагувати профіль">
          {state.profile.avatar}
        </button>
        <div>
          <h1 className="hud-title">{displayName}</h1>
          <div className="hud-level">
            <span className="hud-level-badge">⭐ {state.level}</span>
            {state.level < MAX_LEVEL && (
              <>
                <div className="hud-xp-bar">
                  <div className="hud-xp-fill" style={{ width: `${xpProgress * 100}%` }} />
                </div>
                <span className="hud-xp-label">{state.xp}/{xpNeeded}</span>
              </>
            )}
            {state.level >= MAX_LEVEL && (
              <span className="hud-level-badge">MAX</span>
            )}
          </div>
        </div>
      </div>
      <div className="hud-right">
        <div className="hud-env">
          <div className="hud-env-item">
            <span className="hud-env-emoji">{season.emoji}</span>
            <div className="hud-env-col">
              <span className="hud-env-name">{season.name}</span>
              <span className="hud-env-desc">{season.description}</span>
              <span className="hud-env-timer">{formatTime(seasonTimeLeft)}</span>
            </div>
          </div>
          <div className="hud-env-item">
            <span className="hud-env-emoji">{weather.emoji}</span>
            <div className="hud-env-col">
              <span className="hud-env-name">{weather.name}</span>
              <span className="hud-env-desc">{weather.effect}</span>
              <span className="hud-env-timer">{formatTime(weatherTimeLeft)}</span>
            </div>
          </div>
          {(growthMod !== 1 || priceMod !== 1) && (
            <div className="hud-mods">
              {growthMod !== 1 && (
                <span className={`hud-mod ${growthMod < 1 ? 'hud-mod--good' : 'hud-mod--bad'}`}>
                  🌱 {growthMod < 1 ? '↑' : '↓'}{Math.round(Math.abs(1 - growthMod) * 100)}%
                </span>
              )}
              {priceMod !== 1 && (
                <span className={`hud-mod ${priceMod > 1 ? 'hud-mod--good' : 'hud-mod--bad'}`}>
                  💰 {priceMod > 1 ? '↑' : '↓'}{Math.round(Math.abs(1 - priceMod) * 100)}%
                </span>
              )}
            </div>
          )}
        </div>
        <span className="hud-coins">💰 {state.coins}</span>
      </div>
    </div>
  );
}
