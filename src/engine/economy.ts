import { UNLOCK_COST_BASE, UNLOCK_COST_MULTIPLIER, INITIAL_UNLOCKED } from '../constants/grid';
import type { PlotState } from '../types';

export function getUnlockCost(plots: PlotState[]): number {
  const unlockedCount = plots.filter((p) => p.status !== 'locked').length;
  const timesUnlocked = Math.max(0, unlockedCount - INITIAL_UNLOCKED);
  return Math.floor(UNLOCK_COST_BASE * Math.pow(UNLOCK_COST_MULTIPLIER, timesUnlocked));
}

/** Level required to unlock the next plot (increases every 2-3 plots unlocked) */
export function getUnlockLevel(plots: PlotState[]): number {
  const unlockedCount = plots.filter((p) => p.status !== 'locked').length;
  const timesUnlocked = Math.max(0, unlockedCount - INITIAL_UNLOCKED);
  // First 2 extra plots: level 2, next 2: level 3, etc.
  return Math.max(1, 2 + Math.floor(timesUnlocked / 2));
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
