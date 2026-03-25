import { memo, useMemo } from 'react';
import type { AnimalSlot } from '../types';
import { ANIMALS } from '../constants/animals';
import { CROPS } from '../constants/crops';

export interface AnimalGroup {
  animalId: AnimalSlot['animalId'];
  count: number;
  readyCount: number;
  hungryCount: number;
  totalFeedsLeft: number;
  slots: AnimalSlot[];
}

interface AnimalCardProps {
  group: AnimalGroup;
  now: number;
  feedActiveUntil: number;
  season?: string;
  onClick: () => void;
  onFeed?: () => void;
  canFeed?: boolean;
}

export function groupAnimals(animals: AnimalSlot[], now: number, feedActiveUntil = 0): AnimalGroup[] {
  const map = new Map<string, AnimalGroup>();
  const isFeedActive = now < feedActiveUntil;
  for (const slot of animals) {
    let group = map.get(slot.animalId);
    if (!group) {
      group = { animalId: slot.animalId, count: 0, readyCount: 0, hungryCount: 0, totalFeedsLeft: 0, slots: [] };
      map.set(slot.animalId, group);
    }
    group.count++;
    group.slots.push(slot);
    group.totalFeedsLeft += (slot.feedsLeft ?? 0);
    if ((slot.feedsLeft ?? 0) <= 0) {
      group.hungryCount++;
    } else {
      const animal = ANIMALS[slot.animalId];
      const effectiveTime = isFeedActive ? animal.productionTime * 0.5 : animal.productionTime;
      if ((now - slot.lastCollectedAt) / 1000 >= effectiveTime) {
        group.readyCount++;
      }
    }
  }
  return Array.from(map.values());
}

export const AnimalCard = memo(function AnimalCard({
  group, now, feedActiveUntil, season, onClick, onFeed,
}: AnimalCardProps) {
  const animal = ANIMALS[group.animalId];
  const isReady = group.readyCount > 0;
  const allHungry = group.hungryCount === group.count;
  const isSummer = season === 'summer';
  const feedCropDef = CROPS[animal.feedCrop as keyof typeof CROPS];
  const feedEmoji = feedCropDef?.emoji ?? '🌾';

  const progressInfo = useMemo(() => {
    if (isReady || allHungry) return null;
    const isFeedActive = now < feedActiveUntil;
    const effectiveTime = isFeedActive ? animal.productionTime * 0.5 : animal.productionTime;
    let minRemaining = Infinity;
    let totalProgress = 0;
    let countActive = 0;
    for (const slot of group.slots) {
      if ((slot.feedsLeft ?? 0) <= 0) continue; // skip hungry
      countActive++;
      const elapsed = (now - slot.lastCollectedAt) / 1000;
      totalProgress += Math.min(1, elapsed / effectiveTime);
      const rem = Math.max(0, effectiveTime - elapsed);
      if (rem < minRemaining) minRemaining = rem;
    }
    if (countActive === 0) return null;
    const avg = totalProgress / countActive;
    const mins = Math.floor(minRemaining / 60);
    const secs = Math.floor(minRemaining % 60);
    const timeStr = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}с`;
    return { avg, timeStr };
  }, [isReady, allHungry, now, feedActiveUntil, animal, group]);

  const ariaLabel = allHungry
    ? `${animal.name} — голодні! Потрібно ${feedEmoji}`
    : isReady
    ? `${animal.name} — ${group.readyCount} готово, натисніть щоб зібрати`
    : `${animal.name}${group.count > 1 ? ` ×${group.count}` : ''}`;

  const hasHungry = group.hungryCount > 0;
  const canInteract = isReady || hasHungry;

  const handleClick = () => {
    if (isReady) {
      onClick();
    } else if (hasHungry && onFeed) {
      onFeed();
    }
  };

  return (
    <button
      type="button"
      className={`animal-card ${isReady ? 'animal-ready' : ''} ${allHungry ? 'animal-hungry' : ''} ${hasHungry && !allHungry ? 'animal-partial-hungry' : ''}`}
      onClick={handleClick}
      disabled={!canInteract}
      aria-label={ariaLabel}
      style={{ cursor: canInteract ? 'pointer' : 'default' }}
    >
      <div className="animal-left">
        <div className={`animal-emoji-disc ${isReady ? 'disc-ready' : ''} ${allHungry ? 'disc-hungry' : ''}`}>
          <span className={`animal-emoji ${isReady ? 'animal-bounce' : ''}`}>
            {animal.emoji}
          </span>
        </div>
        {group.count > 1 && (
          <span className="animal-count">×{group.count}</span>
        )}
      </div>
      <div className="animal-right">
        {allHungry ? (
          <div className="animal-hungry-pill">
            {feedEmoji} Голодні!
          </div>
        ) : hasHungry && !isReady ? (
          <div className="animal-hungry-pill" style={{ opacity: 0.8 }}>
            {feedEmoji} {group.hungryCount}/{group.count} голодні
          </div>
        ) : isReady ? (
          <div className="animal-collect-pill">
            {animal.productEmoji} {isSummer ? '×2 ' : ''}+{animal.productSellPrice * group.readyCount * (isSummer ? 2 : 1)}💰
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
        {/* Feed indicator */}
        <span className={`animal-feed-indicator ${group.totalFeedsLeft <= group.count ? 'feed-low' : ''}`}>
          {feedEmoji}{group.totalFeedsLeft}
        </span>
      </div>
    </button>
  );
});
