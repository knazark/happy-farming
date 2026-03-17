import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
  y: number;
}

let nextEffectId = 0;

export function useHarvestEffect() {
  const [effects, setEffects] = useState<FloatingEmoji[]>([]);

  const spawnEffect = useCallback((emoji: string, event: React.MouseEvent | { clientX: number; clientY: number }) => {
    const id = nextEffectId++;
    const x = event.clientX;
    const y = event.clientY;
    setEffects((prev) => [...prev, { id, emoji, x, y }]);
    setTimeout(() => {
      setEffects((prev) => prev.filter((e) => e.id !== id));
    }, 700);
  }, []);

  return { effects, spawnEffect };
}

export function HarvestEffectLayer({ effects }: { effects: FloatingEmoji[] }) {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 150 }}>
      <AnimatePresence>
        {effects.map((e) => (
          <motion.div
            key={e.id}
            initial={{ x: e.x - 20, y: e.y - 20, scale: 1, opacity: 1 }}
            animate={{ y: e.y - 100, scale: 1.6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              fontSize: '36px',
              filter: 'drop-shadow(0 2px 8px rgba(255,107,53,0.5))',
            }}
          >
            {e.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
