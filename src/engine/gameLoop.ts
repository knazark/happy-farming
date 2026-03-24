import type { GameState, PlotState, NpcOrder, ItemId, WeatherType, Inventory, CropId } from '../types';
import { CROPS } from '../constants/crops';
import { ANIMALS } from '../constants/animals';
import { SEASON_CROP_MULTIPLIER, WEATHER_CROP_MULTIPLIER, SEASONAL_CROP_BONUS, SEASONAL_BONUS_MULTIPLIER } from '../constants/seasons';
import { SOIL_GROWTH_BONUS } from '../constants/winter';
import { NPC_CUSTOMERS, getMaxOrders, ORDER_EXPIRE_TIME, ORDER_REWARD_MULTIPLIER, MARKET_FLUCTUATION_MIN, MARKET_FLUCTUATION_MAX, MARKET_UPDATE_INTERVAL } from '../constants/recipes';
import { SEASON_DURATION, SEASON_ORDER, WEATHER_BY_SEASON, WEATHER_DURATION_MIN, WEATHER_DURATION_MAX } from '../constants/seasons';

function generateOrder(level: number, now: number): NpcOrder {
  const customer = NPC_CUSTOMERS[Math.floor(Math.random() * NPC_CUSTOMERS.length)];
  const items: Partial<Record<ItemId, number>> = {};
  let baseValue = 0;

  // Difficulty scales with level: more items, higher quantities
  const availableCrops = Object.values(CROPS).filter((c) => c.unlockLevel <= level);
  const availableAnimals = Object.values(ANIMALS).filter((a) => a.unlockLevel <= level);

  // Lv1-2: 1-2 items, Lv3-5: 1-3 items, Lv6+: 2-3 items
  const minItems = level >= 6 ? 2 : 1;
  const maxItems = level >= 3 ? 3 : 2;
  const numItems = minItems + Math.floor(Math.random() * (maxItems - minItems + 1));

  // Quantity scales: base 1-3, +1 per 3 levels
  const qtyBonus = Math.floor(level / 3);

  for (let i = 0; i < numItems; i++) {
    if (Math.random() < 0.6 && availableCrops.length > 0) {
      const crop = availableCrops[Math.floor(Math.random() * availableCrops.length)];
      const qty = Math.floor(Math.random() * 3) + 1 + qtyBonus;
      items[crop.id] = (items[crop.id] ?? 0) + qty;
      baseValue += crop.sellPrice * qty;
    } else if (availableAnimals.length > 0) {
      const animal = availableAnimals[Math.floor(Math.random() * availableAnimals.length)];
      const itemId: ItemId = `${animal.id}_product`;
      const qty = Math.floor(Math.random() * 2) + 1 + Math.floor(qtyBonus / 2);
      items[itemId] = (items[itemId] ?? 0) + qty;
      baseValue += animal.productSellPrice * qty;
    }
  }

  // Fallback: if no items were added, add 1 wheat
  if (Object.keys(items).length === 0) {
    items.wheat = 1;
    baseValue = CROPS.wheat.sellPrice;
  }

  return {
    id: `order_${now}_${Math.random().toString(36).slice(2, 8)}`,
    customerName: customer.name,
    customerEmoji: customer.emoji,
    items,
    reward: Math.round(baseValue * ORDER_REWARD_MULTIPLIER),
    xpReward: Math.round(baseValue * 0.3),
    expiresAt: now + ORDER_EXPIRE_TIME * 1000,
  };
}

export function tick(state: GameState, now: number): GameState {
  let changed = false;
  let newState = state;

  // Check growing plots
  const newPlots: PlotState[] = state.plots.map((plot) => {
    if (plot.status === 'growing') {
      const elapsed = (now - plot.plantedAt) / 1000;
      if (elapsed >= plot.growthTime) {
        changed = true;
        const ready: PlotState = { status: 'ready' as const, cropId: plot.cropId, soilLevel: plot.soilLevel, soilHarvestsLeft: plot.soilHarvestsLeft };
        if (plot.autoCropId) (ready as any).autoCropId = plot.autoCropId;
        return ready;
      }
    }
    if (plot.status === 'gathering_wood') {
      const elapsed = (now - plot.startedAt) / 1000;
      if (elapsed >= plot.gatherTime) {
        changed = true;
        return { status: 'wood_ready' as const, soilLevel: plot.soilLevel, soilHarvestsLeft: plot.soilHarvestsLeft };
      }
    }
    return plot;
  });

  if (changed) {
    newState = { ...newState, plots: newPlots };
  }

  // Tractor: auto-harvest ready crops (skip if inventory full or no fuel)
  const totalItemsForTractor = Object.values(newState.inventory).reduce((s, n) => s + (n ?? 0), 0);
  if (newState.hasTractor && newState.tractorFuel > 0 && totalItemsForTractor < newState.storageCapacity) {
    let tractorHarvested = false;
    let fuelUsed = 0;
    const tractorPlots: PlotState[] = newState.plots.map((plot) => {
      if (plot.status === 'ready' && fuelUsed < newState.tractorFuel) {
        tractorHarvested = true;
        fuelUsed++;
        // Decrement soil harvests
        let soilLevel = plot.soilLevel;
        let soilHarvestsLeft = plot.soilHarvestsLeft;
        if (soilLevel && soilLevel > 0 && soilHarvestsLeft != null) {
          soilHarvestsLeft -= 1;
          if (soilHarvestsLeft <= 0) {
            soilLevel = undefined;
            soilHarvestsLeft = undefined;
          }
        }
        const empty: PlotState = { status: 'empty' as const, soilLevel, soilHarvestsLeft };
        if (plot.autoCropId) (empty as any).autoCropId = plot.autoCropId;
        return empty;
      }
      return plot;
    });

    if (tractorHarvested) {
      let inv: Inventory = { ...newState.inventory };
      let earned = 0;
      let harvestCount = 0;

      for (let i = 0; i < newState.plots.length; i++) {
        const plot = newState.plots[i];
        if (plot.status === 'ready' && tractorPlots[i].status !== 'ready') {
          const crop = CROPS[plot.cropId];
          inv = { ...inv, [plot.cropId]: (inv[plot.cropId] ?? 0) + 1 };
          earned += crop.sellPrice;
          harvestCount++;
        }
      }

      newState = {
        ...newState,
        plots: tractorPlots,
        inventory: inv,
        totalEarned: newState.totalEarned + earned,
        totalHarvested: newState.totalHarvested + harvestCount,
        tractorFuel: newState.tractorFuel - fuelUsed,
      };
    }
  }

  // Auto-collector: auto-collect ready animal products (skip if inventory full, no Kaleb food, or animal hungry)
  const totalItemsForCollector = Object.values(newState.inventory).reduce((s, n) => s + (n ?? 0), 0);
  if (newState.hasAutoCollector && newState.kalebFood > 0 && totalItemsForCollector < newState.storageCapacity) {
    let foodUsed = 0;
    const collectorAnimals = newState.animals.map((slot) => {
      if (foodUsed >= newState.kalebFood) return slot;
      if ((slot.feedsLeft ?? 0) <= 0) return slot; // hungry — skip
      const animal = ANIMALS[slot.animalId];
      const isFeedActive = now < newState.feedActiveUntil;
      const effectiveTime = isFeedActive ? animal.productionTime * 0.5 : animal.productionTime;
      const elapsed = (now - slot.lastCollectedAt) / 1000;
      if (elapsed >= effectiveTime) {
        foodUsed++;
        return { ...slot, lastCollectedAt: now, feedsLeft: (slot.feedsLeft ?? 0) - 1 };
      }
      return slot;
    });

    if (foodUsed > 0) {
      let inv: Inventory = { ...newState.inventory };

      for (let i = 0; i < newState.animals.length; i++) {
        const slot = newState.animals[i];
        const newSlot = collectorAnimals[i];
        // Only count animals that were actually collected (lastCollectedAt changed)
        if (slot.lastCollectedAt !== newSlot.lastCollectedAt) {
          const itemId = `${slot.animalId}_product` as ItemId;
          inv = { ...inv, [itemId]: (inv[itemId] ?? 0) + 1 };
        }
      }

      newState = {
        ...newState,
        animals: collectorAnimals,
        inventory: inv,
        kalebFood: newState.kalebFood - foodUsed,
      };
    }
  }

  // Auto-planter: auto-plant on empty plots with autoCropId
  if (newState.hasAutoPlanter && newState.season !== 'winter') {
    let autoPlanted = false;
    let autoPlots = [...newState.plots];
    let autoCoins = newState.coins;

    for (let i = 0; i < autoPlots.length; i++) {
      const plot = autoPlots[i];
      if (plot.status !== 'empty' || !('autoCropId' in plot) || !(plot as any).autoCropId) continue;

      const cropId: CropId = (plot as any).autoCropId;
      const crop = CROPS[cropId];
      if (!crop) continue;
      if (crop.unlockLevel > newState.level) continue;
      if (crop.seasonOnly && crop.seasonOnly !== newState.season) continue;
      if (autoCoins < crop.seedPrice) continue;

      // Calculate growth time (same as reducer PLANT_CROP)
      let growthTime = crop.growthTime * SEASON_CROP_MULTIPLIER[newState.season] * WEATHER_CROP_MULTIPLIER[newState.weather.type];
      const bonusCrops = SEASONAL_CROP_BONUS[newState.season];
      if (bonusCrops && bonusCrops.includes(cropId)) {
        growthTime *= SEASONAL_BONUS_MULTIPLIER;
      }
      const soilLevel = (plot as any).soilLevel ?? 0;
      growthTime *= SOIL_GROWTH_BONUS[soilLevel];

      const growing: PlotState = {
        status: 'growing',
        cropId,
        plantedAt: now,
        growthTime: Math.round(growthTime),
        soilLevel: (plot as any).soilLevel,
        soilHarvestsLeft: (plot as any).soilHarvestsLeft,
        autoCropId: cropId,
      };
      autoPlots[i] = growing;
      autoCoins -= crop.seedPrice;
      autoPlanted = true;
    }

    if (autoPlanted) {
      newState = { ...newState, plots: autoPlots, coins: autoCoins };
    }
  }

  // Mark expired orders (don't delete — player must fulfill them to get new ones)
  {
    let changed = false;
    const updatedOrders = newState.orders.map((o) => {
      if (!o.expired && o.expiresAt <= now) {
        changed = true;
        return { ...o, expired: true };
      }
      return o;
    });
    if (changed) {
      // Reset streak when any order expires
      newState = { ...newState, orders: updatedOrders, orderStreak: 0 };
    }
  }

  // Generate new orders only if total count < max (expired orders still occupy slots)
  const maxOrders = getMaxOrders(newState.level);
  if (newState.orders.length < maxOrders) {
    const newOrders = [...newState.orders];
    while (newOrders.length < maxOrders) {
      newOrders.push(generateOrder(newState.level, now));
    }
    newState = { ...newState, orders: newOrders };
  }

  // Update market price multiplier periodically
  const timeSinceTick = (now - state.lastTickAt) / 1000;
  if (timeSinceTick >= MARKET_UPDATE_INTERVAL) {
    const range = MARKET_FLUCTUATION_MAX - MARKET_FLUCTUATION_MIN;
    const newMultiplier = MARKET_FLUCTUATION_MIN + Math.random() * range;
    newState = { ...newState, marketPriceMultiplier: Math.round(newMultiplier * 100) / 100 };
  }

  // Season rotation
  const seasonElapsed = (now - newState.seasonStartedAt) / 1000;
  if (seasonElapsed >= SEASON_DURATION) {
    const currentIdx = SEASON_ORDER.indexOf(newState.season);
    const nextSeason = SEASON_ORDER[(currentIdx + 1) % SEASON_ORDER.length];
    newState = { ...newState, season: nextSeason, seasonStartedAt: now };
  }

  // Weather changes
  if (now >= newState.weather.changesAt) {
    const newWeather = pickWeather(newState.season);
    const duration = (WEATHER_DURATION_MIN + Math.random() * (WEATHER_DURATION_MAX - WEATHER_DURATION_MIN)) * 1000;
    newState = { ...newState, weather: { type: newWeather, changesAt: now + duration } };
  }

  return { ...newState, lastTickAt: now };
}

function pickWeather(season: typeof SEASON_ORDER[number]): WeatherType {
  const config = WEATHER_BY_SEASON[season];
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < config.types.length; i++) {
    cumulative += config.weights[i];
    if (r < cumulative) return config.types[i];
  }
  return config.types[0];
}
