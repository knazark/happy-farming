import type { GameState, GameAction, PlotState, Inventory, ItemId, AchievementId, DailyQuest } from '../types';
import { CROPS } from '../constants/crops';
import { ANIMALS } from '../constants/animals';
import { TOTAL_PLOTS, INITIAL_UNLOCKED } from '../constants/grid';
import { STARTING_COINS, MAX_ANIMALS, PEN_UPGRADE_COST, PEN_UPGRADE_AMOUNT, FERTILIZER_PRICE, FERTILIZER_SPEED_MULTIPLIER, FEED_PRICE, FEED_DURATION, FEED_SPEED_MULTIPLIER, xpForLevel, MAX_LEVEL, CRAFTING_SLOTS_BASE, CRAFTING_SLOTS_MAX, craftingUpgradeCost, TRACTOR_PRICE, TRACTOR_REQUIRED_CRAFTS } from '../constants/game';
import { DEFAULT_NEIGHBORS, HELP_XP_REWARD, HELP_COIN_REWARD, GIFT_COIN_REWARD, GIFT_FERTILIZER_CHANCE } from '../constants/neighbors';
import { RECIPES, STORAGE_BASE, STORAGE_UPGRADE_COST, STORAGE_UPGRADE_AMOUNT } from '../constants/recipes';
import { SEASON_CROP_MULTIPLIER, WEATHER_CROP_MULTIPLIER, SEASONAL_CROP_BONUS, SEASONAL_BONUS_MULTIPLIER, SEASON_PRICE_MULTIPLIER } from '../constants/seasons';
import { ACHIEVEMENTS } from '../constants/achievements';
import { generateDailyQuests } from '../constants/quests';
import { getUnlockCost, getUnlockLevel } from '../engine/economy';
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
    dailyQuests: generateDailyQuests(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrateSave(state: any): GameState {
  return resetDailyIfNeeded({
    coins: state.coins ?? STARTING_COINS,
    plots: (state.plots as PlotState[]) ?? [],
    inventory: (state.inventory as Inventory) ?? {},
    animals: state.animals ?? [],
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
    dailyQuests: state.dailyQuests ?? generateDailyQuests(),
    totalHarvested: state.totalHarvested ?? 0,
    totalCrafted: state.totalCrafted ?? 0,
    totalOrdersFulfilled: state.totalOrdersFulfilled ?? 0,
    maxAnimals: state.maxAnimals ?? MAX_ANIMALS,
    hasTractor: state.hasTractor ?? false,
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
    maxAnimals: MAX_ANIMALS,
    hasTractor: false,
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
      if (state.season === 'winter') return state; // No planting in winter
      if (state.coins < crop.seedPrice) return state;
      if (crop.unlockLevel > state.level) return state;
      if (crop.seasonOnly && crop.seasonOnly !== state.season) return state;

      // Apply season + weather growth multipliers
      let growthTime = crop.growthTime * SEASON_CROP_MULTIPLIER[state.season] * WEATHER_CROP_MULTIPLIER[state.weather.type];
      const bonusCrops = SEASONAL_CROP_BONUS[state.season];
      if (bonusCrops && bonusCrops.includes(cropId)) {
        growthTime *= SEASONAL_BONUS_MULTIPLIER;
      }

      const newPlots = [...state.plots];
      newPlots[plotIndex] = {
        status: 'growing',
        cropId,
        plantedAt: Date.now(),
        growthTime: Math.round(growthTime),
      };

      return { ...state, plots: newPlots, coins: state.coins - crop.seedPrice };
    }

    case 'HARVEST': {
      const { plotIndex } = action;
      const plot = state.plots[plotIndex];
      if (!plot || plot.status !== 'ready') return state;

      const crop = CROPS[plot.cropId];
      const newPlots = [...state.plots];
      newPlots[plotIndex] = { status: 'empty' };

      let harvested: GameState = {
        ...state,
        plots: newPlots,
        inventory: addToInventory(state.inventory, plot.cropId, 1),
        totalEarned: state.totalEarned + crop.sellPrice,
        totalHarvested: state.totalHarvested + 1,
      };

      harvested = addXp(harvested, crop.xpReward);
      harvested = progressQuests(harvested, 'harvest', 1);
      return checkAchievements(harvested);
    }

    case 'UNLOCK_PLOT': {
      const { plotIndex } = action;
      const plot = state.plots[plotIndex];
      if (!plot || plot.status !== 'locked') return state;

      const cost = getUnlockCost(state.plots);
      if (state.coins < cost) return state;

      const requiredLevel = getUnlockLevel(state.plots);
      if (state.level < requiredLevel) return state;

      const newPlots = [...state.plots];
      newPlots[plotIndex] = { status: 'empty' };

      return checkAchievements({ ...state, plots: newPlots, coins: state.coins - cost });
    }

    case 'BUY_ANIMAL': {
      const { animalId } = action;
      if (state.animals.length >= (state.maxAnimals ?? MAX_ANIMALS)) return state;

      const animal = ANIMALS[animalId];
      if (state.coins < animal.buyPrice) return state;
      if (animal.unlockLevel > state.level) return state;

      const bought: GameState = {
        ...state,
        coins: state.coins - animal.buyPrice,
        animals: [...state.animals, { animalId, lastCollectedAt: Date.now() }],
      };
      return checkAchievements(bought);
    }

    case 'COLLECT_PRODUCT': {
      const { animalIndex } = action;
      const slot = state.animals[animalIndex];
      if (!slot) return state;

      const animal = ANIMALS[slot.animalId];
      const elapsed = (Date.now() - slot.lastCollectedAt) / 1000;
      if (elapsed < animal.productionTime) return state;

      const newAnimals = [...state.animals];
      newAnimals[animalIndex] = { ...slot, lastCollectedAt: Date.now() };
      const itemId: ItemId = `${slot.animalId}_product`;

      const collected = {
        ...state,
        animals: newAnimals,
        inventory: addToInventory(state.inventory, itemId, 1),
      };

      return addXp(collected, animal.xpReward);
    }

    case 'SELL_ITEM': {
      const { itemId, quantity } = action;
      const current = state.inventory[itemId] ?? 0;
      if (current < quantity) return state;

      let price = 0;
      if (itemId.endsWith('_product')) {
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
      if (state.crafting.length >= state.craftingSlots) return state;

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

      return {
        ...state,
        inventory: newInventory,
        crafting: [...state.crafting, { recipeId, startedAt: Date.now(), craftTime: recipe.craftTime * qty, quantity: qty }],
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

      let fulfilled: GameState = {
        ...state,
        inventory: newInventory,
        orders: newOrders,
        coins: state.coins + order.reward,
        totalEarned: state.totalEarned + order.reward,
        totalOrdersFulfilled: state.totalOrdersFulfilled + 1,
      };

      fulfilled = addXp(fulfilled, order.xpReward);
      fulfilled = progressQuests(fulfilled, 'earn', order.reward);
      return checkAchievements(fulfilled);
    }

    case 'UPGRADE_STORAGE': {
      if (state.coins < STORAGE_UPGRADE_COST) return state;

      return {
        ...state,
        coins: state.coins - STORAGE_UPGRADE_COST,
        storageCapacity: state.storageCapacity + STORAGE_UPGRADE_AMOUNT,
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
      const cost = PEN_UPGRADE_COST;
      if (state.coins < cost) return state;

      return {
        ...state,
        coins: state.coins - cost,
        maxAnimals: state.maxAnimals + PEN_UPGRADE_AMOUNT,
      };
    }

    case 'BUY_TRACTOR': {
      if (state.hasTractor) return state;
      if (state.coins < TRACTOR_PRICE) return state;

      // Must have crafted all 3 required items (at least 1 in inventory)
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

    case 'LOAD_SAVE':
      return migrateSave(action.state);

    case 'RESET_GAME':
      return createInitialState();

    default:
      return state;
  }
}
