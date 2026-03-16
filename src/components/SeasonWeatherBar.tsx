import { useGame } from '../state/GameContext';
import { SEASON_INFO, SEASON_DURATION, SEASON_CROP_MULTIPLIER, SEASON_PRICE_MULTIPLIER } from '../constants/seasons';
import { WEATHER_INFO } from '../constants/seasons';

export function SeasonWeatherBar() {
  const { state } = useGame();
  const season = SEASON_INFO[state.season];
  const weather = WEATHER_INFO[state.weather.type];

  const seasonElapsed = (Date.now() - state.seasonStartedAt) / 1000;
  const seasonProgress = Math.min(1, seasonElapsed / SEASON_DURATION);
  const seasonTimeLeft = Math.max(0, Math.ceil(SEASON_DURATION - seasonElapsed));
  const minutes = Math.floor(seasonTimeLeft / 60);
  const seconds = seasonTimeLeft % 60;

  const weatherTimeLeft = Math.max(0, Math.ceil((state.weather.changesAt - Date.now()) / 1000));
  const wMin = Math.floor(weatherTimeLeft / 60);
  const wSec = weatherTimeLeft % 60;

  const growthMod = SEASON_CROP_MULTIPLIER[state.season];
  const priceMod = SEASON_PRICE_MULTIPLIER[state.season];

  return (
    <div className="season-weather-bar">
      <div className="season-info">
        <span className="season-emoji">{season.emoji}</span>
        <div className="season-details">
          <strong>{season.name}</strong>
          <span className="season-desc">{season.description}</span>
          <div className="season-progress-bar">
            <div className="season-progress-fill" style={{ width: `${seasonProgress * 100}%` }} />
          </div>
          <span className="season-timer">{minutes}:{seconds.toString().padStart(2, '0')}</span>
        </div>
      </div>
      <div className="weather-info">
        <span className="weather-emoji">{weather.emoji}</span>
        <div className="weather-details">
          <strong>{weather.name}</strong>
          <span className="weather-effect">{weather.effect}</span>
          <span className="weather-timer">{wMin}:{wSec.toString().padStart(2, '0')}</span>
        </div>
      </div>
      <div className="season-modifiers">
        {growthMod !== 1 && (
          <span className={growthMod < 1 ? 'mod-good' : 'mod-bad'}>
            🌱 {growthMod < 1 ? '↑' : '↓'}{Math.round(Math.abs(1 - growthMod) * 100)}%
          </span>
        )}
        {priceMod !== 1 && (
          <span className={priceMod > 1 ? 'mod-good' : 'mod-bad'}>
            💰 {priceMod > 1 ? '↑' : '↓'}{Math.round(Math.abs(1 - priceMod) * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}
