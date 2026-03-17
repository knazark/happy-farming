import type { GameState, PlotState, NpcOrder, ItemId, WeatherType, Inventory } from '../types';
import { CROPS } from '../constants/crops';
import { ANIMALS } from '../constants/animals';
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
        return { status: 'ready' as const, cropId: plot.cropId, soilLevel: plot.soilLevel };
      }
    }
    if (plot.status === 'gathering_wood') {
      const elapsed = (now - plot.startedAt) / 1000;
      if (elapsed >= plot.gatherTime) {
        changed = true;
        return { status: 'wood_ready' as const, soilLevel: plot.soilLevel };
      }
    }
    return plot;
  });

  if (changed) {
    newState = { ...newState, plots: newPlots };
  }

  // Tractor: auto-harvest ready crops
  if (newState.hasTractor) {
    let tractorHarvested = false;
    const tractorPlots: PlotState[] = newState.plots.map((plot) => {
      if (plot.status === 'ready') {
        tractorHarvested = true;
        return { status: 'empty' as const, soilLevel: plot.soilLevel };
      }
      return plot;
    });

    if (tractorHarvested) {
      let inv: Inventory = { ...newState.inventory };
      let earned = 0;
      let harvestCount = 0;

      for (const plot of newState.plots) {
        if (plot.status === 'ready') {
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
      };
    }
  }

  // Auto-collector: auto-collect ready animal products
  if (newState.hasAutoCollector) {
    let collectorCollected = false;
    const collectorAnimals = newState.animals.map((slot) => {
      const animal = ANIMALS[slot.animalId];
      const isFeedActive = now < newState.feedActiveUntil;
      const effectiveTime = isFeedActive ? animal.productionTime * 0.5 : animal.productionTime;
      const elapsed = (now - slot.lastCollectedAt) / 1000;
      if (elapsed >= effectiveTime) {
        collectorCollected = true;
        return { ...slot, lastCollectedAt: now };
      }
      return slot;
    });

    if (collectorCollected) {
      let inv: Inventory = { ...newState.inventory };

      for (let i = 0; i < newState.animals.length; i++) {
        const slot = newState.animals[i];
        const animal = ANIMALS[slot.animalId];
        const isFeedActive = now < newState.feedActiveUntil;
        const effectiveTime = isFeedActive ? animal.productionTime * 0.5 : animal.productionTime;
        const elapsed = (now - slot.lastCollectedAt) / 1000;
        if (elapsed >= effectiveTime) {
          const itemId = `${slot.animalId}_product` as ItemId;
          inv = { ...inv, [itemId]: (inv[itemId] ?? 0) + 1 };
        }
      }

      newState = {
        ...newState,
        animals: collectorAnimals,
        inventory: inv,
      };
    }
  }

  // Remove expired orders
  const activeOrders = newState.orders.filter((o) => o.expiresAt > now);
  if (activeOrders.length !== newState.orders.length) {
    newState = { ...newState, orders: activeOrders };
  }

  // Generate new orders if below max (scales with level)
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
