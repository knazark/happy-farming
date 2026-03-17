import { UNLOCK_COST_BASE, UNLOCK_COST_MULTIPLIER, INITIAL_UNLOCKED } from '../constants/grid';
import type { PlotState, AnimalSlot, AnimalId } from '../types';
import { ANIMALS } from '../constants/animals';

export function getUnlockCost(plots: PlotState[], plotIndex?: number): number {
  const unlockedCount = plots.filter((p) => p.status !== 'locked').length;
  const baseTimesUnlocked = Math.max(0, unlockedCount - INITIAL_UNLOCKED);
  const offset = plotIndex != null ? getLockedOffset(plots, plotIndex) : 0;
  return Math.floor(UNLOCK_COST_BASE * Math.pow(UNLOCK_COST_MULTIPLIER, baseTimesUnlocked + offset));
}

/** Level required to unlock the next plot (increases every 2-3 plots unlocked) */
export function getUnlockLevel(plots: PlotState[], plotIndex?: number): number {
  const unlockedCount = plots.filter((p) => p.status !== 'locked').length;
  const baseTimesUnlocked = Math.max(0, unlockedCount - INITIAL_UNLOCKED);
  const offset = plotIndex != null ? getLockedOffset(plots, plotIndex) : 0;
  const t = baseTimesUnlocked + offset;
  // First 2 extra plots: level 2, next 2: level 3, etc.
  return Math.max(1, 2 + Math.floor(t / 2));
}

/** Price for an animal scales ×2 for each one of the same type already owned */
export function getAnimalPrice(animalId: AnimalId, animals: AnimalSlot[]): number {
  const base = ANIMALS[animalId].buyPrice;
  const owned = animals.filter((a) => a.animalId === animalId).length;
  return owned === 0 ? base : base * Math.pow(2, owned);
}

/** How many locked plots come before this one (0-based offset among locked plots) */
function getLockedOffset(plots: PlotState[], plotIndex: number): number {
  let offset = 0;
  for (let i = 0; i < plotIndex; i++) {
    if (plots[i].status === 'locked') offset++;
  }
  return offset;
}

/** Calculate per-plot unlock costs for all locked plots (each subsequent one is more expensive) */
export function getPerPlotUnlockInfo(plots: PlotState[], playerLevel: number, playerCoins: number): Map<number, { cost: number; level: number; playerLevel: number; playerCoins: number }> {
  const unlockedCount = plots.filter((p) => p.status !== 'locked').length;
  const baseTimesUnlocked = Math.max(0, unlockedCount - INITIAL_UNLOCKED);
  const result = new Map<number, { cost: number; level: number; playerLevel: number; playerCoins: number }>();

  let offset = 0;
  for (let i = 0; i < plots.length; i++) {
    if (plots[i].status === 'locked') {
      const t = baseTimesUnlocked + offset;
      result.set(i, {
        cost: Math.floor(UNLOCK_COST_BASE * Math.pow(UNLOCK_COST_MULTIPLIER, t)),
        level: Math.max(1, 2 + Math.floor(t / 2)),
        playerLevel,
        playerCoins,
      });
      offset++;
    }
  }
  return result;
}
