import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

interface Particle {
  id: string;
  x: number;
  y: number;
  text: string;
  size: number;
  bold?: boolean;
  lifetime: number;
  createdAt: number;
}

interface SeasonalParticle {
  id: string;
  emoji: string;
  startX: number;
  duration: number;
  delay: number;
  size: number;
  wobble: number;
}

const SEASON_EMOJIS: Record<string, string[]> = {
  spring: ['🌸', '🌷', '💮', '🌼'],
  summer: ['🦋', '☀️', '🐝'],
  autumn: ['🍂', '🍁', '🍃'],
  winter: ['❄️', '❄️', '❄️', '🌨️'],
};

export interface ParticleLayerHandle {
  spawn: (x: number, y: number, particles: Array<{ text: string; size: number; bold?: boolean; lifetime: number; offsetY?: number }>) => void;
}

export const ParticleLayer = forwardRef<ParticleLayerHandle, { season: string }>(
  function ParticleLayer({ season }, ref) {
    const [particles, setParticles] = useState<Particle[]>([]);
    const [seasonals, setSeasonals] = useState<SeasonalParticle[]>([]);

    // Expose spawn method
    const spawn = useCallback((x: number, y: number, items: Array<{ text: string; size: number; bold?: boolean; lifetime: number; offsetY?: number }>) => {
      const now = Date.now();
      const newParticles = items.map((item, i) => ({
        id: `p_${now}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        x,
        y: y + (item.offsetY ?? 0),
        text: item.text,
        size: item.size,
        bold: item.bold,
        lifetime: item.lifetime,
        createdAt: now,
      }));
      setParticles(prev => [...prev, ...newParticles].slice(-60));
    }, []);

    useImperativeHandle(ref, () => ({ spawn }), [spawn]);

    // Clean up expired particles
    useEffect(() => {
      if (particles.length === 0) return;
      const id = setInterval(() => {
        const now = Date.now();
        setParticles(prev => prev.filter(p => now - p.createdAt < p.lifetime));
      }, 200);
      return () => clearInterval(id);
    }, [particles.length]);

    // Seasonal ambient particles
    useEffect(() => {
      const emojis = SEASON_EMOJIS[season] || SEASON_EMOJIS.spring;
      const interval = setInterval(() => {
        setSeasonals(prev => {
          const filtered = prev.slice(-18);
          const emoji = emojis[Math.floor(Math.random() * emojis.length)];
          return [...filtered, {
            id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            emoji,
            startX: Math.random() * 100,
            duration: 8 + Math.random() * 6,
            delay: 0,
            size: 12 + Math.random() * 8,
            wobble: Math.random() * 30 - 15,
          }];
        });
      }, 800);
      return () => clearInterval(interval);
    }, [season]);

    // Clean seasonal after animation
    useEffect(() => {
      if (seasonals.length === 0) return;
      const id = setInterval(() => {
        setSeasonals(prev => prev.slice(-20));
      }, 5000);
      return () => clearInterval(id);
    }, [seasonals.length]);

    return (
      <div className="particle-layer">
        {/* Event particles */}
        {particles.map(p => (
          <span
            key={p.id}
            className={`particle ${p.bold ? 'particle-bold' : ''}`}
            style={{
              left: p.x,
              top: p.y,
              fontSize: p.size,
              '--lifetime': `${p.lifetime}ms`,
            } as React.CSSProperties}
          >
            {p.text}
          </span>
        ))}

        {/* Seasonal falling particles */}
        {seasonals.map(s => (
          <span
            key={s.id}
            className="seasonal-particle"
            style={{
              left: `${s.startX}%`,
              fontSize: s.size,
              '--fall-duration': `${s.duration}s`,
              '--wobble': `${s.wobble}px`,
            } as React.CSSProperties}
          >
            {s.emoji}
          </span>
        ))}
      </div>
    );
  }
);
