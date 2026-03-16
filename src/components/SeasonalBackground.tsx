import { useRef, useEffect } from 'react';
import { useGame } from '../state/GameContext';

// Particles match BOTH season and weather
const SEASON_EMOJIS: Record<string, string[]> = {
  spring: ['🌸', '🌷', '💮', '🌼'],
  summer: ['🦋', '☀️', '🐝'],
  autumn: ['🍂', '🍁', '🍃'],
  winter: ['❄️', '❄️', '❄️', '🌨️'],
};

// Weather can override/add particles
const WEATHER_EMOJIS: Record<string, string[]> = {
  rainy: ['💧', '💧', '💧'],
  snowy: ['❄️', '❄️', '❄️', '🌨️'],
  stormy: ['💧', '💧', '⚡'],
  sunny: [],
};

interface FallingParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  emoji: string;
  size: number;
  alpha: number;
  rotation: number;
  rotSpeed: number;
  wobblePhase: number;
}

const MAX_PARTICLES = 30;

function getEmojis(season: string, weather: string): string[] {
  // Weather-specific particles take priority for rain/snow/storm
  if (weather === 'snowy') return WEATHER_EMOJIS.snowy;
  if (weather === 'rainy') return [...WEATHER_EMOJIS.rainy, ...(SEASON_EMOJIS[season] || []).slice(0, 1)];
  if (weather === 'stormy') return WEATHER_EMOJIS.stormy;
  // Sunny — use seasonal emojis
  return SEASON_EMOJIS[season] || SEASON_EMOJIS.spring;
}

function getParticleSpeed(season: string, weather: string) {
  if (weather === 'rainy' || weather === 'stormy') {
    return { vx: (Math.random() - 0.3) * 0.5, vy: 1.5 + Math.random() * 1.5 }; // fast rain drops
  }
  if (weather === 'snowy' || season === 'winter') {
    return { vx: (Math.random() - 0.5) * 0.4, vy: 0.3 + Math.random() * 0.5 }; // slow snow
  }
  if (season === 'autumn') {
    return { vx: (Math.random() - 0.5) * 0.8, vy: 0.4 + Math.random() * 0.7 }; // drifting leaves
  }
  return { vx: (Math.random() - 0.5) * 0.6, vy: 0.3 + Math.random() * 0.4 }; // gentle spring/summer
}

export function SeasonalBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state } = useGame();
  const particlesRef = useRef<FallingParticle[]>([]);
  const seasonRef = useRef(state.season);
  const weatherRef = useRef(state.weather?.type || 'sunny');
  const lastSpawnRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
      canvas!.style.width = `${window.innerWidth}px`;
      canvas!.style.height = `${window.innerHeight}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    let animId: number;

    function draw() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const season = seasonRef.current;
      const weather = weatherRef.current;
      const particles = particlesRef.current;

      ctx!.clearRect(0, 0, w, h);

      // Spawn
      const now = Date.now();
      const spawnInterval = (weather === 'rainy' || weather === 'stormy') ? 200 : 500;
      if (now - lastSpawnRef.current > spawnInterval && particles.length < MAX_PARTICLES) {
        const emojis = getEmojis(season, weather);
        if (emojis.length > 0) {
          const emoji = emojis[Math.floor(Math.random() * emojis.length)];
          const speed = getParticleSpeed(season, weather);
          const isRain = weather === 'rainy' || weather === 'stormy';

          particles.push({
            x: Math.random() * w,
            y: -20,
            vx: speed.vx,
            vy: speed.vy,
            emoji,
            size: isRain ? 8 + Math.random() * 6 : 12 + Math.random() * 10,
            alpha: isRain ? 0.2 + Math.random() * 0.2 : 0.3 + Math.random() * 0.35,
            rotation: isRain ? 0 : Math.random() * Math.PI * 2,
            rotSpeed: isRain ? 0 : (Math.random() - 0.5) * 0.02,
            wobblePhase: Math.random() * Math.PI * 2,
          });
        }
        lastSpawnRef.current = now;
      }

      // Update & draw
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx + Math.sin(now / 1000 + p.wobblePhase) * 0.3;
        p.y += p.vy;
        p.rotation += p.rotSpeed;

        if (p.y > h + 30) {
          particles.splice(i, 1);
          continue;
        }

        ctx!.save();
        ctx!.globalAlpha = p.alpha;
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rotation);
        ctx!.font = `${Math.round(p.size)}px serif`;
        ctx!.textAlign = 'center';
        ctx!.textBaseline = 'middle';
        ctx!.fillText(p.emoji, 0, 0);
        ctx!.restore();
      }

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Update refs when season/weather change — clear particles on change
  useEffect(() => {
    if (seasonRef.current !== state.season) {
      particlesRef.current.length = 0;
      seasonRef.current = state.season;
    }
  }, [state.season]);

  useEffect(() => {
    const w = state.weather?.type || 'sunny';
    if (weatherRef.current !== w) {
      particlesRef.current.length = 0;
      weatherRef.current = w;
    }
  }, [state.weather?.type]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
