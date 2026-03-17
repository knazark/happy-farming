import { useState, useCallback, useEffect, useMemo } from 'react';
import { useGame } from '../state/GameContext';
import { ANIMALS } from '../constants/animals';
import { getPerPlotUnlockInfo } from '../engine/economy';
import { PlotCell } from './PlotCell';
import { AnimalCard, groupAnimals } from './AnimalCard';

interface FarmViewProps {
  onPlotClick: (plotIndex: number) => void;
  onAnimalClick: (animalIndex: number) => void;
}

export function FarmView({ onPlotClick, onAnimalClick }: FarmViewProps) {
  const { state } = useGame();
  const [hoveredPlot, setHoveredPlot] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  // Update time for animations at ~4fps (enough for timers)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const unlockMap = useMemo(
    () => getPerPlotUnlockInfo(state.plots, state.level, state.coins),
    [state.plots, state.level, state.coins],
  );

  const groups = useMemo(
    () => groupAnimals(state.animals, now, state.feedActiveUntil),
    [state.animals, now, state.feedActiveUntil],
  );



  const handleAnimalClick = useCallback(
    (groupIndex: number) => {
      const group = groups[groupIndex];
      if (!group || group.readyCount === 0) return;
      const animal = ANIMALS[group.animalId];
      const isFeedActive = now < state.feedActiveUntil;
      const effectiveTime = isFeedActive ? animal.productionTime * 0.5 : animal.productionTime;
      const readySlotIdx = state.animals.findIndex(
        (s) =>
          s.animalId === group.animalId &&
          (now - s.lastCollectedAt) / 1000 >= effectiveTime,
      );
      if (readySlotIdx !== -1) {
        onAnimalClick(readySlotIdx);
      }
    },
    [groups, now, state.feedActiveUntil, state.animals, onAnimalClick],
  );

  return (
    <div className="farm-view">
      {/* Plot grid */}
      <div className="farm-grid">
        {state.plots.map((plot, i) => (
          <PlotCell
            key={i}
            plot={plot}
            index={i}
            now={now}
            unlockInfo={unlockMap.get(i)}
            isHovered={hoveredPlot === i}

            onClick={() => onPlotClick(i)}
            onMouseEnter={() => setHoveredPlot(i)}
            onMouseLeave={() => setHoveredPlot(null)}
          />
        ))}
      </div>

      {/* Animal pen */}
      <div className="animal-pen">
        <div className="animal-pen-label">🐾 Тварини</div>
        {state.animals.length === 0 ? (
          <div className="animal-pen-empty">Купіть тварину на ринку</div>
        ) : (
          <div className="animal-grid">
            {groups.map((group, i) => (
              <AnimalCard
                key={group.animalId}
                group={group}
                now={now}
                feedActiveUntil={state.feedActiveUntil}
                onClick={() => handleAnimalClick(i)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
