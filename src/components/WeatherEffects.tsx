import { memo, useMemo } from 'react';
import { useGame } from '../state/GameContext';
import '../styles/weather.css';

function makeParticles(count: number, durationRange: [number, number]) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${(i / count) * 100 + Math.random() * (100 / count)}%`,
    delay: `${(Math.random() * durationRange[1]).toFixed(1)}s`,
    duration: `${(durationRange[0] + Math.random() * (durationRange[1] - durationRange[0])).toFixed(1)}s`,
    size: undefined as number | undefined,
  }));
}

export const WeatherEffects = memo(function WeatherEffects() {
  const { state } = useGame();
  const type = state.weather.type;

  const rainParticles = useMemo(() => makeParticles(25, [0.5, 1.0]), []);
  const stormParticles = useMemo(() => makeParticles(35, [0.3, 0.7]), []);
  const snowParticles = useMemo(() =>
    makeParticles(20, [4, 7]).map(p => ({
      ...p,
      size: 3 + Math.random() * 5,
    })),
  []);
  const sunParticles = useMemo(() => makeParticles(12, [3, 5]), []);

  if (type === 'rainy') {
    return (
      <div className="weather-fx weather-rain">
        {rainParticles.map(p => (
          <div
            key={p.id}
            className="raindrop"
            style={{
              left: p.left,
              animationDuration: p.duration,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>
    );
  }

  if (type === 'stormy') {
    return (
      <div className="weather-fx weather-storm">
        {stormParticles.map(p => (
          <div
            key={p.id}
            className="storm-drop"
            style={{
              left: p.left,
              animationDuration: p.duration,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>
    );
  }

  if (type === 'snowy') {
    return (
      <div className="weather-fx weather-snow">
        {snowParticles.map(p => (
          <div
            key={p.id}
            className="snowflake"
            style={{
              left: p.left,
              animationDuration: p.duration,
              animationDelay: p.delay,
              width: p.size,
              height: p.size,
            }}
          />
        ))}
      </div>
    );
  }

  if (type === 'sunny') {
    return (
      <div className="weather-fx weather-sunny">
        {sunParticles.map(p => (
          <div
            key={p.id}
            className="sun-sparkle"
            style={{
              left: p.left,
              top: `${Math.random() * 30}%`,
              animationDuration: p.duration,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>
    );
  }

  return null;
});
