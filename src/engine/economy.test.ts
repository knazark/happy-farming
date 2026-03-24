import { describe, it, expect } from 'vitest';
import { getUnlockCost, getUnlockLevel, getAnimalPrice, getPerPlotUnlockInfo } from './economy';
import { UNLOCK_COST_BASE, UNLOCK_COST_MULTIPLIER, INITIAL_UNLOCKED } from '../constants/grid';
import { ANIMALS } from '../constants/animals';
import type { PlotState, AnimalSlot } from '../types';

function makePlots(unlocked: number, locked: number): PlotState[] {
  const plots: PlotState[] = [];
  for (let i = 0; i < unlocked; i++) plots.push({ status: 'empty' });
  for (let i = 0; i < locked; i++) plots.push({ status: 'locked' });
  return plots;
}

describe('getUnlockCost', () => {
  it('returns base cost when only initial plots are unlocked (no plotIndex)', () => {
    const plots = makePlots(INITIAL_UNLOCKED, 5);
    const cost = getUnlockCost(plots);
    expect(cost).toBe(Math.floor(UNLOCK_COST_BASE * Math.pow(UNLOCK_COST_MULTIPLIER, 0)));
    expect(cost).toBe(UNLOCK_COST_BASE);
  });

  it('scales cost with number of unlocked plots beyond initial', () => {
    const plots = makePlots(INITIAL_UNLOCKED + 3, 5);
    const cost = getUnlockCost(plots);
    expect(cost).toBe(Math.floor(UNLOCK_COST_BASE * Math.pow(UNLOCK_COST_MULTIPLIER, 3)));
  });

  it('accounts for plotIndex offset (locked plots before the target)', () => {
    // [empty, locked, locked, locked]
    const plots: PlotState[] = [
      { status: 'empty' },
      { status: 'locked' },
      { status: 'locked' },
      { status: 'locked' },
    ];
    // plotIndex=2 means there's 1 locked plot before it (index 1)
    const costAt2 = getUnlockCost(plots, 2);
    const costAt1 = getUnlockCost(plots, 1);
    expect(costAt2).toBeGreaterThan(costAt1);
  });

  it('returns base cost for first locked plot when no extras unlocked', () => {
    const plots = makePlots(INITIAL_UNLOCKED, 3);
    // First locked plot is at index INITIAL_UNLOCKED, offset = 0
    const cost = getUnlockCost(plots, INITIAL_UNLOCKED);
    expect(cost).toBe(UNLOCK_COST_BASE);
  });

  it('handles all plots unlocked', () => {
    const plots = makePlots(20, 0);
    const cost = getUnlockCost(plots);
    const expected = Math.floor(UNLOCK_COST_BASE * Math.pow(UNLOCK_COST_MULTIPLIER, 20 - INITIAL_UNLOCKED));
    expect(cost).toBe(expected);
  });

  it('handles fewer unlocked than INITIAL_UNLOCKED', () => {
    const plots = makePlots(3, 5);
    const cost = getUnlockCost(plots);
    // baseTimesUnlocked = max(0, 3 - INITIAL_UNLOCKED) = 0
    expect(cost).toBe(UNLOCK_COST_BASE);
  });
});

describe('getUnlockLevel', () => {
  it('returns level 2 with no extra unlocks', () => {
    const plots = makePlots(INITIAL_UNLOCKED, 5);
    expect(getUnlockLevel(plots)).toBe(2);
  });

  it('increases required level every 2 extra unlocks', () => {
    // t=0 -> level 2, t=1 -> level 2, t=2 -> level 3, t=3 -> level 3, t=4 -> level 4
    const plots0 = makePlots(INITIAL_UNLOCKED, 5);
    expect(getUnlockLevel(plots0)).toBe(2);

    const plots2 = makePlots(INITIAL_UNLOCKED + 2, 5);
    expect(getUnlockLevel(plots2)).toBe(3);

    const plots4 = makePlots(INITIAL_UNLOCKED + 4, 5);
    expect(getUnlockLevel(plots4)).toBe(4);
  });

  it('accounts for plotIndex offset', () => {
    // 2 locked plots before target
    const plots: PlotState[] = [
      { status: 'locked' },
      { status: 'locked' },
      { status: 'locked' },
    ];
    const levelAt0 = getUnlockLevel(plots, 0);
    const levelAt2 = getUnlockLevel(plots, 2);
    expect(levelAt2).toBeGreaterThanOrEqual(levelAt0);
  });

  it('returns at least 1', () => {
    const plots = makePlots(1, 0);
    expect(getUnlockLevel(plots)).toBeGreaterThanOrEqual(1);
  });
});

describe('getAnimalPrice', () => {
  it('returns base price when none owned', () => {
    const price = getAnimalPrice('chicken', []);
    expect(price).toBe(ANIMALS.chicken.buyPrice);
  });

  it('doubles price for each existing animal of same type', () => {
    const animals: AnimalSlot[] = [
      { animalId: 'chicken', feedsLeft: 5, lastCollectedAt: 0 },
    ];
    const price = getAnimalPrice('chicken', animals);
    expect(price).toBe(ANIMALS.chicken.buyPrice * 2);
  });

  it('quadruples for 2 owned', () => {
    const animals: AnimalSlot[] = [
      { animalId: 'chicken', feedsLeft: 5, lastCollectedAt: 0 },
      { animalId: 'chicken', feedsLeft: 5, lastCollectedAt: 0 },
    ];
    const price = getAnimalPrice('chicken', animals);
    expect(price).toBe(ANIMALS.chicken.buyPrice * 4);
  });

  it('is not affected by other animal types', () => {
    const animals: AnimalSlot[] = [
      { animalId: 'cow', feedsLeft: 5, lastCollectedAt: 0 },
      { animalId: 'pig', feedsLeft: 5, lastCollectedAt: 0 },
    ];
    const price = getAnimalPrice('chicken', animals);
    expect(price).toBe(ANIMALS.chicken.buyPrice);
  });

  it('works for expensive animals', () => {
    const animals: AnimalSlot[] = [
      { animalId: 'horse', feedsLeft: 5, lastCollectedAt: 0 },
    ];
    const price = getAnimalPrice('horse', animals);
    expect(price).toBe(ANIMALS.horse.buyPrice * 2);
  });
});

describe('getPerPlotUnlockInfo', () => {
  it('returns empty map when no plots are locked', () => {
    const plots = makePlots(10, 0);
    const info = getPerPlotUnlockInfo(plots, 5, 1000);
    expect(info.size).toBe(0);
  });

  it('returns info for each locked plot', () => {
    const plots = makePlots(INITIAL_UNLOCKED, 3);
    const info = getPerPlotUnlockInfo(plots, 5, 1000);
    expect(info.size).toBe(3);
  });

  it('first locked plot has base cost', () => {
    const plots = makePlots(INITIAL_UNLOCKED, 3);
    const info = getPerPlotUnlockInfo(plots, 5, 1000);
    const first = info.get(INITIAL_UNLOCKED);
    expect(first).toBeDefined();
    expect(first!.cost).toBe(UNLOCK_COST_BASE);
  });

  it('costs increase for subsequent locked plots', () => {
    const plots = makePlots(INITIAL_UNLOCKED, 3);
    const info = getPerPlotUnlockInfo(plots, 5, 1000);
    const costs = Array.from(info.values()).map((v) => v.cost);
    for (let i = 1; i < costs.length; i++) {
      expect(costs[i]).toBeGreaterThan(costs[i - 1]);
    }
  });

  it('passes playerLevel and playerCoins through', () => {
    const plots = makePlots(INITIAL_UNLOCKED, 2);
    const info = getPerPlotUnlockInfo(plots, 7, 999);
    for (const v of info.values()) {
      expect(v.playerLevel).toBe(7);
      expect(v.playerCoins).toBe(999);
    }
  });

  it('level requirement increases for later locked plots', () => {
    const plots = makePlots(INITIAL_UNLOCKED, 5);
    const info = getPerPlotUnlockInfo(plots, 5, 1000);
    const levels = Array.from(info.values()).map((v) => v.level);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1]);
    }
  });
});
