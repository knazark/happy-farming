import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createInitialState, gameReducer, migrateSave } from './gameReducer';
import { CROPS } from '../constants/crops';
import { ANIMALS } from '../constants/animals';
import { STARTING_COINS, MAX_ANIMALS, penUpgradeCost, PEN_UPGRADE_AMOUNT, FERTILIZER_PRICE, FERTILIZER_SPEED_MULTIPLIER, MAX_LEVEL, CRAFTING_SLOTS_BASE, CRAFTING_SLOTS_MAX, craftingUpgradeCost, TRACTOR_PRICE, TRACTOR_REQUIRED_CRAFTS, AUTO_COLLECTOR_PRICE, AUTO_COLLECTOR_REQUIRED_CRAFTS, AUTO_PLANTER_PRICE, AUTO_PLANTER_REQUIRED_CRAFTS, AUTO_PLANTER_MAX_PLOTS, xpForLevel } from '../constants/game';
import { RECIPES, STORAGE_UPGRADE_AMOUNT, STORAGE_BASE, STORAGE_MAX, storageUpgradeCost } from '../constants/recipes';
import { WOOD_GATHER_TIME, WOOD_SELL_PRICE, WOOD_XP_REWARD, SOIL_UPGRADE_COSTS, MAX_SOIL_LEVEL, SOIL_HARVESTS_PER_LEVEL } from '../constants/winter';
import { HELP_COIN_REWARD, HELP_XP_REWARD, GIFT_COIN_REWARD } from '../constants/neighbors';
import { INITIAL_UNLOCKED, TOTAL_PLOTS } from '../constants/grid';
import { UNLOCK_COST_BASE } from '../constants/grid';
import type { GameState, PlotState, NpcOrder, CraftingSlot, Inventory } from '../types';

function makeState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState(), ...overrides };
}

// Lock Date.now for deterministic tests
const NOW = 1700000000000;

describe('createInitialState', () => {
  it('creates state with starting coins', () => {
    const state = createInitialState();
    expect(state.coins).toBe(STARTING_COINS);
  });

  it('creates correct number of plots', () => {
    const state = createInitialState();
    expect(state.plots.length).toBe(TOTAL_PLOTS);
  });

  it('has INITIAL_UNLOCKED empty plots and rest locked', () => {
    const state = createInitialState();
    const empty = state.plots.filter((p) => p.status === 'empty');
    const locked = state.plots.filter((p) => p.status === 'locked');
    expect(empty.length).toBe(INITIAL_UNLOCKED);
    expect(locked.length).toBe(TOTAL_PLOTS - INITIAL_UNLOCKED);
  });

  it('starts at level 1 with 0 xp', () => {
    const state = createInitialState();
    expect(state.level).toBe(1);
    expect(state.xp).toBe(0);
  });

  it('has empty inventory and no animals', () => {
    const state = createInitialState();
    expect(Object.keys(state.inventory).length).toBe(0);
    expect(state.animals.length).toBe(0);
  });

  it('has no tractor/auto-collector/auto-planter', () => {
    const state = createInitialState();
    expect(state.hasTractor).toBe(false);
    expect(state.hasAutoCollector).toBe(false);
    expect(state.hasAutoPlanter).toBe(false);
  });
});

describe('TICK action', () => {
  it('delegates to tick function and updates lastTickAt', () => {
    const state = makeState({ lastTickAt: NOW - 1000 });
    const result = gameReducer(state, { type: 'TICK', now: NOW });
    expect(result.lastTickAt).toBe(NOW);
  });
});

describe('PLANT_CROP action', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  it('plants a crop on an empty plot', () => {
    const state = makeState({ coins: 100, level: 1, season: 'spring' });
    const result = gameReducer(state, { type: 'PLANT_CROP', plotIndex: 0, cropId: 'wheat' });
    expect(result.plots[0].status).toBe('growing');
    if (result.plots[0].status === 'growing') {
      expect(result.plots[0].cropId).toBe('wheat');
    }
    expect(result.coins).toBe(100 - CROPS.wheat.seedPrice);
  });

  it('does nothing if plot is not empty', () => {
    const plots = [...createInitialState().plots];
    plots[0] = { status: 'locked' };
    const state = makeState({ plots, coins: 100, level: 1 });
    const result = gameReducer(state, { type: 'PLANT_CROP', plotIndex: 0, cropId: 'wheat' });
    expect(result).toEqual(state);
  });

  it('does nothing if not enough coins', () => {
    const state = makeState({ coins: 0, level: 1, season: 'spring' });
    const result = gameReducer(state, { type: 'PLANT_CROP', plotIndex: 0, cropId: 'wheat' });
    expect(result.plots[0].status).toBe('empty');
  });

  it('does nothing in winter', () => {
    const state = makeState({ coins: 100, level: 1, season: 'winter' });
    const result = gameReducer(state, { type: 'PLANT_CROP', plotIndex: 0, cropId: 'wheat' });
    expect(result.plots[0].status).toBe('empty');
  });

  it('does nothing if crop unlock level is too high', () => {
    const state = makeState({ coins: 1000, level: 1, season: 'spring' });
    // parsley requires level 2
    const result = gameReducer(state, { type: 'PLANT_CROP', plotIndex: 0, cropId: 'parsley' });
    expect(result.plots[0].status).toBe('empty');
  });

  it('does nothing if seasonal crop planted in wrong season', () => {
    const state = makeState({ coins: 1000, level: 5, season: 'spring' });
    // cucumber is summer only
    const result = gameReducer(state, { type: 'PLANT_CROP', plotIndex: 0, cropId: 'cucumber' });
    expect(result.plots[0].status).toBe('empty');
  });

  it('preserves autoCropId when planting', () => {
    const plots = [...createInitialState().plots];
    plots[0] = { status: 'empty', autoCropId: 'wheat' } as PlotState;
    const state = makeState({ plots, coins: 100, level: 1, season: 'spring' });
    const result = gameReducer(state, { type: 'PLANT_CROP', plotIndex: 0, cropId: 'wheat' });
    expect((result.plots[0] as any).autoCropId).toBe('wheat');
  });

  vi.restoreAllMocks();
});

describe('HARVEST action', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  it('harvests a ready crop', () => {
    const plots = [...createInitialState().plots];
    plots[0] = { status: 'ready', cropId: 'wheat' };
    const state = makeState({ plots });
    const result = gameReducer(state, { type: 'HARVEST', plotIndex: 0 });

    expect(result.plots[0].status).toBe('empty');
    expect(result.inventory.wheat).toBe(1);
    expect(result.totalHarvested).toBe(1);
    expect(result.totalEarned).toBe(CROPS.wheat.sellPrice);
  });

  it('does nothing if plot is not ready', () => {
    const state = makeState();
    const result = gameReducer(state, { type: 'HARVEST', plotIndex: 0 });
    expect(result).toEqual(state);
  });

  it('does NOT add XP on harvest (XP only from crafts/orders)', () => {
    const plots = [...createInitialState().plots];
    plots[0] = { status: 'ready', cropId: 'wheat' };
    const state = makeState({ plots, xp: 0, level: 1 });
    const result = gameReducer(state, { type: 'HARVEST', plotIndex: 0 });
    expect(result.xp).toBe(0);
  });

  it('grants first_harvest achievement', () => {
    const plots = [...createInitialState().plots];
    plots[0] = { status: 'ready', cropId: 'wheat' };
    const state = makeState({ plots, achievements: [] });
    const result = gameReducer(state, { type: 'HARVEST', plotIndex: 0 });
    expect(result.achievements).toContain('first_harvest');
  });

  it('decrements soilHarvestsLeft and clears when depleted', () => {
    const plots = [...createInitialState().plots];
    plots[0] = { status: 'ready', cropId: 'wheat', soilLevel: 1, soilHarvestsLeft: 1 };
    const state = makeState({ plots });
    const result = gameReducer(state, { type: 'HARVEST', plotIndex: 0 });
    const plot = result.plots[0];
    if (plot.status === 'empty') {
      expect(plot.soilLevel).toBeUndefined();
      expect(plot.soilHarvestsLeft).toBeUndefined();
    }
  });

  it('preserves autoCropId on harvest', () => {
    const plots = [...createInitialState().plots];
    plots[0] = { status: 'ready', cropId: 'wheat', autoCropId: 'wheat' } as PlotState;
    const state = makeState({ plots });
    const result = gameReducer(state, { type: 'HARVEST', plotIndex: 0 });
    expect((result.plots[0] as any).autoCropId).toBe('wheat');
  });

  vi.restoreAllMocks();
});

describe('GATHER_WOOD action', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  it('starts gathering wood on empty plot in winter', () => {
    const state = makeState({ season: 'winter' });
    const result = gameReducer(state, { type: 'GATHER_WOOD', plotIndex: 0 });
    expect(result.plots[0].status).toBe('gathering_wood');
    if (result.plots[0].status === 'gathering_wood') {
      expect(result.plots[0].gatherTime).toBe(WOOD_GATHER_TIME);
    }
  });

  it('does nothing outside winter', () => {
    const state = makeState({ season: 'spring' });
    const result = gameReducer(state, { type: 'GATHER_WOOD', plotIndex: 0 });
    expect(result.plots[0].status).toBe('empty');
  });

  it('does nothing on non-empty plot', () => {
    const plots = [...createInitialState().plots];
    plots[0] = { status: 'locked' };
    const state = makeState({ plots, season: 'winter' });
    const result = gameReducer(state, { type: 'GATHER_WOOD', plotIndex: 0 });
    expect(result.plots[0].status).toBe('locked');
  });

  vi.restoreAllMocks();
});

describe('COLLECT_WOOD action', () => {
  it('collects wood from wood_ready plot', () => {
    const plots = [...createInitialState().plots];
    plots[0] = { status: 'wood_ready' };
    const state = makeState({ plots, xp: 0, level: 1 });
    const result = gameReducer(state, { type: 'COLLECT_WOOD', plotIndex: 0 });

    expect(result.plots[0].status).toBe('empty');
    expect(result.inventory.firewood).toBe(1);
    expect(result.totalHarvested).toBe(1);
    expect(result.xp).toBe(WOOD_XP_REWARD);
  });

  it('does nothing if plot is not wood_ready', () => {
    const state = makeState();
    const result = gameReducer(state, { type: 'COLLECT_WOOD', plotIndex: 0 });
    expect(result).toEqual(state);
  });
});

describe('UPGRADE_SOIL action', () => {
  it('upgrades soil on empty plot in winter', () => {
    const state = makeState({ season: 'winter', coins: 500 });
    const result = gameReducer(state, { type: 'UPGRADE_SOIL', plotIndex: 0 });
    const plot = result.plots[0];
    if (plot.status === 'empty') {
      expect(plot.soilLevel).toBe(1);
      expect(plot.soilHarvestsLeft).toBe(SOIL_HARVESTS_PER_LEVEL);
    }
    expect(result.coins).toBe(500 - SOIL_UPGRADE_COSTS[0]);
  });

  it('does nothing outside winter', () => {
    const state = makeState({ season: 'spring', coins: 500 });
    const result = gameReducer(state, { type: 'UPGRADE_SOIL', plotIndex: 0 });
    expect(result).toEqual(state);
  });

  it('does nothing if already at max soil level', () => {
    const plots = [...createInitialState().plots];
    plots[0] = { status: 'empty', soilLevel: MAX_SOIL_LEVEL, soilHarvestsLeft: 20 };
    const state = makeState({ plots, season: 'winter', coins: 500 });
    const result = gameReducer(state, { type: 'UPGRADE_SOIL', plotIndex: 0 });
    expect(result).toEqual(state);
  });

  it('does nothing if not enough coins', () => {
    const state = makeState({ season: 'winter', coins: 0 });
    const result = gameReducer(state, { type: 'UPGRADE_SOIL', plotIndex: 0 });
    expect(result).toEqual(state);
  });

  it('does nothing on non-empty plot', () => {
    const plots = [...createInitialState().plots];
    plots[0] = { status: 'locked' };
    const state = makeState({ plots, season: 'winter', coins: 500 });
    const result = gameReducer(state, { type: 'UPGRADE_SOIL', plotIndex: 0 });
    expect(result).toEqual(state);
  });
});

describe('UNLOCK_PLOT action', () => {
  it('unlocks a locked plot when affordable and level sufficient', () => {
    // First locked plot is at index INITIAL_UNLOCKED
    // level 5 triggers level_5 achievement (+60 coins), so account for that
    const state = makeState({ coins: 500, level: 5, achievements: ['level_5'] });
    const result = gameReducer(state, { type: 'UNLOCK_PLOT', plotIndex: INITIAL_UNLOCKED });
    expect(result.plots[INITIAL_UNLOCKED].status).toBe('empty');
    expect(result.coins).toBe(500 - UNLOCK_COST_BASE);
  });

  it('does nothing if not enough coins', () => {
    const state = makeState({ coins: 0, level: 5 });
    const result = gameReducer(state, { type: 'UNLOCK_PLOT', plotIndex: INITIAL_UNLOCKED });
    expect(result.plots[INITIAL_UNLOCKED].status).toBe('locked');
  });

  it('does nothing if level too low', () => {
    const state = makeState({ coins: 9999, level: 1 });
    const result = gameReducer(state, { type: 'UNLOCK_PLOT', plotIndex: INITIAL_UNLOCKED });
    // getUnlockLevel for first plot is 2, so level 1 should fail
    expect(result.plots[INITIAL_UNLOCKED].status).toBe('locked');
  });

  it('does nothing if plot is already unlocked', () => {
    const state = makeState({ coins: 500, level: 5 });
    const result = gameReducer(state, { type: 'UNLOCK_PLOT', plotIndex: 0 });
    // plot 0 is already empty, not locked
    expect(result).toEqual(state);
  });

  it('grants full_farm achievement when all unlocked', () => {
    const plots: PlotState[] = Array(TOTAL_PLOTS).fill(null).map((_, i) =>
      i === TOTAL_PLOTS - 1 ? { status: 'locked' as const } : { status: 'empty' as const }
    );
    const state = makeState({ plots, coins: 99999, level: 10 });
    const result = gameReducer(state, { type: 'UNLOCK_PLOT', plotIndex: TOTAL_PLOTS - 1 });
    expect(result.achievements).toContain('full_farm');
  });
});

describe('BUY_ANIMAL action', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  it('buys an animal when affordable', () => {
    // first_animal achievement grants +30 coins, so pre-grant it to avoid interference
    const state = makeState({ coins: 1000, level: 1, achievements: ['first_animal'] });
    const result = gameReducer(state, { type: 'BUY_ANIMAL', animalId: 'chicken' });
    expect(result.animals.length).toBe(1);
    expect(result.animals[0].animalId).toBe('chicken');
    expect(result.coins).toBe(1000 - ANIMALS.chicken.buyPrice);
  });

  it('does nothing if not enough coins', () => {
    const state = makeState({ coins: 0, level: 1 });
    const result = gameReducer(state, { type: 'BUY_ANIMAL', animalId: 'chicken' });
    expect(result.animals.length).toBe(0);
  });

  it('does nothing if animal unlock level too high', () => {
    const state = makeState({ coins: 99999, level: 1 });
    // duck requires level 2
    const result = gameReducer(state, { type: 'BUY_ANIMAL', animalId: 'duck' });
    expect(result.animals.length).toBe(0);
  });

  it('does nothing if at max animals', () => {
    const animals = Array(MAX_ANIMALS).fill(null).map(() => ({ animalId: 'chicken' as const, feedsLeft: 5, lastCollectedAt: NOW }));
    const state = makeState({ animals, coins: 99999, level: 10 });
    const result = gameReducer(state, { type: 'BUY_ANIMAL', animalId: 'chicken' });
    expect(result.animals.length).toBe(MAX_ANIMALS);
  });

  it('grants first_animal achievement', () => {
    const state = makeState({ coins: 1000, level: 1, achievements: [] });
    const result = gameReducer(state, { type: 'BUY_ANIMAL', animalId: 'chicken' });
    expect(result.achievements).toContain('first_animal');
  });

  it('price doubles for second animal of same type', () => {
    const state = makeState({
      coins: 99999,
      level: 1,
      animals: [{ animalId: 'chicken', feedsLeft: 5, lastCollectedAt: NOW }],
      achievements: ['first_animal'], // pre-grant to avoid bonus coins
    });
    const result = gameReducer(state, { type: 'BUY_ANIMAL', animalId: 'chicken' });
    expect(result.coins).toBe(99999 - ANIMALS.chicken.buyPrice * 2);
  });

  vi.restoreAllMocks();
});

describe('COLLECT_PRODUCT action', () => {
  it('collects product when production time elapsed', () => {
    const past = NOW - (ANIMALS.chicken.productionTime + 1) * 1000;
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const state = makeState({
      animals: [{ animalId: 'chicken', feedsLeft: 5, lastCollectedAt: past }],
    });
    const result = gameReducer(state, { type: 'COLLECT_PRODUCT', animalIndex: 0 });
    expect(result.inventory.chicken_product).toBe(1);
    expect(result.animals[0].lastCollectedAt).toBe(NOW);
    vi.restoreAllMocks();
  });

  it('collects double in summer', () => {
    const past = NOW - (ANIMALS.chicken.productionTime + 1) * 1000;
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const state = makeState({
      animals: [{ animalId: 'chicken', feedsLeft: 5, lastCollectedAt: past }],
      season: 'summer',
    });
    const result = gameReducer(state, { type: 'COLLECT_PRODUCT', animalIndex: 0 });
    expect(result.inventory.chicken_product).toBe(2);
    vi.restoreAllMocks();
  });

  it('does nothing if production time not elapsed', () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const state = makeState({
      animals: [{ animalId: 'chicken', feedsLeft: 5, lastCollectedAt: NOW - 10 * 1000 }],
    });
    const result = gameReducer(state, { type: 'COLLECT_PRODUCT', animalIndex: 0 });
    expect(result.inventory.chicken_product).toBeUndefined();
    vi.restoreAllMocks();
  });

  it('does nothing for invalid animalIndex', () => {
    const state = makeState({ animals: [] });
    const result = gameReducer(state, { type: 'COLLECT_PRODUCT', animalIndex: 0 });
    expect(result).toEqual(state);
  });

  it('does NOT add xp on collection (XP only from crafts/orders)', () => {
    const past = NOW - (ANIMALS.chicken.productionTime + 1) * 1000;
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const state = makeState({
      animals: [{ animalId: 'chicken', feedsLeft: 5, lastCollectedAt: past }],
      xp: 0,
      level: 1,
    });
    const result = gameReducer(state, { type: 'COLLECT_PRODUCT', animalIndex: 0 });
    expect(result.xp).toBe(0);
    vi.restoreAllMocks();
  });
});

describe('SELL_ITEM action', () => {
  it('sells a crop from inventory', () => {
    const state = makeState({
      inventory: { wheat: 5 },
      coins: 100,
      marketPriceMultiplier: 1,
      season: 'spring',
    });
    const result = gameReducer(state, { type: 'SELL_ITEM', itemId: 'wheat', quantity: 2 });
    expect(result.inventory.wheat).toBe(3);
    expect(result.coins).toBe(100 + CROPS.wheat.sellPrice * 2);
  });

  it('removes item from inventory when selling all', () => {
    const state = makeState({
      inventory: { wheat: 2 },
      coins: 100,
      marketPriceMultiplier: 1,
      season: 'spring',
    });
    const result = gameReducer(state, { type: 'SELL_ITEM', itemId: 'wheat', quantity: 2 });
    expect(result.inventory.wheat).toBeUndefined();
  });

  it('does nothing if not enough in inventory', () => {
    const state = makeState({ inventory: { wheat: 1 }, coins: 100 });
    const result = gameReducer(state, { type: 'SELL_ITEM', itemId: 'wheat', quantity: 5 });
    expect(result.inventory.wheat).toBe(1);
  });

  it('sells animal products', () => {
    const state = makeState({
      inventory: { chicken_product: 3 },
      coins: 100,
      marketPriceMultiplier: 1,
      season: 'spring',
    });
    const result = gameReducer(state, { type: 'SELL_ITEM', itemId: 'chicken_product', quantity: 1 });
    expect(result.inventory.chicken_product).toBe(2);
    expect(result.coins).toBe(100 + ANIMALS.chicken.productSellPrice);
  });

  it('sells firewood', () => {
    const state = makeState({
      inventory: { firewood: 2 },
      coins: 100,
      marketPriceMultiplier: 1,
      season: 'spring',
    });
    const result = gameReducer(state, { type: 'SELL_ITEM', itemId: 'firewood', quantity: 1 });
    expect(result.coins).toBe(100 + WOOD_SELL_PRICE);
  });

  it('sells crafted items', () => {
    const state = makeState({
      inventory: { bread: 1 },
      coins: 100,
      marketPriceMultiplier: 1,
      season: 'spring',
    });
    const result = gameReducer(state, { type: 'SELL_ITEM', itemId: 'bread', quantity: 1 });
    expect(result.coins).toBe(100 + RECIPES.bread.sellPrice);
  });

  it('applies market price multiplier', () => {
    const state = makeState({
      inventory: { wheat: 5 },
      coins: 0,
      marketPriceMultiplier: 1.5,
      season: 'spring', // season multiplier = 1.0
    });
    const result = gameReducer(state, { type: 'SELL_ITEM', itemId: 'wheat', quantity: 1 });
    expect(result.coins).toBe(Math.round(CROPS.wheat.sellPrice * 1.5));
  });

  it('applies autumn season price multiplier', () => {
    const state = makeState({
      inventory: { wheat: 5 },
      coins: 0,
      marketPriceMultiplier: 1,
      season: 'autumn', // 1.3x
    });
    const result = gameReducer(state, { type: 'SELL_ITEM', itemId: 'wheat', quantity: 1 });
    expect(result.coins).toBe(Math.round(CROPS.wheat.sellPrice * 1.3));
  });

  it('triggers rich_farmer achievement at 1000 totalEarned', () => {
    // SELL_ITEM doesn't increment totalEarned; totalEarned is already >= 1000
    // so checkAchievements will detect it on next sell action
    const state = makeState({
      inventory: { wheat: 100 },
      coins: 0,
      totalEarned: 1000,
      marketPriceMultiplier: 1,
      season: 'spring',
      achievements: [],
    });
    const result = gameReducer(state, { type: 'SELL_ITEM', itemId: 'wheat', quantity: 1 });
    expect(result.achievements).toContain('rich_farmer');
  });
});

describe('BUY_FERTILIZER action', () => {
  it('buys fertilizer', () => {
    const state = makeState({ coins: 100, fertilizers: 0 });
    const result = gameReducer(state, { type: 'BUY_FERTILIZER', quantity: 2 });
    expect(result.fertilizers).toBe(2);
    expect(result.coins).toBe(100 - FERTILIZER_PRICE * 2);
  });

  it('does nothing if not enough coins', () => {
    const state = makeState({ coins: 0, fertilizers: 0 });
    const result = gameReducer(state, { type: 'BUY_FERTILIZER', quantity: 1 });
    expect(result.fertilizers).toBe(0);
  });
});

describe('USE_FERTILIZER action', () => {
  it('applies fertilizer to growing plot', () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const plots = [...createInitialState().plots];
    plots[0] = { status: 'growing', cropId: 'wheat', plantedAt: NOW, growthTime: 60 };
    const state = makeState({ plots, fertilizers: 1 });
    const result = gameReducer(state, { type: 'USE_FERTILIZER', plotIndex: 0 });

    if (result.plots[0].status === 'growing') {
      expect(result.plots[0].growthTime).toBe(60 * FERTILIZER_SPEED_MULTIPLIER);
      expect(result.plots[0].fertilized).toBe(true);
    }
    expect(result.fertilizers).toBe(0);
    vi.restoreAllMocks();
  });

  it('does nothing if no fertilizers', () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const plots = [...createInitialState().plots];
    plots[0] = { status: 'growing', cropId: 'wheat', plantedAt: NOW, growthTime: 60 };
    const state = makeState({ plots, fertilizers: 0 });
    const result = gameReducer(state, { type: 'USE_FERTILIZER', plotIndex: 0 });
    if (result.plots[0].status === 'growing') {
      expect(result.plots[0].growthTime).toBe(60);
    }
    vi.restoreAllMocks();
  });

  it('does nothing on non-growing plot', () => {
    const state = makeState({ fertilizers: 1 });
    const result = gameReducer(state, { type: 'USE_FERTILIZER', plotIndex: 0 });
    expect(result.fertilizers).toBe(1);
  });

  it('does nothing if already fertilized', () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const plots = [...createInitialState().plots];
    plots[0] = { status: 'growing', cropId: 'wheat', plantedAt: NOW, growthTime: 30, fertilized: true };
    const state = makeState({ plots, fertilizers: 1 });
    const result = gameReducer(state, { type: 'USE_FERTILIZER', plotIndex: 0 });
    expect(result.fertilizers).toBe(1);
    vi.restoreAllMocks();
  });
});

describe('SET_PROFILE action', () => {
  it('sets profile', () => {
    const state = makeState();
    const result = gameReducer(state, { type: 'SET_PROFILE', profile: { name: 'Bob', avatar: '🤠' } });
    expect(result.profile.name).toBe('Bob');
    expect(result.profile.avatar).toBe('🤠');
  });
});

describe('HELP_NEIGHBOR action', () => {
  it('helps a neighbor and gives coins + xp', () => {
    const state = makeState({ coins: 50, xp: 0, level: 1 });
    const neighborId = state.neighbors[0].id;
    const result = gameReducer(state, { type: 'HELP_NEIGHBOR', neighborId });
    expect(result.coins).toBe(50 + HELP_COIN_REWARD);
    expect(result.xp).toBe(HELP_XP_REWARD);
    expect(result.neighbors[0].helpedToday).toBe(true);
  });

  it('does nothing if already helped today', () => {
    const state = makeState({ coins: 50 });
    const neighbors = [...state.neighbors];
    neighbors[0] = { ...neighbors[0], helpedToday: true };
    const stateHelped = { ...state, neighbors };
    const result = gameReducer(stateHelped, { type: 'HELP_NEIGHBOR', neighborId: neighbors[0].id });
    expect(result.coins).toBe(50);
  });

  it('does nothing for invalid neighborId', () => {
    const state = makeState({ coins: 50 });
    const result = gameReducer(state, { type: 'HELP_NEIGHBOR', neighborId: 'nonexistent' });
    expect(result.coins).toBe(50);
  });

  it('grants social_butterfly when all neighbors helped', () => {
    const state = makeState({ coins: 50, achievements: [] });
    let s = state;
    // Help all neighbors except the last one (they already count as helped)
    for (let i = 0; i < s.neighbors.length - 1; i++) {
      const neighbors = [...s.neighbors];
      neighbors[i] = { ...neighbors[i], helpedToday: true };
      s = { ...s, neighbors };
    }
    // Help the last one
    const lastId = s.neighbors[s.neighbors.length - 1].id;
    const result = gameReducer(s, { type: 'HELP_NEIGHBOR', neighborId: lastId });
    expect(result.achievements).toContain('social_butterfly');
  });
});

describe('COLLECT_GIFT action', () => {
  it('collects a gift from neighbor', () => {
    const state = makeState({ coins: 50, fertilizers: 0 });
    const neighborId = state.neighbors[0].id;
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // > GIFT_FERTILIZER_CHANCE (0.3), no bonus fertilizer
    const result = gameReducer(state, { type: 'COLLECT_GIFT', neighborId });
    expect(result.coins).toBe(50 + GIFT_COIN_REWARD);
    expect(result.neighbors[0].giftCollectedToday).toBe(true);
    expect(result.fertilizers).toBe(0);
    vi.restoreAllMocks();
  });

  it('may give bonus fertilizer', () => {
    const state = makeState({ coins: 50, fertilizers: 0 });
    const neighborId = state.neighbors[0].id;
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // < GIFT_FERTILIZER_CHANCE (0.3)
    const result = gameReducer(state, { type: 'COLLECT_GIFT', neighborId });
    expect(result.fertilizers).toBe(1);
    vi.restoreAllMocks();
  });

  it('does nothing if already collected today', () => {
    const state = makeState({ coins: 50 });
    const neighbors = [...state.neighbors];
    neighbors[0] = { ...neighbors[0], giftCollectedToday: true };
    const s = { ...state, neighbors };
    const result = gameReducer(s, { type: 'COLLECT_GIFT', neighborId: neighbors[0].id });
    expect(result.coins).toBe(50);
  });

  it('does nothing for invalid neighborId', () => {
    const state = makeState({ coins: 50 });
    const result = gameReducer(state, { type: 'COLLECT_GIFT', neighborId: 'nonexistent' });
    expect(result.coins).toBe(50);
  });
});

describe('START_CRAFT action', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  it('starts crafting bread with enough ingredients', () => {
    const state = makeState({
      inventory: { wheat: 5 },
      crafting: [],
      craftingSlots: 1,
      level: 2,
    });
    const result = gameReducer(state, { type: 'START_CRAFT', recipeId: 'bread' });
    expect(result.crafting.length).toBe(1);
    expect(result.crafting[0].recipeId).toBe('bread');
    expect(result.inventory.wheat).toBe(2); // 5 - 3
  });

  it('does nothing if crafting slots full', () => {
    const slot: CraftingSlot = { recipeId: 'bread', startedAt: NOW, craftTime: 120 };
    const state = makeState({
      inventory: { wheat: 5 },
      crafting: [slot],
      craftingSlots: 1,
      level: 2,
    });
    const result = gameReducer(state, { type: 'START_CRAFT', recipeId: 'bread' });
    expect(result.crafting.length).toBe(1);
  });

  it('does nothing if not enough ingredients', () => {
    const state = makeState({
      inventory: { wheat: 1 }, // bread needs 3
      crafting: [],
      craftingSlots: 1,
      level: 2,
    });
    const result = gameReducer(state, { type: 'START_CRAFT', recipeId: 'bread' });
    expect(result.crafting.length).toBe(0);
  });

  it('does nothing if unlock level too high', () => {
    const state = makeState({
      inventory: { wheat: 10, cabbage: 10 },
      crafting: [],
      craftingSlots: 1,
      level: 1, // cake requires level 3
    });
    const result = gameReducer(state, { type: 'START_CRAFT', recipeId: 'cake' });
    expect(result.crafting.length).toBe(0);
  });

  it('supports quantity > 1', () => {
    const state = makeState({
      inventory: { wheat: 10 },
      crafting: [],
      craftingSlots: 1,
      level: 2,
    });
    const result = gameReducer(state, { type: 'START_CRAFT', recipeId: 'bread', quantity: 2 });
    expect(result.crafting.length).toBe(1);
    expect(result.crafting[0].quantity).toBe(2);
    expect(result.crafting[0].craftTime).toBe(RECIPES.bread.craftTime * 2);
    expect(result.inventory.wheat).toBe(4); // 10 - 3*2
  });

  it('removes ingredient from inventory if fully consumed', () => {
    const state = makeState({
      inventory: { wheat: 3 },
      crafting: [],
      craftingSlots: 1,
      level: 2,
    });
    const result = gameReducer(state, { type: 'START_CRAFT', recipeId: 'bread' });
    expect(result.inventory.wheat).toBeUndefined();
  });

  vi.restoreAllMocks();
});

describe('COLLECT_CRAFT action', () => {
  it('collects finished craft', () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const slot: CraftingSlot = { recipeId: 'bread', startedAt: NOW - 200 * 1000, craftTime: 120 };
    const state = makeState({
      crafting: [slot],
      inventory: {},
      totalCrafted: 0,
      xp: 0,
      level: 1,
      storageCapacity: 50,
    });
    const result = gameReducer(state, { type: 'COLLECT_CRAFT', slotIndex: 0 });
    expect(result.crafting.length).toBe(0);
    expect(result.inventory.bread).toBe(1);
    expect(result.totalCrafted).toBe(1);
    vi.restoreAllMocks();
  });

  it('grants first_craft achievement', () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const slot: CraftingSlot = { recipeId: 'bread', startedAt: NOW - 200 * 1000, craftTime: 120 };
    const state = makeState({
      crafting: [slot],
      inventory: {},
      totalCrafted: 0,
      achievements: [],
      storageCapacity: 50,
    });
    const result = gameReducer(state, { type: 'COLLECT_CRAFT', slotIndex: 0 });
    expect(result.achievements).toContain('first_craft');
    vi.restoreAllMocks();
  });

  it('does nothing if craft is not finished', () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const slot: CraftingSlot = { recipeId: 'bread', startedAt: NOW - 10 * 1000, craftTime: 120 };
    const state = makeState({ crafting: [slot] });
    const result = gameReducer(state, { type: 'COLLECT_CRAFT', slotIndex: 0 });
    expect(result.crafting.length).toBe(1);
    vi.restoreAllMocks();
  });

  it('does nothing if storage is full', () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const slot: CraftingSlot = { recipeId: 'bread', startedAt: NOW - 200 * 1000, craftTime: 120 };
    const inv: Inventory = { wheat: 50 };
    const state = makeState({ crafting: [slot], inventory: inv, storageCapacity: 50 });
    const result = gameReducer(state, { type: 'COLLECT_CRAFT', slotIndex: 0 });
    expect(result.crafting.length).toBe(1);
    vi.restoreAllMocks();
  });

  it('handles quantity > 1', () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const slot: CraftingSlot = { recipeId: 'bread', startedAt: NOW - 300 * 1000, craftTime: 240, quantity: 2 };
    const state = makeState({
      crafting: [slot],
      inventory: {},
      totalCrafted: 0,
      storageCapacity: 50,
    });
    const result = gameReducer(state, { type: 'COLLECT_CRAFT', slotIndex: 0 });
    expect(result.inventory.bread).toBe(2);
    expect(result.totalCrafted).toBe(2);
    vi.restoreAllMocks();
  });

  it('does nothing for invalid slotIndex', () => {
    const state = makeState({ crafting: [] });
    const result = gameReducer(state, { type: 'COLLECT_CRAFT', slotIndex: 0 });
    expect(result).toEqual(state);
  });
});

describe('FULFILL_ORDER action', () => {
  it('fulfills a non-expired order and gives reward', () => {
    const order: NpcOrder = {
      id: 'o1',
      customerName: 'Test',
      customerEmoji: '👩',
      items: { wheat: 2 },
      reward: 100,
      xpReward: 50,
      expiresAt: NOW + 60000,
    };
    const state = makeState({
      inventory: { wheat: 5 },
      orders: [order],
      coins: 50,
      totalEarned: 0,
      totalOrdersFulfilled: 0,
      orderStreak: 0,
    });
    const result = gameReducer(state, { type: 'FULFILL_ORDER', orderId: 'o1' });
    expect(result.orders.length).toBe(0);
    expect(result.inventory.wheat).toBe(3);
    expect(result.coins).toBe(50 + 100);
    expect(result.totalEarned).toBe(100);
    expect(result.totalOrdersFulfilled).toBe(1);
    expect(result.orderStreak).toBe(1);
  });

  it('expired order gives 25% reward and zero xp', () => {
    const order: NpcOrder = {
      id: 'o1',
      customerName: 'Test',
      customerEmoji: '👩',
      items: { wheat: 1 },
      reward: 200,
      xpReward: 100,
      expiresAt: NOW - 5000,
      expired: true,
    };
    const state = makeState({
      inventory: { wheat: 5 },
      orders: [order],
      coins: 50,
      totalEarned: 0,
      totalOrdersFulfilled: 0,
      orderStreak: 3,
      xp: 0,
      level: 1,
    });
    const result = gameReducer(state, { type: 'FULFILL_ORDER', orderId: 'o1' });
    expect(result.coins).toBe(50 + 50); // 25% of 200 = 50
    expect(result.totalEarned).toBe(50);
    expect(result.totalOrdersFulfilled).toBe(0); // not counted
    expect(result.orderStreak).toBe(0); // reset
    expect(result.xp).toBe(0); // no xp
  });

  it('does nothing if not enough items', () => {
    const order: NpcOrder = {
      id: 'o1',
      customerName: 'Test',
      customerEmoji: '👩',
      items: { wheat: 10 },
      reward: 100,
      xpReward: 50,
      expiresAt: NOW + 60000,
    };
    const state = makeState({
      inventory: { wheat: 5 },
      orders: [order],
      coins: 50,
    });
    const result = gameReducer(state, { type: 'FULFILL_ORDER', orderId: 'o1' });
    expect(result.orders.length).toBe(1);
    expect(result.inventory.wheat).toBe(5);
  });

  it('does nothing for invalid orderId', () => {
    const state = makeState({ orders: [], inventory: {} });
    const result = gameReducer(state, { type: 'FULFILL_ORDER', orderId: 'nonexistent' });
    expect(result).toEqual(state);
  });

  it('applies streak bonus', () => {
    const order: NpcOrder = {
      id: 'o1',
      customerName: 'Test',
      customerEmoji: '👩',
      items: { wheat: 1 },
      reward: 100,
      xpReward: 50,
      expiresAt: NOW + 60000,
    };
    const state = makeState({
      inventory: { wheat: 5 },
      orders: [order],
      coins: 0,
      totalEarned: 0,
      orderStreak: 5, // +50% bonus
      season: 'spring',
    });
    const result = gameReducer(state, { type: 'FULFILL_ORDER', orderId: 'o1' });
    // streakBonus = 1 + 5 * 0.1 = 1.5; reward = round(100 * 1 * 1.5) = 150
    expect(result.coins).toBe(150);
    expect(result.orderStreak).toBe(6);
  });

  it('applies winter craft/order bonus', () => {
    const order: NpcOrder = {
      id: 'o1',
      customerName: 'Test',
      customerEmoji: '👩',
      items: { wheat: 1 },
      reward: 100,
      xpReward: 50,
      expiresAt: NOW + 60000,
    };
    const state = makeState({
      inventory: { wheat: 5 },
      orders: [order],
      coins: 0,
      totalEarned: 0,
      orderStreak: 0,
      season: 'winter',
    });
    const result = gameReducer(state, { type: 'FULFILL_ORDER', orderId: 'o1' });
    // winter bonus = 1.5; streakBonus = 1; reward = round(100 * 1.5 * 1) = 150
    expect(result.coins).toBe(150);
  });

  it('removes items from inventory completely when all consumed', () => {
    const order: NpcOrder = {
      id: 'o1',
      customerName: 'Test',
      customerEmoji: '👩',
      items: { wheat: 3 },
      reward: 100,
      xpReward: 50,
      expiresAt: NOW + 60000,
    };
    const state = makeState({
      inventory: { wheat: 3 },
      orders: [order],
      coins: 50,
    });
    const result = gameReducer(state, { type: 'FULFILL_ORDER', orderId: 'o1' });
    expect(result.inventory.wheat).toBeUndefined();
  });

  it('grants order_champion achievement at 10 fulfilled', () => {
    const order: NpcOrder = {
      id: 'o1',
      customerName: 'Test',
      customerEmoji: '👩',
      items: { wheat: 1 },
      reward: 10,
      xpReward: 5,
      expiresAt: NOW + 60000,
    };
    const state = makeState({
      inventory: { wheat: 5 },
      orders: [order],
      totalOrdersFulfilled: 9,
      achievements: [],
    });
    const result = gameReducer(state, { type: 'FULFILL_ORDER', orderId: 'o1' });
    expect(result.achievements).toContain('order_champion');
  });
});

describe('UPGRADE_STORAGE action', () => {
  it('upgrades storage capacity with scaling cost', () => {
    const state = makeState({ coins: 500, storageCapacity: STORAGE_BASE });
    const cost = storageUpgradeCost(STORAGE_BASE);
    const result = gameReducer(state, { type: 'UPGRADE_STORAGE' });
    expect(result.storageCapacity).toBe(STORAGE_BASE + STORAGE_UPGRADE_AMOUNT);
    expect(result.coins).toBe(500 - cost);
  });

  it('does nothing if not enough coins', () => {
    const state = makeState({ coins: 0, storageCapacity: STORAGE_BASE });
    const result = gameReducer(state, { type: 'UPGRADE_STORAGE' });
    expect(result.storageCapacity).toBe(STORAGE_BASE);
  });

  it('does nothing if at max capacity', () => {
    const state = makeState({ coins: 99999, storageCapacity: STORAGE_MAX });
    const result = gameReducer(state, { type: 'UPGRADE_STORAGE' });
    expect(result.storageCapacity).toBe(STORAGE_MAX);
    expect(result.coins).toBe(99999);
  });

  it('cost increases with each upgrade', () => {
    const cost0 = storageUpgradeCost(STORAGE_BASE);
    const cost1 = storageUpgradeCost(STORAGE_BASE + STORAGE_UPGRADE_AMOUNT);
    expect(cost1).toBeGreaterThan(cost0);
  });
});

describe('CLAIM_QUEST action', () => {
  it('claims a completed quest', () => {
    const quest = {
      id: 'q1',
      type: 'harvest' as const,
      description: 'Test',
      emoji: '🌾',
      target: 3,
      progress: 3,
      reward: 50,
      xpReward: 20,
      completed: false,
    };
    const state = makeState({ dailyQuests: [quest], coins: 100, xp: 0, level: 1 });
    const result = gameReducer(state, { type: 'CLAIM_QUEST', questId: 'q1' });
    expect(result.coins).toBe(150);
    expect(result.xp).toBe(20);
    expect(result.dailyQuests[0].completed).toBe(true);
  });

  it('does nothing if quest not reached target', () => {
    const quest = {
      id: 'q1',
      type: 'harvest' as const,
      description: 'Test',
      emoji: '🌾',
      target: 3,
      progress: 1,
      reward: 50,
      xpReward: 20,
      completed: false,
    };
    const state = makeState({ dailyQuests: [quest], coins: 100 });
    const result = gameReducer(state, { type: 'CLAIM_QUEST', questId: 'q1' });
    expect(result.coins).toBe(100);
  });

  it('does nothing if already claimed', () => {
    const quest = {
      id: 'q1',
      type: 'harvest' as const,
      description: 'Test',
      emoji: '🌾',
      target: 3,
      progress: 3,
      reward: 50,
      xpReward: 20,
      completed: true,
    };
    const state = makeState({ dailyQuests: [quest], coins: 100 });
    const result = gameReducer(state, { type: 'CLAIM_QUEST', questId: 'q1' });
    expect(result.coins).toBe(100);
  });

  it('does nothing for invalid questId', () => {
    const state = makeState({ coins: 100 });
    const result = gameReducer(state, { type: 'CLAIM_QUEST', questId: 'nonexistent' });
    expect(result.coins).toBe(100);
  });
});

describe('SELL_ANIMAL action', () => {
  it('sells an animal for half buy price', () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const state = makeState({
      animals: [{ animalId: 'chicken', feedsLeft: 5, lastCollectedAt: NOW }],
      coins: 50,
    });
    const result = gameReducer(state, { type: 'SELL_ANIMAL', animalIndex: 0 });
    expect(result.animals.length).toBe(0);
    expect(result.coins).toBe(50 + Math.floor(ANIMALS.chicken.buyPrice * 0.5));
    vi.restoreAllMocks();
  });

  it('does nothing for invalid animalIndex', () => {
    const state = makeState({ animals: [], coins: 50 });
    const result = gameReducer(state, { type: 'SELL_ANIMAL', animalIndex: 0 });
    expect(result.coins).toBe(50);
  });
});

describe('UPGRADE_CRAFTING action', () => {
  it('upgrades crafting slots', () => {
    const cost = craftingUpgradeCost(CRAFTING_SLOTS_BASE);
    const state = makeState({ coins: cost + 100, craftingSlots: CRAFTING_SLOTS_BASE });
    const result = gameReducer(state, { type: 'UPGRADE_CRAFTING' });
    expect(result.craftingSlots).toBe(CRAFTING_SLOTS_BASE + 1);
    expect(result.coins).toBe(cost + 100 - cost);
  });

  it('does nothing at max slots', () => {
    const state = makeState({ coins: 99999, craftingSlots: CRAFTING_SLOTS_MAX });
    const result = gameReducer(state, { type: 'UPGRADE_CRAFTING' });
    expect(result.craftingSlots).toBe(CRAFTING_SLOTS_MAX);
  });

  it('does nothing if not enough coins', () => {
    const state = makeState({ coins: 0, craftingSlots: CRAFTING_SLOTS_BASE });
    const result = gameReducer(state, { type: 'UPGRADE_CRAFTING' });
    expect(result.craftingSlots).toBe(CRAFTING_SLOTS_BASE);
  });
});

describe('UPGRADE_PEN action', () => {
  it('upgrades pen capacity with scaling cost', () => {
    const cost = penUpgradeCost(MAX_ANIMALS);
    const state = makeState({ coins: cost + 100, maxAnimals: MAX_ANIMALS });
    const result = gameReducer(state, { type: 'UPGRADE_PEN' });
    expect(result.maxAnimals).toBe(MAX_ANIMALS + PEN_UPGRADE_AMOUNT);
    expect(result.coins).toBe(100);
  });

  it('cost doubles with each upgrade', () => {
    const cost0 = penUpgradeCost(MAX_ANIMALS);
    const cost1 = penUpgradeCost(MAX_ANIMALS + PEN_UPGRADE_AMOUNT);
    expect(cost1).toBe(cost0 * 2);
  });

  it('does nothing if not enough coins', () => {
    const state = makeState({ coins: 0, maxAnimals: MAX_ANIMALS });
    const result = gameReducer(state, { type: 'UPGRADE_PEN' });
    expect(result.maxAnimals).toBe(MAX_ANIMALS);
  });
});

describe('BUY_TRACTOR action', () => {
  it('buys tractor when all conditions met', () => {
    const inv: Inventory = {};
    for (const id of TRACTOR_REQUIRED_CRAFTS) {
      inv[id] = 1;
    }
    const state = makeState({
      coins: TRACTOR_PRICE + 100,
      level: 7,
      inventory: inv,
      hasTractor: false,
    });
    const result = gameReducer(state, { type: 'BUY_TRACTOR' });
    expect(result.hasTractor).toBe(true);
    expect(result.coins).toBe(100);
    // Required crafts consumed
    for (const id of TRACTOR_REQUIRED_CRAFTS) {
      expect(result.inventory[id]).toBeUndefined();
    }
  });

  it('does nothing if already has tractor', () => {
    const inv: Inventory = {};
    for (const id of TRACTOR_REQUIRED_CRAFTS) inv[id] = 1;
    const state = makeState({ coins: 99999, inventory: inv, hasTractor: true });
    const result = gameReducer(state, { type: 'BUY_TRACTOR' });
    expect(result.hasTractor).toBe(true);
    expect(result.coins).toBe(99999); // no change
  });


  it('does nothing if not enough coins', () => {
    const inv: Inventory = {};
    for (const id of TRACTOR_REQUIRED_CRAFTS) inv[id] = 1;
    const state = makeState({ coins: 0, inventory: inv, hasTractor: false });
    const result = gameReducer(state, { type: 'BUY_TRACTOR' });
    expect(result.hasTractor).toBe(false);
  });

  it('does nothing if missing required crafts', () => {
    const state = makeState({ coins: 99999, inventory: {}, hasTractor: false });
    const result = gameReducer(state, { type: 'BUY_TRACTOR' });
    expect(result.hasTractor).toBe(false);
  });
});

describe('BUY_AUTO_COLLECTOR action', () => {
  it('buys auto-collector when conditions met', () => {
    const inv: Inventory = {};
    for (const id of AUTO_COLLECTOR_REQUIRED_CRAFTS) inv[id] = 1;
    const state = makeState({
      coins: AUTO_COLLECTOR_PRICE + 100,
      level: 5,
      inventory: inv,
      hasAutoCollector: false,
    });
    const result = gameReducer(state, { type: 'BUY_AUTO_COLLECTOR' });
    expect(result.hasAutoCollector).toBe(true);
    expect(result.coins).toBe(100);
  });

  it('does nothing if already has auto-collector', () => {
    const inv: Inventory = {};
    for (const id of AUTO_COLLECTOR_REQUIRED_CRAFTS) inv[id] = 1;
    const state = makeState({ coins: 99999, inventory: inv, hasAutoCollector: true });
    const result = gameReducer(state, { type: 'BUY_AUTO_COLLECTOR' });
    expect(result.coins).toBe(99999);
  });

  it('does nothing if not enough coins', () => {
    const inv: Inventory = {};
    for (const id of AUTO_COLLECTOR_REQUIRED_CRAFTS) inv[id] = 1;
    const state = makeState({ coins: 0, inventory: inv, hasAutoCollector: false });
    const result = gameReducer(state, { type: 'BUY_AUTO_COLLECTOR' });
    expect(result.hasAutoCollector).toBe(false);
  });

  it('does nothing if missing required crafts', () => {
    const state = makeState({ coins: 99999, inventory: {}, hasAutoCollector: false });
    const result = gameReducer(state, { type: 'BUY_AUTO_COLLECTOR' });
    expect(result.hasAutoCollector).toBe(false);
  });
});

describe('BUY_AUTO_PLANTER action', () => {
  it('buys auto-planter when conditions met', () => {
    const inv: Inventory = {};
    for (const id of AUTO_PLANTER_REQUIRED_CRAFTS) inv[id] = 1;
    const state = makeState({
      coins: AUTO_PLANTER_PRICE + 100,
      level: 3,
      inventory: inv,
      hasAutoPlanter: false,
    });
    const result = gameReducer(state, { type: 'BUY_AUTO_PLANTER' });
    expect(result.hasAutoPlanter).toBe(true);
    expect(result.coins).toBe(100);
  });

  it('does nothing if already has auto-planter', () => {
    const inv: Inventory = {};
    for (const id of AUTO_PLANTER_REQUIRED_CRAFTS) inv[id] = 1;
    const state = makeState({ coins: 99999, inventory: inv, hasAutoPlanter: true });
    const result = gameReducer(state, { type: 'BUY_AUTO_PLANTER' });
    expect(result.coins).toBe(99999);
  });

  it('does nothing if not enough coins', () => {
    const inv: Inventory = {};
    for (const id of AUTO_PLANTER_REQUIRED_CRAFTS) inv[id] = 1;
    const state = makeState({ coins: 0, inventory: inv, hasAutoPlanter: false });
    const result = gameReducer(state, { type: 'BUY_AUTO_PLANTER' });
    expect(result.hasAutoPlanter).toBe(false);
  });

  it('does nothing if missing required crafts', () => {
    const state = makeState({ coins: 99999, inventory: {}, hasAutoPlanter: false });
    const result = gameReducer(state, { type: 'BUY_AUTO_PLANTER' });
    expect(result.hasAutoPlanter).toBe(false);
  });
});

describe('SET_AUTO_CROP action', () => {
  it('sets autoCropId on a plot', () => {
    const state = makeState({ hasAutoPlanter: true });
    const result = gameReducer(state, { type: 'SET_AUTO_CROP', plotIndex: 0, cropId: 'wheat' });
    expect((result.plots[0] as any).autoCropId).toBe('wheat');
  });

  it('does nothing if no auto-planter', () => {
    const state = makeState({ hasAutoPlanter: false });
    const result = gameReducer(state, { type: 'SET_AUTO_CROP', plotIndex: 0, cropId: 'wheat' });
    expect((result.plots[0] as any).autoCropId).toBeUndefined();
  });

  it('does nothing on locked plot', () => {
    const state = makeState({ hasAutoPlanter: true });
    const result = gameReducer(state, { type: 'SET_AUTO_CROP', plotIndex: INITIAL_UNLOCKED, cropId: 'wheat' });
    expect(result.plots[INITIAL_UNLOCKED].status).toBe('locked');
  });

  it('does nothing if already at max auto-plant plots', () => {
    const plots = [...createInitialState().plots];
    // Set AUTO_PLANTER_MAX_PLOTS plots with autoCropId
    for (let i = 0; i < AUTO_PLANTER_MAX_PLOTS; i++) {
      plots[i] = { status: 'empty', autoCropId: 'wheat' } as PlotState;
    }
    const state = makeState({ plots, hasAutoPlanter: true });
    // Try to set one more
    const nextIdx = AUTO_PLANTER_MAX_PLOTS;
    const result = gameReducer(state, { type: 'SET_AUTO_CROP', plotIndex: nextIdx, cropId: 'carrot' });
    expect((result.plots[nextIdx] as any).autoCropId).toBeUndefined();
  });
});

describe('CLEAR_AUTO_CROP action', () => {
  it('clears autoCropId from a plot', () => {
    const plots = [...createInitialState().plots];
    plots[0] = { status: 'empty', autoCropId: 'wheat' } as PlotState;
    const state = makeState({ plots });
    const result = gameReducer(state, { type: 'CLEAR_AUTO_CROP', plotIndex: 0 });
    expect((result.plots[0] as any).autoCropId).toBeUndefined();
  });

  it('does nothing on locked plot', () => {
    const state = makeState();
    const result = gameReducer(state, { type: 'CLEAR_AUTO_CROP', plotIndex: INITIAL_UNLOCKED });
    expect(result.plots[INITIAL_UNLOCKED].status).toBe('locked');
  });
});

describe('FRIEND_HARVEST_REWARD action', () => {
  it('adds coins and xp', () => {
    const state = makeState({ coins: 100, xp: 0, level: 1 });
    const result = gameReducer(state, { type: 'FRIEND_HARVEST_REWARD', coins: 10, xp: 5 });
    expect(result.coins).toBe(110);
    expect(result.xp).toBe(5);
  });

  it('does not mutate original state', () => {
    const state = makeState({ coins: 100, xp: 0, level: 1 });
    const origCoins = state.coins;
    gameReducer(state, { type: 'FRIEND_HARVEST_REWARD', coins: 10, xp: 5 });
    expect(state.coins).toBe(origCoins);
  });
});

describe('CLEAR_HELP_LOG action', () => {
  it('clears the help log', () => {
    const state = makeState();
    (state as any).helpLog = [{ helper: 'x', cropId: 'wheat', at: NOW }];
    const result = gameReducer(state, { type: 'CLEAR_HELP_LOG' });
    expect(result.helpLog).toEqual([]);
  });
});

describe('LOAD_SAVE action', () => {
  it('loads and migrates a saved state', () => {
    const saved = makeState({ coins: 999, level: 5 });
    const result = gameReducer(createInitialState(), { type: 'LOAD_SAVE', state: saved });
    expect(result.coins).toBe(999);
    expect(result.level).toBe(5);
  });
});

describe('RESET_GAME action', () => {
  it('returns fresh initial state', () => {
    const modified = makeState({ coins: 99999, level: 10 });
    const result = gameReducer(modified, { type: 'RESET_GAME' });
    expect(result.coins).toBe(STARTING_COINS);
    expect(result.level).toBe(1);
  });
});

describe('default / unknown action', () => {
  it('returns state unchanged', () => {
    const state = makeState();
    const result = gameReducer(state, { type: 'NONEXISTENT' } as any);
    expect(result).toEqual(state);
  });
});

describe('migrateSave', () => {
  it('fills in missing fields with defaults', () => {
    const partial = { coins: 500 };
    const result = migrateSave(partial);
    expect(result.coins).toBe(500);
    expect(result.level).toBe(1);
    expect(result.xp).toBe(0);
    expect(result.fertilizers).toBe(0);
    expect(result.hasTractor).toBe(false);
    expect(result.hasAutoCollector).toBe(false);
    expect(result.hasAutoPlanter).toBe(false);
    expect(result.maxAnimals).toBe(MAX_ANIMALS);
    expect(result.season).toBe('spring');
    expect(result.craftingSlots).toBe(CRAFTING_SLOTS_BASE);
    expect(result.storageCapacity).toBe(STORAGE_BASE);
    expect(result.marketPriceMultiplier).toBe(1);
  });

  it('preserves existing fields', () => {
    const state = makeState({ coins: 777, level: 8, xp: 100, fertilizers: 5, hasTractor: true });
    const result = migrateSave(state);
    expect(result.coins).toBe(777);
    expect(result.level).toBe(8);
    expect(result.xp).toBe(100);
    expect(result.fertilizers).toBe(5);
    expect(result.hasTractor).toBe(true);
  });

  it('wraps single crafting object into array', () => {
    const result = migrateSave({ crafting: { recipeId: 'bread', startedAt: NOW, craftTime: 120 } });
    expect(Array.isArray(result.crafting)).toBe(true);
    expect(result.crafting.length).toBe(1);
  });

  it('handles null crafting', () => {
    const result = migrateSave({ crafting: null });
    expect(Array.isArray(result.crafting)).toBe(true);
    expect(result.crafting.length).toBe(0);
  });

  it('handles empty object', () => {
    const result = migrateSave({});
    expect(result.coins).toBe(STARTING_COINS);
    expect(result.plots).toEqual([]);
    expect(result.animals).toEqual([]);
    expect(result.inventory).toEqual({});
  });
});

describe('XP and leveling', () => {
  it('levels up when enough XP accumulated via craft', () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const xpNeeded = xpForLevel(1);
    const slot: CraftingSlot = { recipeId: 'bread', startedAt: NOW - 200 * 1000, craftTime: 120 };
    const state = makeState({
      crafting: [slot],
      inventory: {},
      xp: xpNeeded - 1,
      level: 1,
      storageCapacity: 50,
    });
    const result = gameReducer(state, { type: 'COLLECT_CRAFT', slotIndex: 0 });
    // bread gives 15 XP, should push over threshold
    expect(result.level).toBeGreaterThanOrEqual(2);
    vi.restoreAllMocks();
  });

  it('does not gain XP at max level', () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const slot: CraftingSlot = { recipeId: 'bread', startedAt: NOW - 200 * 1000, craftTime: 120 };
    const state = makeState({ crafting: [slot], inventory: {}, xp: 0, level: MAX_LEVEL, storageCapacity: 50 });
    const result = gameReducer(state, { type: 'COLLECT_CRAFT', slotIndex: 0 });
    expect(result.level).toBe(MAX_LEVEL);
    expect(result.xp).toBe(0);
    vi.restoreAllMocks();
  });

  it('grants level_5 achievement', () => {
    const xpNeeded = xpForLevel(4);
    const state = makeState({
      xp: xpNeeded - 1,
      level: 4,
      achievements: [],
      coins: 100,
    });
    const result = gameReducer(state, { type: 'FRIEND_HARVEST_REWARD', coins: 0, xp: xpNeeded });
    expect(result.level).toBeGreaterThanOrEqual(5);
    expect(result.achievements).toContain('level_5');
  });
});
