import type { GameState, GameAction, PlotState, Inventory, ItemId, AchievementId, DailyQuest } from '../types';
import { CROPS } from '../constants/crops';
import { ANIMALS, INITIAL_FEEDS } from '../constants/animals';
import { TOTAL_PLOTS, INITIAL_UNLOCKED } from '../constants/grid';
import { STARTING_COINS, MAX_ANIMALS, penUpgradeCost, PEN_UPGRADE_AMOUNT, FERTILIZER_PRICE, FERTILIZER_SPEED_MULTIPLIER, xpForLevel, MAX_LEVEL, CRAFTING_SLOTS_BASE, CRAFTING_SLOTS_MAX, craftingUpgradeCost, TRACTOR_PRICE, TRACTOR_REQUIRED_CRAFTS, TRACTOR_REQUIRED_LEVEL, AUTO_COLLECTOR_PRICE, AUTO_COLLECTOR_REQUIRED_CRAFTS, AUTO_COLLECTOR_REQUIRED_LEVEL, AUTO_PLANTER_PRICE, AUTO_PLANTER_REQUIRED_CRAFTS, AUTO_PLANTER_REQUIRED_LEVEL, AUTO_PLANTER_MAX_PLOTS, TRACTOR_FUEL_PRICE, TRACTOR_FUEL_AMOUNT, TRACTOR_FUEL_PREMIUM_AMOUNT, KALEB_FOOD_PRICE, KALEB_FOOD_AMOUNT, KALEB_FOOD_PREMIUM_AMOUNT } from '../constants/game';
import { WOOD_GATHER_TIME, WOOD_XP_REWARD, WOOD_SELL_PRICE, SOIL_UPGRADE_COSTS, SOIL_GROWTH_BONUS, MAX_SOIL_LEVEL, SOIL_HARVESTS_PER_LEVEL, WINTER_CRAFT_ORDER_BONUS, WINTER_ORDER_XP_BONUS } from '../constants/winter';
import { DEFAULT_NEIGHBORS, HELP_XP_REWARD, HELP_COIN_REWARD, GIFT_COIN_REWARD, GIFT_FERTILIZER_CHANCE } from '../constants/neighbors';
import { RECIPES, STORAGE_BASE, STORAGE_UPGRADE_AMOUNT, STORAGE_MAX, storageUpgradeCost } from '../constants/recipes';
import { SEASON_CROP_MULTIPLIER, WEATHER_CROP_MULTIPLIER, SEASONAL_CROP_BONUS, SEASONAL_BONUS_MULTIPLIER, SEASON_PRICE_MULTIPLIER } from '../constants/seasons';
import { ACHIEVEMENTS } from '../constants/achievements';
import { generateDailyQuests } from '../constants/quests';
import { getUnlockCost, getUnlockLevel, getAnimalPrice } from '../engine/economy';
import { tick } from '../engine/gameLoop';

function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function resetDailyIfNeeded(state: GameState): GameState {
  const now = Date.now();
  if (isSameDay(state.lastDailyReset, now)) return state;
  return {
    ...state,
    lastDailyReset: now,
    neighbors: state.neighbors.map((n) => ({ ...n, helpedToday: false, giftCollectedToday: false })),
    dailyQuests: generateDailyQuests(state.level ?? 1),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateInventory(inv: any): Inventory {
  const result = { ...(inv ?? {}) } as Inventory;
  // Rename radish → pepper
  if ('radish' in result) {
    (result as any).pepper = ((result as any).pepper ?? 0) + ((result as any).radish ?? 0);
    delete (result as any).radish;
  }
  // Rename beet → peas
  if ('beet' in result) {
    (result as any).peas = ((result as any).peas ?? 0) + ((result as any).beet ?? 0);
    delete (result as any).beet;
  }
  return result;
}

export function migrateSave(state: any): GameState {
  return resetDailyIfNeeded({
    coins: state.coins ?? STARTING_COINS,
    plots: ((state.plots ?? []) as any[]).map((p: any) => {
      let plot = p;
      if (plot.cropId === 'radish') plot = { ...plot, cropId: 'pepper' };
      if (plot.cropId === 'beet') plot = { ...plot, cropId: 'peas' };
      if (plot.autoCropId === 'radish') plot = { ...plot, autoCropId: 'pepper' };
      if (plot.autoCropId === 'beet') plot = { ...plot, autoCropId: 'peas' };
      return plot;
    }) as PlotState[],
    inventory: migrateInventory(state.inventory),
    animals: (state.animals ?? []).map((a: any) => ({ ...a, feedsLeft: a.feedsLeft ?? INITIAL_FEEDS })),
    lastTickAt: state.lastTickAt ?? Date.now(),
    totalEarned: state.totalEarned ?? 0,
    xp: state.xp ?? 0,
    level: state.level ?? 1,
    fertilizers: state.fertilizers ?? 0,
    animalFeed: state.animalFeed ?? 0,
    feedActiveUntil: state.feedActiveUntil ?? 0,
    profile: state.profile ?? { name: '', avatar: '👨‍🌾' },
    neighbors: state.neighbors ?? DEFAULT_NEIGHBORS.map((n) => ({ ...n })),
    lastDailyReset: state.lastDailyReset ?? Date.now(),
    crafting: Array.isArray(state.crafting) ? state.crafting : (state.crafting ? [state.crafting] : []),
    craftingSlots: state.craftingSlots ?? CRAFTING_SLOTS_BASE,
    orders: state.orders ?? [],
    storageCapacity: state.storageCapacity ?? STORAGE_BASE,
    marketPriceMultiplier: state.marketPriceMultiplier ?? 1,
    season: state.season ?? 'spring',
    seasonStartedAt: state.seasonStartedAt ?? Date.now(),
    weather: state.weather ?? { type: 'sunny' as const, changesAt: Date.now() + 120000 },
    achievements: state.achievements ?? [],
    dailyQuests: state.dailyQuests ?? generateDailyQuests(state.level ?? 1),
    totalHarvested: state.totalHarvested ?? 0,
    totalCrafted: state.totalCrafted ?? 0,
    totalOrdersFulfilled: state.totalOrdersFulfilled ?? 0,
    orderStreak: state.orderStreak ?? 0,
    maxAnimals: state.maxAnimals ?? MAX_ANIMALS,
    hasTractor: state.hasTractor ?? false,
    hasAutoCollector: state.hasAutoCollector ?? false,
    hasAutoPlanter: state.hasAutoPlanter ?? false,
    tractorFuel: state.tractorFuel ?? 0,
    kalebFood: state.kalebFood ?? 0,
  } as GameState);
}

export function createInitialState(): GameState {
  const plots: PlotState[] = Array.from({ length: TOTAL_PLOTS }, (_, i) =>
    i < INITIAL_UNLOCKED ? { status: 'empty' as const } : { status: 'locked' as const }
  );

  return {
    coins: STARTING_COINS,
    plots,
    inventory: {},
    animals: [],
    lastTickAt: Date.now(),
    totalEarned: 0,
    xp: 0,
    level: 1,
    fertilizers: 0,
    animalFeed: 0,
    feedActiveUntil: 0,
    profile: { name: '', avatar: '👨‍🌾' },
    neighbors: DEFAULT_NEIGHBORS.map((n) => ({ ...n })),
    lastDailyReset: Date.now(),
    crafting: [],
    craftingSlots: CRAFTING_SLOTS_BASE,
    orders: [],
    storageCapacity: STORAGE_BASE,
    marketPriceMultiplier: 1,
    season: 'spring',
    seasonStartedAt: Date.now(),
    weather: { type: 'sunny', changesAt: Date.now() + 120000 },
    achievements: [],
    dailyQuests: generateDailyQuests(),
    totalHarvested: 0,
    totalCrafted: 0,
    totalOrdersFulfilled: 0,
    orderStreak: 0,
    maxAnimals: MAX_ANIMALS,
    hasTractor: false,
    hasAutoCollector: false,
    hasAutoPlanter: false,
    tractorFuel: 0,
    kalebFood: 0,
  };
}

function addToInventory(inv: Inventory, itemId: ItemId, qty: number): Inventory {
  return { ...inv, [itemId]: (inv[itemId] ?? 0) + qty };
}

function progressQuests(state: GameState, type: DailyQuest['type'], amount: number): GameState {
  const quests = state.dailyQuests.map((q) => {
    if (q.type !== type || q.completed) return q;
    return { ...q, progress: Math.min(q.target, q.progress + amount) };
  });
  return { ...state, dailyQuests: quests };
}

function checkAchievements(state: GameState): GameState {
  const earned = [...state.achievements];
  let bonus = 0;

  function grant(id: AchievementId) {
    if (!earned.includes(id)) {
      earned.push(id);
      bonus += ACHIEVEMENTS[id].reward;
    }
  }

  if (state.totalHarvested >= 1) grant('first_harvest');
  if (state.animals.length >= 1) grant('first_animal');
  if (state.totalCrafted >= 1) grant('first_craft');
  if (state.totalEarned >= 1000) grant('rich_farmer');
  if (state.plots.every((p) => p.status !== 'locked')) grant('full_farm');
  if (state.totalCrafted >= 10) grant('master_crafter');
  if (state.totalOrdersFulfilled >= 10) grant('order_champion');
  if (state.neighbors.every((n) => n.helpedToday)) grant('social_butterfly');
  if (state.level >= 5) grant('level_5');
  if (state.level >= MAX_LEVEL) grant('level_max');

  if (earned.length === state.achievements.length) return state;
  return { ...state, achievements: earned, coins: state.coins + bonus };
}

function addXp(state: GameState, amount: number): GameState {
  if (state.level >= MAX_LEVEL) return state;

  let xp = state.xp + amount;
  let level = state.level;

  while (level < MAX_LEVEL && xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level++;
  }

  return { ...state, xp, level };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  // Check daily reset on every action
  state = resetDailyIfNeeded(state);

  switch (action.type) {
    case 'TICK':
      return tick(state, action.now);

    case 'PLANT_CROP': {
      const { plotIndex, cropId } = action;
      const plot = state.plots[plotIndex];
      if (!plot || plot.status !== 'empty') return state;

      const crop = CROPS[cropId];
      if (state.season === 'winter') return state;
      if (state.coins < crop.seedPrice) return state;
      if (crop.unlockLevel > state.level) return state;
      if (crop.seasonOnly && crop.seasonOnly !== state.season) return state;

      // Apply season + weather growth multipliers
      let growthTime = crop.growthTime * SEASON_CROP_MULTIPLIER[state.season] * WEATHER_CROP_MULTIPLIER[state.weather.type];
      const bonusCrops = SEASONAL_CROP_BONUS[state.season];
      if (bonusCrops && bonusCrops.includes(cropId)) {
        growthTime *= SEASONAL_BONUS_MULTIPLIER;
      }

      // Apply soil level bonus
      const soilLevel = (plot as any).soilLevel ?? 0;
      growthTime *= SOIL_GROWTH_BONUS[soilLevel];

      const newPlots = [...state.plots];
      const growingPlot: PlotState = {
        status: 'growing',
        cropId,
        plantedAt: Date.now(),
        growthTime: Math.round(growthTime),
        soilLevel: (plot as any).soilLevel,
        soilHarvestsLeft: (plot as any).soilHarvestsLeft,
      };
      if ((plot as any).autoCropId) (growingPlot as any).autoCropId = (plot as any).autoCropId;
      newPlots[plotIndex] = growingPlot;

      return { ...state, plots: newPlots, coins: state.coins - crop.seedPrice };
    }

    case 'HARVEST': {
      const { plotIndex } = action;
      const plot = state.plots[plotIndex];
      if (!plot || plot.status !== 'ready') return state;

      const crop = CROPS[plot.cropId];
      const newPlots = [...state.plots];

      // Decrement soil harvests, reset soil level when depleted
      let newSoilLevel = plot.soilLevel;
      let newSoilHarvests = plot.soilHarvestsLeft;
      if (newSoilLevel && newSoilLevel > 0 && newSoilHarvests != null) {
        newSoilHarvests = newSoilHarvests - 1;
        if (newSoilHarvests <= 0) {
          newSoilLevel = undefined;
          newSoilHarvests = undefined;
        }
      }

      const emptyPlot: PlotState = { status: 'empty', soilLevel: newSoilLevel, soilHarvestsLeft: newSoilHarvests };
      if (plot.autoCropId) (emptyPlot as any).autoCropId = plot.autoCropId;
      newPlots[plotIndex] = emptyPlot;

      let harvested: GameState = {
        ...state,
        plots: newPlots,
        inventory: addToInventory(state.inventory, plot.cropId, 1),
        totalEarned: state.totalEarned + crop.sellPrice,
        totalHarvested: state.totalHarvested + 1,
      };

      // XP only from crafts and orders, not from harvesting
      harvested = progressQuests(harvested, 'harvest', 1);
      return checkAchievements(harvested);
    }

    case 'GATHER_WOOD': {
      const { plotIndex } = action;
      const plot = state.plots[plotIndex];
      if (!plot || plot.status !== 'empty') return state;
      if (state.season !== 'winter') return state;

      const newPlots = [...state.plots];
      newPlots[plotIndex] = {
        status: 'gathering_wood',
        startedAt: Date.now(),
        gatherTime: WOOD_GATHER_TIME,
        soilLevel: plot.soilLevel,
        soilHarvestsLeft: plot.soilHarvestsLeft,
      };
      return { ...state, plots: newPlots };
    }

    case 'COLLECT_WOOD': {
      const { plotIndex } = action;
      const plot = state.plots[plotIndex];
      if (!plot || plot.status !== 'wood_ready') return state;

      const newPlots = [...state.plots];
      newPlots[plotIndex] = { status: 'empty', soilLevel: plot.soilLevel, soilHarvestsLeft: plot.soilHarvestsLeft };

      let newState: GameState = {
        ...state,
        plots: newPlots,
        inventory: addToInventory(state.inventory, 'firewood', 1),
        totalHarvested: state.totalHarvested + 1,
      };
      newState = addXp(newState, WOOD_XP_REWARD);
      return newState;
    }

    case 'UPGRADE_SOIL': {
      const { plotIndex } = action;
      const plot = state.plots[plotIndex];
      if (!plot || plot.status !== 'empty') return state;
      if (state.season !== 'winter') return state;

      const currentLevel = plot.soilLevel ?? 0;
      if (currentLevel >= MAX_SOIL_LEVEL) return state;

      const cost = SOIL_UPGRADE_COSTS[currentLevel];
      if (state.coins < cost) return state;

      const newPlots = [...state.plots];
      newPlots[plotIndex] = { status: 'empty', soilLevel: currentLevel + 1, soilHarvestsLeft: SOIL_HARVESTS_PER_LEVEL };
      return { ...state, plots: newPlots, coins: state.coins - cost };
    }

    case 'UNLOCK_PLOT': {
      const { plotIndex } = action;
      const plot = state.plots[plotIndex];
      if (!plot || plot.status !== 'locked') return state;

      const cost = getUnlockCost(state.plots, plotIndex);
      if (state.coins < cost) return state;

      const requiredLevel = getUnlockLevel(state.plots, plotIndex);
      if (state.level < requiredLevel) return state;

      const newPlots = [...state.plots];
      newPlots[plotIndex] = { status: 'empty' };

      return checkAchievements({ ...state, plots: newPlots, coins: state.coins - cost });
    }

    case 'BUY_ANIMAL': {
      const { animalId } = action;
      if (state.animals.length >= (state.maxAnimals ?? MAX_ANIMALS)) return state;

      const animal = ANIMALS[animalId];
      const price = getAnimalPrice(animalId, state.animals);
      if (state.coins < price) return state;
      if (animal.unlockLevel > state.level) return state;

      const bought: GameState = {
        ...state,
        coins: state.coins - price,
        animals: [...state.animals, { animalId, lastCollectedAt: Date.now(), feedsLeft: INITIAL_FEEDS }],
      };
      return checkAchievements(bought);
    }

    case 'COLLECT_PRODUCT': {
      const { animalIndex } = action;
      const slot = state.animals[animalIndex];
      if (!slot) return state;
      if ((slot.feedsLeft ?? 0) <= 0) return state; // hungry — can't produce

      const animal = ANIMALS[slot.animalId];
      const elapsed = (Date.now() - slot.lastCollectedAt) / 1000;
      if (elapsed < animal.productionTime) return state;

      const newAnimals = [...state.animals];
      newAnimals[animalIndex] = { ...slot, lastCollectedAt: Date.now(), feedsLeft: (slot.feedsLeft ?? 0) - 1 };
      const itemId: ItemId = `${slot.animalId}_product`;

      const qty = state.season === 'summer' ? 2 : 1;
      // XP only from crafts and orders, not from collecting
      return {
        ...state,
        animals: newAnimals,
        inventory: addToInventory(state.inventory, itemId, qty),
      };
    }

    case 'SELL_ITEM': {
      const { itemId, quantity } = action;
      const current = state.inventory[itemId] ?? 0;
      if (current < quantity) return state;

      let price = 0;
      if (itemId === 'firewood') {
        price = WOOD_SELL_PRICE;
      } else if (itemId.endsWith('_product')) {
        const animalId = itemId.replace('_product', '') as keyof typeof ANIMALS;
        price = ANIMALS[animalId].productSellPrice;
      } else if (itemId in RECIPES) {
        price = RECIPES[itemId as keyof typeof RECIPES].sellPrice;
      } else {
        price = CROPS[itemId as keyof typeof CROPS].sellPrice;
      }

      const totalPrice = Math.round(price * quantity * state.marketPriceMultiplier * SEASON_PRICE_MULTIPLIER[state.season]);
      const newInventory = { ...state.inventory };
      const remaining = current - quantity;
      if (remaining <= 0) {
        delete newInventory[itemId];
      } else {
        newInventory[itemId] = remaining;
      }

      let sold: GameState = {
        ...state,
        inventory: newInventory,
        coins: state.coins + totalPrice,
      };
      sold = progressQuests(sold, 'sell', quantity);
      sold = progressQuests(sold, 'earn', totalPrice);
      return checkAchievements(sold);
    }

    case 'BUY_FERTILIZER': {
      const { quantity } = action;
      const cost = FERTILIZER_PRICE * quantity;
      if (state.coins < cost) return state;

      return {
        ...state,
        coins: state.coins - cost,
        fertilizers: state.fertilizers + quantity,
      };
    }

    case 'USE_FERTILIZER': {
      const { plotIndex } = action;
      if (state.fertilizers <= 0) return state;

      const plot = state.plots[plotIndex];
      if (!plot || plot.status !== 'growing' || plot.fertilized) return state;

      const newPlots = [...state.plots];
      const newGrowthTime = plot.growthTime * FERTILIZER_SPEED_MULTIPLIER;
      newPlots[plotIndex] = { ...plot, growthTime: newGrowthTime, fertilized: true };

      return { ...state, plots: newPlots, fertilizers: state.fertilizers - 1 };
    }

    case 'SET_PROFILE':
      return { ...state, profile: action.profile };

    case 'HELP_NEIGHBOR': {
      const { neighborId } = action;
      const idx = state.neighbors.findIndex((n) => n.id === neighborId);
      if (idx === -1) return state;
      if (state.neighbors[idx].helpedToday) return state;

      const newNeighbors = [...state.neighbors];
      newNeighbors[idx] = { ...newNeighbors[idx], helpedToday: true };

      let helped: GameState = {
        ...state,
        neighbors: newNeighbors,
        coins: state.coins + HELP_COIN_REWARD,
      };

      helped = addXp(helped, HELP_XP_REWARD);
      helped = progressQuests(helped, 'help', 1);
      return checkAchievements(helped);
    }

    case 'COLLECT_GIFT': {
      const { neighborId } = action;
      const idx = state.neighbors.findIndex((n) => n.id === neighborId);
      if (idx === -1) return state;
      if (state.neighbors[idx].giftCollectedToday) return state;

      const newNeighbors = [...state.neighbors];
      newNeighbors[idx] = { ...newNeighbors[idx], giftCollectedToday: true };

      const bonusFertilizer = Math.random() < GIFT_FERTILIZER_CHANCE ? 1 : 0;

      return {
        ...state,
        neighbors: newNeighbors,
        coins: state.coins + GIFT_COIN_REWARD,
        fertilizers: state.fertilizers + bonusFertilizer,
      };
    }

    case 'START_CRAFT': {
      const { recipeId, quantity: rawQty } = action;
      const qty = Math.max(1, rawQty ?? 1);
      // Winter: unlimited crafting slots; otherwise check limit
      if (state.season !== 'winter' && state.crafting.length >= state.craftingSlots) return state;

      const recipe = RECIPES[recipeId];
      if (recipe.unlockLevel > state.level) return state;

      // Check ingredients × qty
      for (const [itemId, needed] of Object.entries(recipe.ingredients)) {
        if ((state.inventory[itemId as ItemId] ?? 0) < (needed ?? 0) * qty) return state;
      }

      // Deduct ingredients × qty
      const newInventory = { ...state.inventory };
      for (const [itemId, needed] of Object.entries(recipe.ingredients)) {
        const remaining = (newInventory[itemId as ItemId] ?? 0) - (needed ?? 0) * qty;
        if (remaining <= 0) {
          delete newInventory[itemId as ItemId];
        } else {
          newInventory[itemId as ItemId] = remaining;
        }
      }

      // Winter: craft time ×0.5
      const craftTime = recipe.craftTime * qty * (state.season === 'winter' ? 0.5 : 1);

      return {
        ...state,
        inventory: newInventory,
        crafting: [...state.crafting, { recipeId, startedAt: Date.now(), craftTime, quantity: qty }],
      };
    }

    case 'COLLECT_CRAFT': {
      const { slotIndex } = action;
      const slot = state.crafting[slotIndex];
      if (!slot) return state;

      const elapsed = (Date.now() - slot.startedAt) / 1000;
      if (elapsed < slot.craftTime) return state;

      const recipe = RECIPES[slot.recipeId];
      const qty = slot.quantity ?? 1;
      const totalItems = Object.values(state.inventory).reduce((sum, n) => sum + (n ?? 0), 0);
      if (totalItems >= state.storageCapacity) return state;

      const newCrafting = state.crafting.filter((_, i) => i !== slotIndex);

      let crafted: GameState = {
        ...state,
        crafting: newCrafting,
        inventory: addToInventory(state.inventory, slot.recipeId, qty),
        totalCrafted: state.totalCrafted + qty,
      };

      crafted = addXp(crafted, recipe.xpReward * qty);
      crafted = progressQuests(crafted, 'craft', qty);
      return checkAchievements(crafted);
    }

    case 'FULFILL_ORDER': {
      const { orderId } = action;
      const orderIdx = state.orders.findIndex((o) => o.id === orderId);
      if (orderIdx === -1) return state;

      const order = state.orders[orderIdx];

      // Check all items available
      for (const [itemId, needed] of Object.entries(order.items)) {
        if ((state.inventory[itemId as ItemId] ?? 0) < (needed ?? 0)) return state;
      }

      // Deduct items
      const newInventory = { ...state.inventory };
      for (const [itemId, needed] of Object.entries(order.items)) {
        const remaining = (newInventory[itemId as ItemId] ?? 0) - (needed ?? 0);
        if (remaining <= 0) {
          delete newInventory[itemId as ItemId];
        } else {
          newInventory[itemId as ItemId] = remaining;
        }
      }

      const newOrders = state.orders.filter((_, i) => i !== orderIdx);

      // Expired: no reward, no XP, streak reset — just frees the slot
      const isExpired = !!order.expired;

      // Streak bonus: +10% per streak, max +100% (streak 10)
      const newStreak = isExpired ? 0 : Math.min((state.orderStreak ?? 0) + 1, 10);
      const streakBonus = isExpired ? 1 : (1 + (state.orderStreak ?? 0) * 0.1);

      const baseReward = Math.round(order.reward * (state.season === 'winter' ? WINTER_CRAFT_ORDER_BONUS : 1) * streakBonus);
      const finalReward = isExpired ? Math.round(order.reward * 0.25) : baseReward;
      const finalXp = isExpired ? 0 : Math.round(order.xpReward * (state.season === 'winter' ? WINTER_ORDER_XP_BONUS : 1));

      let fulfilled: GameState = {
        ...state,
        inventory: newInventory,
        orders: newOrders,
        coins: state.coins + finalReward,
        totalEarned: state.totalEarned + finalReward,
        totalOrdersFulfilled: state.totalOrdersFulfilled + (isExpired ? 0 : 1),
        orderStreak: newStreak,
      };

      fulfilled = addXp(fulfilled, finalXp);
      fulfilled = progressQuests(fulfilled, 'earn', finalReward);
      return checkAchievements(fulfilled);
    }

    case 'UPGRADE_STORAGE': {
      if (state.storageCapacity >= STORAGE_MAX) return state;
      const upgradeCost = storageUpgradeCost(state.storageCapacity);
      if (state.coins < upgradeCost) return state;

      return {
        ...state,
        coins: state.coins - upgradeCost,
        storageCapacity: Math.min(state.storageCapacity + STORAGE_UPGRADE_AMOUNT, STORAGE_MAX),
      };
    }

    case 'CLAIM_QUEST': {
      const { questId } = action;
      const qIdx = state.dailyQuests.findIndex((q) => q.id === questId);
      if (qIdx === -1) return state;

      const quest = state.dailyQuests[qIdx];
      if (quest.completed || quest.progress < quest.target) return state;

      const newQuests = [...state.dailyQuests];
      newQuests[qIdx] = { ...quest, completed: true };

      let claimed: GameState = {
        ...state,
        dailyQuests: newQuests,
        coins: state.coins + quest.reward,
      };

      return addXp(claimed, quest.xpReward);
    }

    case 'SELL_ANIMAL': {
      const { animalIndex } = action;
      const slot = state.animals[animalIndex];
      if (!slot) return state;

      const animal = ANIMALS[slot.animalId];
      const sellPrice = Math.floor(animal.buyPrice * 0.5);
      const newAnimals = state.animals.filter((_, i) => i !== animalIndex);

      return { ...state, animals: newAnimals, coins: state.coins + sellPrice };
    }

    case 'UPGRADE_CRAFTING': {
      if (state.craftingSlots >= CRAFTING_SLOTS_MAX) return state;
      const cost = craftingUpgradeCost(state.craftingSlots);
      if (state.coins < cost) return state;

      return {
        ...state,
        coins: state.coins - cost,
        craftingSlots: state.craftingSlots + 1,
      };
    }

    case 'UPGRADE_PEN': {
      const cost = penUpgradeCost(state.maxAnimals);
      if (state.coins < cost) return state;

      return {
        ...state,
        coins: state.coins - cost,
        maxAnimals: state.maxAnimals + PEN_UPGRADE_AMOUNT,
      };
    }

    case 'BUY_TRACTOR': {
      if (state.hasTractor) return state;
      if (state.level < TRACTOR_REQUIRED_LEVEL) return state;
      if (state.coins < TRACTOR_PRICE) return state;

      // Must have crafted all required items (at least 1 in inventory)
      for (const craftId of TRACTOR_REQUIRED_CRAFTS) {
        if ((state.inventory[craftId] ?? 0) < 1) return state;
      }

      // Consume the required crafts
      const newInventory = { ...state.inventory };
      for (const craftId of TRACTOR_REQUIRED_CRAFTS) {
        const remaining = (newInventory[craftId] ?? 0) - 1;
        if (remaining <= 0) {
          delete newInventory[craftId];
        } else {
          newInventory[craftId] = remaining;
        }
      }

      return {
        ...state,
        coins: state.coins - TRACTOR_PRICE,
        inventory: newInventory,
        hasTractor: true,
      };
    }

    case 'BUY_AUTO_COLLECTOR': {
      if (state.hasAutoCollector) return state;
      if (state.level < AUTO_COLLECTOR_REQUIRED_LEVEL) return state;
      if (state.coins < AUTO_COLLECTOR_PRICE) return state;

      for (const craftId of AUTO_COLLECTOR_REQUIRED_CRAFTS) {
        if ((state.inventory[craftId] ?? 0) < 1) return state;
      }

      const newInv2 = { ...state.inventory };
      for (const craftId of AUTO_COLLECTOR_REQUIRED_CRAFTS) {
        const remaining = (newInv2[craftId] ?? 0) - 1;
        if (remaining <= 0) {
          delete newInv2[craftId];
        } else {
          newInv2[craftId] = remaining;
        }
      }

      return {
        ...state,
        coins: state.coins - AUTO_COLLECTOR_PRICE,
        inventory: newInv2,
        hasAutoCollector: true,
      };
    }

    case 'BUY_AUTO_PLANTER': {
      if (state.hasAutoPlanter) return state;
      if (state.level < AUTO_PLANTER_REQUIRED_LEVEL) return state;
      if (state.coins < AUTO_PLANTER_PRICE) return state;

      for (const craftId of AUTO_PLANTER_REQUIRED_CRAFTS) {
        if ((state.inventory[craftId] ?? 0) < 1) return state;
      }

      const newInvAP = { ...state.inventory };
      for (const craftId of AUTO_PLANTER_REQUIRED_CRAFTS) {
        const remaining = (newInvAP[craftId] ?? 0) - 1;
        if (remaining <= 0) {
          delete newInvAP[craftId];
        } else {
          newInvAP[craftId] = remaining;
        }
      }

      return {
        ...state,
        coins: state.coins - AUTO_PLANTER_PRICE,
        inventory: newInvAP,
        hasAutoPlanter: true,
      };
    }

    case 'SET_AUTO_CROP': {
      if (!state.hasAutoPlanter) return state;
      const { plotIndex, cropId } = action;
      const plot = state.plots[plotIndex];
      if (!plot || plot.status === 'locked') return state;

      // Check max auto-plant plots (excluding this one if it already has autoCropId)
      const currentAutoCount = state.plots.filter(
        (p, i) => i !== plotIndex && 'autoCropId' in p && (p as any).autoCropId
      ).length;
      if (currentAutoCount >= AUTO_PLANTER_MAX_PLOTS) return state;

      const newPlots = [...state.plots];
      newPlots[plotIndex] = { ...plot, autoCropId: cropId } as PlotState;
      return { ...state, plots: newPlots };
    }

    case 'CLEAR_AUTO_CROP': {
      const { plotIndex } = action;
      const plot = state.plots[plotIndex];
      if (!plot || plot.status === 'locked') return state;

      const newPlots = [...state.plots];
      const cleaned = { ...plot };
      delete (cleaned as any).autoCropId;
      newPlots[plotIndex] = cleaned as PlotState;
      return { ...state, plots: newPlots };
    }

    case 'BUY_TRACTOR_FUEL': {
      if (!state.hasTractor) return state;
      if (action.premium) {
        // Premium: 2 firewood + 20💰 → 200 units
        if (state.coins < 20) return state;
        if ((state.inventory.firewood ?? 0) < 2) return state;
        const remaining = (state.inventory.firewood ?? 0) - 2;
        const inv: Inventory = { ...state.inventory };
        if (remaining <= 0) { delete inv.firewood; } else { inv.firewood = remaining; }
        return { ...state, coins: state.coins - 20, inventory: inv, tractorFuel: state.tractorFuel + TRACTOR_FUEL_PREMIUM_AMOUNT };
      }
      if (state.coins < TRACTOR_FUEL_PRICE) return state;
      return { ...state, coins: state.coins - TRACTOR_FUEL_PRICE, tractorFuel: state.tractorFuel + TRACTOR_FUEL_AMOUNT };
    }

    case 'BUY_KALEB_FOOD': {
      if (!state.hasAutoCollector) return state;
      if (action.premium) {
        // Premium: 2 wheat + 10💰 → 200 units
        if (state.coins < 10) return state;
        if ((state.inventory.wheat ?? 0) < 2) return state;
        const remainingWheat = (state.inventory.wheat ?? 0) - 2;
        const inv: Inventory = { ...state.inventory };
        if (remainingWheat <= 0) { delete inv.wheat; } else { inv.wheat = remainingWheat; }
        return { ...state, coins: state.coins - 10, inventory: inv, kalebFood: state.kalebFood + KALEB_FOOD_PREMIUM_AMOUNT };
      }
      if (state.coins < KALEB_FOOD_PRICE) return state;
      return { ...state, coins: state.coins - KALEB_FOOD_PRICE, kalebFood: state.kalebFood + KALEB_FOOD_AMOUNT };
    }

    case 'FEED_ANIMAL': {
      const { animalIndex } = action;
      const slot = state.animals[animalIndex];
      if (!slot) return state;

      const animal = ANIMALS[slot.animalId];
      const feedCrop = animal.feedCrop;
      const have = state.inventory[feedCrop] ?? 0;
      if (have < 1) return state;

      const newInvFeed = { ...state.inventory };
      const remaining = have - 1;
      if (remaining <= 0) { delete newInvFeed[feedCrop]; } else { newInvFeed[feedCrop] = remaining; }

      const newAnimals = [...state.animals];
      newAnimals[animalIndex] = { ...slot, feedsLeft: (slot.feedsLeft ?? 0) + animal.feedsPerUnit };

      return { ...state, inventory: newInvFeed, animals: newAnimals };
    }

    case 'FEED_ALL_ANIMALS': {
      let inv = { ...state.inventory };
      const newAnimals = state.animals.map((slot) => {
        if ((slot.feedsLeft ?? 0) > 0) return slot; // still has food, skip
        const animal = ANIMALS[slot.animalId];
        const feedCrop = animal.feedCrop;
        const have = inv[feedCrop] ?? 0;
        if (have < 1) return slot; // no food available
        const remaining = have - 1;
        if (remaining <= 0) { delete inv[feedCrop]; } else { inv[feedCrop] = remaining; }
        return { ...slot, feedsLeft: animal.feedsPerUnit };
      });

      return { ...state, inventory: inv, animals: newAnimals };
    }

    case 'FRIEND_HARVEST_REWARD': {
      let s = { ...state, coins: state.coins + action.coins };
      s = addXp(s, action.xp);
      s = progressQuests(s, 'help', 1);
      return checkAchievements(s);
    }

    case 'CLEAR_HELP_LOG':
      return { ...state, helpLog: [] };

    case 'LOAD_SAVE':
      return migrateSave(action.state);

    case 'RESET_GAME':
      return createInitialState();

    default:
      return state;
  }
}
