import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tick } from './gameLoop';
import { createInitialState } from '../state/gameReducer';
import { CROPS } from '../constants/crops';
import { ANIMALS } from '../constants/animals';
import { SEASON_DURATION, SEASON_ORDER } from '../constants/seasons';
import { MARKET_UPDATE_INTERVAL } from '../constants/recipes';
import type { GameState, PlotState, NpcOrder } from '../types';

function makeState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState(), ...overrides };
}

const NOW = 1700000000000;

describe('tick — plot growth', () => {
  it('transitions growing plot to ready when elapsed >= growthTime', () => {
    const plantedAt = NOW - 61 * 1000; // 61 seconds ago
    const state = makeState({
      lastTickAt: NOW - 1000,
      plots: [
        { status: 'growing', cropId: 'wheat', plantedAt, growthTime: 60 },
        ...Array(23).fill({ status: 'locked' }),
      ] as PlotState[],
    });

    const result = tick(state, NOW);
    expect(result.plots[0].status).toBe('ready');
    if (result.plots[0].status === 'ready') {
      expect(result.plots[0].cropId).toBe('wheat');
    }
  });

  it('does not transition growing plot before growthTime', () => {
    const plantedAt = NOW - 30 * 1000; // only 30 seconds
    const state = makeState({
      lastTickAt: NOW - 1000,
      plots: [
        { status: 'growing', cropId: 'wheat', plantedAt, growthTime: 60 },
        ...Array(23).fill({ status: 'locked' }),
      ] as PlotState[],
    });

    const result = tick(state, NOW);
    expect(result.plots[0].status).toBe('growing');
  });

  it('preserves soilLevel and soilHarvestsLeft on ready transition', () => {
    const plantedAt = NOW - 100 * 1000;
    const state = makeState({
      lastTickAt: NOW - 1000,
      plots: [
        { status: 'growing', cropId: 'wheat', plantedAt, growthTime: 60, soilLevel: 2, soilHarvestsLeft: 15 },
        ...Array(23).fill({ status: 'locked' }),
      ] as PlotState[],
    });

    const result = tick(state, NOW);
    const plot = result.plots[0];
    expect(plot.status).toBe('ready');
    if (plot.status === 'ready') {
      expect(plot.soilLevel).toBe(2);
      expect(plot.soilHarvestsLeft).toBe(15);
    }
  });

  it('preserves autoCropId on ready transition', () => {
    const plantedAt = NOW - 100 * 1000;
    const state = makeState({
      lastTickAt: NOW - 1000,
      plots: [
        { status: 'growing', cropId: 'wheat', plantedAt, growthTime: 60, autoCropId: 'wheat' } as PlotState,
        ...Array(23).fill({ status: 'locked' }),
      ] as PlotState[],
    });

    const result = tick(state, NOW);
    expect((result.plots[0] as any).autoCropId).toBe('wheat');
  });
});

describe('tick — wood gathering', () => {
  it('transitions gathering_wood to wood_ready when time elapsed', () => {
    const startedAt = NOW - 50 * 1000;
    const state = makeState({
      lastTickAt: NOW - 1000,
      plots: [
        { status: 'gathering_wood', startedAt, gatherTime: 45 },
        ...Array(23).fill({ status: 'locked' }),
      ] as PlotState[],
    });

    const result = tick(state, NOW);
    expect(result.plots[0].status).toBe('wood_ready');
  });

  it('does not transition gathering_wood before gatherTime', () => {
    const startedAt = NOW - 20 * 1000;
    const state = makeState({
      lastTickAt: NOW - 1000,
      plots: [
        { status: 'gathering_wood', startedAt, gatherTime: 45 },
        ...Array(23).fill({ status: 'locked' }),
      ] as PlotState[],
    });

    const result = tick(state, NOW);
    expect(result.plots[0].status).toBe('gathering_wood');
  });
});

describe('tick — tractor auto-harvest', () => {
  it('harvests all ready crops when hasTractor is true', () => {
    const state = makeState({
      lastTickAt: NOW - 1000,
      hasTractor: true,
      plots: [
        { status: 'ready', cropId: 'wheat' },
        { status: 'ready', cropId: 'carrot' },
        { status: 'empty' },
        ...Array(21).fill({ status: 'locked' }),
      ] as PlotState[],
    });

    const result = tick(state, NOW);
    // Both plots should now be empty
    expect(result.plots[0].status).toBe('empty');
    expect(result.plots[1].status).toBe('empty');
    // Inventory should have the crops
    expect(result.inventory.wheat).toBe(1);
    expect(result.inventory.carrot).toBe(1);
    // totalEarned should increase
    expect(result.totalEarned).toBe(CROPS.wheat.sellPrice + CROPS.carrot.sellPrice);
    expect(result.totalHarvested).toBe(2);
  });

  it('does nothing when hasTractor is false', () => {
    const state = makeState({
      lastTickAt: NOW - 1000,
      hasTractor: false,
      plots: [
        { status: 'ready', cropId: 'wheat' },
        ...Array(23).fill({ status: 'locked' }),
      ] as PlotState[],
    });

    const result = tick(state, NOW);
    expect(result.plots[0].status).toBe('ready');
  });

  it('decrements soil harvests on tractor harvest', () => {
    const state = makeState({
      lastTickAt: NOW - 1000,
      hasTractor: true,
      plots: [
        { status: 'ready', cropId: 'wheat', soilLevel: 1, soilHarvestsLeft: 2 },
        ...Array(23).fill({ status: 'locked' }),
      ] as PlotState[],
    });

    const result = tick(state, NOW);
    const plot = result.plots[0];
    expect(plot.status).toBe('empty');
    if (plot.status === 'empty') {
      expect(plot.soilLevel).toBe(1);
      expect(plot.soilHarvestsLeft).toBe(1);
    }
  });

  it('clears soil when harvests depleted by tractor', () => {
    const state = makeState({
      lastTickAt: NOW - 1000,
      hasTractor: true,
      plots: [
        { status: 'ready', cropId: 'wheat', soilLevel: 1, soilHarvestsLeft: 1 },
        ...Array(23).fill({ status: 'locked' }),
      ] as PlotState[],
    });

    const result = tick(state, NOW);
    const plot = result.plots[0];
    if (plot.status === 'empty') {
      expect(plot.soilLevel).toBeUndefined();
      expect(plot.soilHarvestsLeft).toBeUndefined();
    }
  });

  it('preserves autoCropId through tractor harvest', () => {
    const state = makeState({
      lastTickAt: NOW - 1000,
      hasTractor: true,
      plots: [
        { status: 'ready', cropId: 'wheat', autoCropId: 'wheat' } as PlotState,
        ...Array(23).fill({ status: 'locked' }),
      ] as PlotState[],
    });

    const result = tick(state, NOW);
    expect((result.plots[0] as any).autoCropId).toBe('wheat');
  });
});

describe('tick — auto-collector', () => {
  it('collects animal products when production time elapsed', () => {
    const lastCollectedAt = NOW - (ANIMALS.chicken.productionTime + 1) * 1000;
    const state = makeState({
      lastTickAt: NOW - 1000,
      hasAutoCollector: true,
      feedActiveUntil: 0,
      animals: [{ animalId: 'chicken', lastCollectedAt }],
    });

    const result = tick(state, NOW);
    expect(result.animals[0].lastCollectedAt).toBe(NOW);
    expect(result.inventory.chicken_product).toBe(1);
  });

  it('does not collect when production time has not elapsed', () => {
    const lastCollectedAt = NOW - 10 * 1000; // only 10 seconds
    const state = makeState({
      lastTickAt: NOW - 1000,
      hasAutoCollector: true,
      feedActiveUntil: 0,
      animals: [{ animalId: 'chicken', lastCollectedAt }],
    });

    const result = tick(state, NOW);
    expect(result.animals[0].lastCollectedAt).toBe(lastCollectedAt);
    expect(result.inventory.chicken_product).toBeUndefined();
  });

  it('does nothing when hasAutoCollector is false', () => {
    const lastCollectedAt = NOW - (ANIMALS.chicken.productionTime + 1) * 1000;
    const state = makeState({
      lastTickAt: NOW - 1000,
      hasAutoCollector: false,
      feedActiveUntil: 0,
      animals: [{ animalId: 'chicken', lastCollectedAt }],
    });

    const result = tick(state, NOW);
    expect(result.animals[0].lastCollectedAt).toBe(lastCollectedAt);
  });

  it('respects feed active (halves production time)', () => {
    // Feed active: production time is halved
    const halfTime = ANIMALS.chicken.productionTime * 0.5;
    const lastCollectedAt = NOW - (halfTime + 1) * 1000;
    const state = makeState({
      lastTickAt: NOW - 1000,
      hasAutoCollector: true,
      feedActiveUntil: NOW + 60000, // feed still active
      animals: [{ animalId: 'chicken', lastCollectedAt }],
    });

    const result = tick(state, NOW);
    expect(result.animals[0].lastCollectedAt).toBe(NOW);
    expect(result.inventory.chicken_product).toBe(1);
  });
});

describe('tick — auto-planter', () => {
  it('auto-plants on empty plots with autoCropId', () => {
    const state = makeState({
      lastTickAt: NOW - 1000,
      hasAutoPlanter: true,
      season: 'spring',
      coins: 1000,
      level: 5,
      weather: { type: 'sunny', changesAt: NOW + 60000 },
      plots: [
        { status: 'empty', autoCropId: 'wheat' } as PlotState,
        ...Array(23).fill({ status: 'locked' }),
      ] as PlotState[],
    });

    const result = tick(state, NOW);
    expect(result.plots[0].status).toBe('growing');
    if (result.plots[0].status === 'growing') {
      expect(result.plots[0].cropId).toBe('wheat');
    }
    expect(result.coins).toBe(1000 - CROPS.wheat.seedPrice);
  });

  it('does not auto-plant in winter', () => {
    const state = makeState({
      lastTickAt: NOW - 1000,
      hasAutoPlanter: true,
      season: 'winter',
      coins: 1000,
      level: 5,
      weather: { type: 'sunny', changesAt: NOW + 60000 },
      plots: [
        { status: 'empty', autoCropId: 'wheat' } as PlotState,
        ...Array(23).fill({ status: 'locked' }),
      ] as PlotState[],
    });

    const result = tick(state, NOW);
    expect(result.plots[0].status).toBe('empty');
  });

  it('does not auto-plant when not enough coins', () => {
    const state = makeState({
      lastTickAt: NOW - 1000,
      hasAutoPlanter: true,
      season: 'spring',
      coins: 0,
      level: 5,
      weather: { type: 'sunny', changesAt: NOW + 60000 },
      plots: [
        { status: 'empty', autoCropId: 'wheat' } as PlotState,
        ...Array(23).fill({ status: 'locked' }),
      ] as PlotState[],
    });

    const result = tick(state, NOW);
    expect(result.plots[0].status).toBe('empty');
  });

  it('does not auto-plant when crop unlock level too high', () => {
    const state = makeState({
      lastTickAt: NOW - 1000,
      hasAutoPlanter: true,
      season: 'spring',
      coins: 1000,
      level: 1, // grape requires level 8
      weather: { type: 'sunny', changesAt: NOW + 60000 },
      plots: [
        { status: 'empty', autoCropId: 'grape' } as PlotState,
        ...Array(23).fill({ status: 'locked' }),
      ] as PlotState[],
    });

    const result = tick(state, NOW);
    expect(result.plots[0].status).toBe('empty');
  });

  it('does not auto-plant seasonal crop in wrong season', () => {
    const state = makeState({
      lastTickAt: NOW - 1000,
      hasAutoPlanter: true,
      season: 'spring', // cucumber is summer only
      coins: 1000,
      level: 5,
      weather: { type: 'sunny', changesAt: NOW + 60000 },
      plots: [
        { status: 'empty', autoCropId: 'cucumber' } as PlotState,
        ...Array(23).fill({ status: 'locked' }),
      ] as PlotState[],
    });

    const result = tick(state, NOW);
    expect(result.plots[0].status).toBe('empty');
  });

  it('does nothing when hasAutoPlanter is false', () => {
    const state = makeState({
      lastTickAt: NOW - 1000,
      hasAutoPlanter: false,
      season: 'spring',
      coins: 1000,
      level: 5,
      weather: { type: 'sunny', changesAt: NOW + 60000 },
      plots: [
        { status: 'empty', autoCropId: 'wheat' } as PlotState,
        ...Array(23).fill({ status: 'locked' }),
      ] as PlotState[],
    });

    const result = tick(state, NOW);
    expect(result.plots[0].status).toBe('empty');
  });
});

describe('tick — expired orders', () => {
  it('marks orders as expired when expiresAt <= now', () => {
    const order: NpcOrder = {
      id: 'o1',
      customerName: 'Test',
      customerEmoji: '👩',
      items: { wheat: 1 },
      reward: 100,
      xpReward: 10,
      expiresAt: NOW - 1000, // already expired
    };
    const state = makeState({
      lastTickAt: NOW - 1000,
      orders: [order],
      orderStreak: 5,
    });

    const result = tick(state, NOW);
    expect(result.orders[0].expired).toBe(true);
    expect(result.orderStreak).toBe(0);
  });

  it('does not mark orders that have not expired', () => {
    const order: NpcOrder = {
      id: 'o1',
      customerName: 'Test',
      customerEmoji: '👩',
      items: { wheat: 1 },
      reward: 100,
      xpReward: 10,
      expiresAt: NOW + 60000,
    };
    const state = makeState({
      lastTickAt: NOW - 1000,
      orders: [order],
      orderStreak: 5,
    });

    const result = tick(state, NOW);
    expect(result.orders[0].expired).toBeFalsy();
    expect(result.orderStreak).toBe(5);
  });

  it('does not re-expire already expired orders', () => {
    const order: NpcOrder = {
      id: 'o1',
      customerName: 'Test',
      customerEmoji: '👩',
      items: { wheat: 1 },
      reward: 100,
      xpReward: 10,
      expiresAt: NOW - 5000,
      expired: true,
    };
    const state = makeState({
      lastTickAt: NOW - 1000,
      orders: [order],
      orderStreak: 3,
    });

    const result = tick(state, NOW);
    // Streak should not be reset again since the order was already expired
    expect(result.orderStreak).toBe(3);
  });
});

describe('tick — order generation', () => {
  it('generates new orders when below max', () => {
    const state = makeState({
      lastTickAt: NOW - 1000,
      orders: [],
      level: 1,
    });

    const result = tick(state, NOW);
    // Level 1: max orders = 2
    expect(result.orders.length).toBe(2);
  });

  it('does not generate orders when already at max', () => {
    const orders: NpcOrder[] = [
      { id: 'o1', customerName: 'A', customerEmoji: '👩', items: { wheat: 1 }, reward: 10, xpReward: 5, expiresAt: NOW + 60000 },
      { id: 'o2', customerName: 'B', customerEmoji: '👨', items: { wheat: 1 }, reward: 10, xpReward: 5, expiresAt: NOW + 60000 },
    ];
    const state = makeState({
      lastTickAt: NOW - 1000,
      orders,
      level: 1,
    });

    const result = tick(state, NOW);
    expect(result.orders.length).toBe(2);
  });

  it('generates orders with valid fields', () => {
    const state = makeState({
      lastTickAt: NOW - 1000,
      orders: [],
      level: 3,
    });

    const result = tick(state, NOW);
    for (const order of result.orders) {
      expect(order.id).toBeTruthy();
      expect(order.customerName).toBeTruthy();
      expect(order.reward).toBeGreaterThan(0);
      expect(order.xpReward).toBeGreaterThan(0);
      expect(order.expiresAt).toBeGreaterThan(NOW);
      expect(Object.keys(order.items).length).toBeGreaterThan(0);
    }
  });
});

describe('tick — market price fluctuation', () => {
  it('updates market price when enough time has passed', () => {
    const state = makeState({
      lastTickAt: NOW - (MARKET_UPDATE_INTERVAL + 1) * 1000,
      marketPriceMultiplier: 1,
    });

    // Set Math.random to control the multiplier
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = tick(state, NOW);
    expect(result.marketPriceMultiplier).not.toBe(1);
    expect(result.marketPriceMultiplier).toBeGreaterThanOrEqual(0.7);
    expect(result.marketPriceMultiplier).toBeLessThanOrEqual(1.4);
    spy.mockRestore();
  });

  it('does not update market price before interval', () => {
    const state = makeState({
      lastTickAt: NOW - 10 * 1000, // only 10 seconds
      marketPriceMultiplier: 1.0,
    });

    const result = tick(state, NOW);
    expect(result.marketPriceMultiplier).toBe(1.0);
  });
});

describe('tick — season rotation', () => {
  it('rotates season when SEASON_DURATION elapsed', () => {
    const state = makeState({
      lastTickAt: NOW - 1000,
      season: 'spring',
      seasonStartedAt: NOW - (SEASON_DURATION + 1) * 1000,
    });

    const result = tick(state, NOW);
    expect(result.season).toBe('summer');
    expect(result.seasonStartedAt).toBe(NOW);
  });

  it('wraps from winter back to spring', () => {
    const state = makeState({
      lastTickAt: NOW - 1000,
      season: 'winter',
      seasonStartedAt: NOW - (SEASON_DURATION + 1) * 1000,
    });

    const result = tick(state, NOW);
    expect(result.season).toBe('spring');
  });

  it('does not rotate season before duration', () => {
    const state = makeState({
      lastTickAt: NOW - 1000,
      season: 'spring',
      seasonStartedAt: NOW - 100 * 1000,
    });

    const result = tick(state, NOW);
    expect(result.season).toBe('spring');
  });
});

describe('tick — weather changes', () => {
  it('changes weather when changesAt is passed', () => {
    const state = makeState({
      lastTickAt: NOW - 1000,
      weather: { type: 'sunny', changesAt: NOW - 1000 },
    });

    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const result = tick(state, NOW);
    expect(result.weather.changesAt).toBeGreaterThan(NOW);
    vi.restoreAllMocks();
  });

  it('does not change weather before changesAt', () => {
    const changesAt = NOW + 60000;
    const state = makeState({
      lastTickAt: NOW - 1000,
      weather: { type: 'sunny', changesAt },
    });

    const result = tick(state, NOW);
    expect(result.weather.changesAt).toBe(changesAt);
    expect(result.weather.type).toBe('sunny');
  });
});

describe('tick — lastTickAt update', () => {
  it('always updates lastTickAt to now', () => {
    const state = makeState({ lastTickAt: NOW - 5000 });
    const result = tick(state, NOW);
    expect(result.lastTickAt).toBe(NOW);
  });
});
