import { useEffect, useState } from 'react';
import '../styles/rainbow.css';

interface RainbowAnimationProps {
  onComplete: () => void;
}

export function RainbowAnimation({ onComplete }: RainbowAnimationProps) {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 100);
    const t2 = setTimeout(() => setPhase('exit'), 3500);
    const t3 = setTimeout(onComplete, 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div className={`rainbow-overlay rainbow-${phase}`} onClick={onComplete}>
      <div className="rainbow-arc" />
      <div className="rainbow-sparkles">
        {Array.from({ length: 20 }).map((_, i) => (
          <span
            key={i}
            className="rainbow-sparkle"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 60}%`,
              animationDelay: `${Math.random() * 2}s`,
              fontSize: `${14 + Math.random() * 20}px`,
            }}
          >
            {['✨', '🌟', '⭐', '💫', '🌈'][i % 5]}
          </span>
        ))}
      </div>
      <div className="rainbow-text">
        <div className="rainbow-emoji">🌈</div>
        <div className="rainbow-title">Веселка!</div>
        <div className="rainbow-subtitle">+500 монет 💰</div>
      </div>
    </div>
  );
}
