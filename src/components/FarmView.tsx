import { useState, useCallback, useEffect, useMemo } from 'react';
import { useGame } from '../state/GameContext';
import { ANIMALS } from '../constants/animals';
import { getPerPlotUnlockInfo } from '../engine/economy';
import { PlotCell } from './PlotCell';
import { AnimalCard, groupAnimals } from './AnimalCard';
import { showToast } from './Toast';

interface FarmViewProps {
  onPlotClick: (plotIndex: number) => void;
  onAnimalClick: (animalIndex: number) => void;
  onOpenShop?: () => void;
}

export function FarmView({ onPlotClick, onAnimalClick, onOpenShop }: FarmViewProps) {
  const { state, dispatch } = useGame();
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
          (s.feedsLeft ?? 0) > 0 &&
          (now - s.lastCollectedAt) / 1000 >= effectiveTime,
      );
      if (readySlotIdx !== -1) {
        onAnimalClick(readySlotIdx);
      }
    },
    [groups, now, state.feedActiveUntil, state.animals, onAnimalClick],
  );

  const handleFeedGroup = useCallback(
    (groupIndex: number) => {
      const group = groups[groupIndex];
      if (!group) return;
      const animal = ANIMALS[group.animalId];
      const have = state.inventory[animal.feedCrop] ?? 0;
      if (have < 1) {
        showToast(`Потрібно ${animal.feedCrop === 'corn' ? '🌽' : animal.feedCrop === 'carrot' ? '🥕' : animal.feedCrop === 'sunflower' ? '🌻' : '🌾'} для годування!`, 'info');
        return;
      }
      // Feed the first hungry animal in this group
      const hungryIdx = state.animals.findIndex(
        (s) => s.animalId === group.animalId && (s.feedsLeft ?? 0) <= 0,
      );
      if (hungryIdx !== -1) {
        dispatch({ type: 'FEED_ANIMAL', animalIndex: hungryIdx });
        showToast(`${animal.emoji} нагодовано!`, 'earn');
      }
    },
    [groups, state.inventory, state.animals, dispatch],
  );

  const handleFeedAll = useCallback(() => {
    const hungryCount = state.animals.filter((s) => (s.feedsLeft ?? 0) <= 0).length;
    if (hungryCount === 0) {
      showToast('Всі тварини ситі! 😊', 'info');
      return;
    }
    dispatch({ type: 'FEED_ALL_ANIMALS' });
    showToast(`🌾 Нагодовано тварин!`, 'earn');
  }, [state.animals, dispatch]);

  const hasHungryAnimals = state.animals.some((s) => (s.feedsLeft ?? 0) <= 0);

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
        <div className="animal-pen-label">
          Тварини
          {hasHungryAnimals && (
            <button
              type="button"
              className="btn btn-buy"
              style={{ fontSize: '11px', padding: '2px 8px', marginLeft: '8px' }}
              onClick={handleFeedAll}
            >
              🌾 Годувати всіх
            </button>
          )}
        </div>
        <div className="animal-grid">
          {groups.map((group, i) => (
            <AnimalCard
              key={group.animalId}
              group={group}
              now={now}
              feedActiveUntil={state.feedActiveUntil}
              season={state.season}
              onClick={() => handleAnimalClick(i)}
              onFeed={() => handleFeedGroup(i)}
              canFeed={(state.inventory[ANIMALS[group.animalId].feedCrop] ?? 0) > 0}
            />
          ))}
          {state.animals.length < (state.maxAnimals ?? 16) && (
            <button
              type="button"
              className="animal-card animal-add-btn"
              onClick={onOpenShop}
              aria-label="Купити тварину"
            >
              <span className="animal-add-plus">+</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
