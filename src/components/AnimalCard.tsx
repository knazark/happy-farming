import { memo, useMemo } from 'react';
import type { AnimalSlot } from '../types';
import { ANIMALS } from '../constants/animals';

export interface AnimalGroup {
  animalId: AnimalSlot['animalId'];
  count: number;
  readyCount: number;
  slots: AnimalSlot[];
}

interface AnimalCardProps {
  group: AnimalGroup;
  now: number;
  feedActiveUntil: number;
  onClick: () => void;
}

export function groupAnimals(animals: AnimalSlot[], now: number, feedActiveUntil = 0): AnimalGroup[] {
  const map = new Map<string, AnimalGroup>();
  const isFeedActive = now < feedActiveUntil;
  for (const slot of animals) {
    let group = map.get(slot.animalId);
    if (!group) {
      group = { animalId: slot.animalId, count: 0, readyCount: 0, slots: [] };
      map.set(slot.animalId, group);
    }
    group.count++;
    group.slots.push(slot);
    const animal = ANIMALS[slot.animalId];
    const effectiveTime = isFeedActive ? animal.productionTime * 0.5 : animal.productionTime;
    if ((now - slot.lastCollectedAt) / 1000 >= effectiveTime) {
      group.readyCount++;
    }
  }
  return Array.from(map.values());
}

export const AnimalCard = memo(function AnimalCard({
  group, now, feedActiveUntil, onClick,
}: AnimalCardProps) {
  const animal = ANIMALS[group.animalId];
  const isReady = group.readyCount > 0;

  const progressInfo = useMemo(() => {
    if (isReady) return null;
    const isFeedActive = now < feedActiveUntil;
    const effectiveTime = isFeedActive ? animal.productionTime * 0.5 : animal.productionTime;
    let minRemaining = Infinity;
    let totalProgress = 0;
    for (const slot of group.slots) {
      const elapsed = (now - slot.lastCollectedAt) / 1000;
      totalProgress += Math.min(1, elapsed / effectiveTime);
      const rem = Math.max(0, effectiveTime - elapsed);
      if (rem < minRemaining) minRemaining = rem;
    }
    const avg = totalProgress / group.count;
    const mins = Math.floor(minRemaining / 60);
    const secs = Math.floor(minRemaining % 60);
    const timeStr = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}с`;
    return { avg, timeStr };
  }, [isReady, now, feedActiveUntil, animal, group]);

  return (
    <div
      className={`animal-card ${isReady ? 'animal-ready' : ''}`}
      onClick={isReady ? onClick : undefined}
      style={{ cursor: isReady ? 'pointer' : 'default' }}
    >
      <div className="animal-left">
        <div className={`animal-emoji-disc ${isReady ? 'disc-ready' : ''}`}>
          <span className={`animal-emoji ${isReady ? 'animal-bounce' : ''}`}>
            {animal.emoji}
          </span>
        </div>
        {group.count > 1 && (
          <span className="animal-count">×{group.count}</span>
        )}
      </div>
      <div className="animal-right">
        {isReady ? (
          <div className="animal-collect-pill">
            {animal.productEmoji} +{animal.productSellPrice * group.readyCount}💰
          </div>
        ) : progressInfo && (
          <>
            <span className="animal-timer">
              {animal.productEmoji} {progressInfo.timeStr}
            </span>
            <div className="animal-progress-bar">
              <div
                className="animal-progress-fill"
                style={{ width: `${Math.min(100, progressInfo.avg * 100)}%` }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
});
