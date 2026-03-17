export type CropId = 'wheat' | 'tomato' | 'corn' | 'carrot' | 'potato' | 'sunflower' | 'parsley' | 'cucumber' | 'cabbage' | 'eggplant' | 'strawberry' | 'blueberry' | 'watermelon' | 'melon';

export interface CropDef {
  id: CropId;
  name: string;
  emoji: string;
  seedEmoji: string;
  growthTime: number;
  seedPrice: number;
  sellPrice: number;
  unlockLevel: number;
  xpReward: number;
  seasonOnly?: Season;
}

export type AnimalId = 'chicken' | 'cow' | 'pig' | 'sheep' | 'rabbit' | 'goat' | 'duck' | 'cat' | 'dog' | 'horse' | 'turkey' | 'bee' | 'goose';

export interface AnimalDef {
  id: AnimalId;
  name: string;
  emoji: string;
  productEmoji: string;
  productName: string;
  productionTime: number;
  buyPrice: number;
  productSellPrice: number;
  unlockLevel: number;
  xpReward: number;
}

export type PlotState =
  | { status: 'locked' }
  | { status: 'empty'; soilLevel?: number }
  | { status: 'growing'; cropId: CropId; plantedAt: number; growthTime: number; fertilized?: boolean; soilLevel?: number }
  | { status: 'ready'; cropId: CropId; soilLevel?: number }
  | { status: 'gathering_wood'; startedAt: number; gatherTime: number; soilLevel?: number }
  | { status: 'wood_ready'; soilLevel?: number };

export type CraftedId = 'bread' | 'cheese' | 'butter' | 'cake' | 'sweater' | 'salad' | 'truffle_oil' | 'pickle' | 'meat_pie' | 'gourmet_dish' | 'jam' | 'pizza' | 'borscht' | 'juice' | 'pirozhki' | 'ratatouille' | 'smoothie' | 'farmer_pie' | 'royal_feast' | 'golden_honey' | 'honey_cake' | 'roast_turkey' | 'down_pillow' | 'horse_carriage' | 'campfire' | 'warm_scarf' | 'wooden_chest';

export type ItemId = CropId | `${AnimalId}_product` | CraftedId | 'firewood';

export type Inventory = Partial<Record<ItemId, number>>;

export interface RecipeDef {
  id: CraftedId;
  name: string;
  emoji: string;
  ingredients: Partial<Record<ItemId, number>>;
  craftTime: number;
  sellPrice: number;
  unlockLevel: number;
  xpReward: number;
}

export interface NpcOrder {
  id: string;
  customerName: string;
  customerEmoji: string;
  items: Partial<Record<ItemId, number>>;
  reward: number;
  xpReward: number;
  expiresAt: number;
}

export interface AnimalSlot {
  animalId: AnimalId;
  lastCollectedAt: number;
}

export interface PlayerProfile {
  name: string;
  avatar: string;
}

export interface NeighborState {
  id: string;
  name: string;
  avatar: string;
  helpedToday: boolean;
  giftCollectedToday: boolean;
}

export interface CraftingSlot {
  recipeId: CraftedId;
  startedAt: number;
  craftTime: number;
  quantity?: number;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type WeatherType = 'sunny' | 'rainy' | 'stormy' | 'snowy';

export interface WeatherState {
  type: WeatherType;
  changesAt: number;
}

export type AchievementId =
  | 'first_harvest'
  | 'first_animal'
  | 'first_craft'
  | 'rich_farmer'
  | 'full_farm'
  | 'master_crafter'
  | 'order_champion'
  | 'social_butterfly'
  | 'level_5'
  | 'level_max';

export interface AchievementDef {
  id: AchievementId;
  name: string;
  emoji: string;
  description: string;
  reward: number;
}

export type QuestType = 'harvest' | 'sell' | 'craft' | 'help' | 'earn';

export interface DailyQuest {
  id: string;
  type: QuestType;
  description: string;
  emoji: string;
  target: number;
  progress: number;
  reward: number;
  xpReward: number;
  completed: boolean;
}

export interface GameState {
  coins: number;
  plots: PlotState[];
  inventory: Inventory;
  animals: AnimalSlot[];
  lastTickAt: number;
  totalEarned: number;
  xp: number;
  level: number;
  fertilizers: number;
  animalFeed: number;
  feedActiveUntil: number; // timestamp — when feed effect expires
  profile: PlayerProfile;
  neighbors: NeighborState[];
  lastDailyReset: number;
  crafting: CraftingSlot[];
  craftingSlots: number;
  orders: NpcOrder[];
  storageCapacity: number;
  marketPriceMultiplier: number;
  season: Season;
  seasonStartedAt: number;
  weather: WeatherState;
  achievements: AchievementId[];
  dailyQuests: DailyQuest[];
  totalHarvested: number;
  totalCrafted: number;
  totalOrdersFulfilled: number;
  maxAnimals: number;
  hasTractor: boolean;
  hasAutoCollector: boolean;
  helpLog?: { helper: string; cropId: CropId; at: number }[];
}

export type GameAction =
  | { type: 'TICK'; now: number }
  | { type: 'PLANT_CROP'; plotIndex: number; cropId: CropId }
  | { type: 'HARVEST'; plotIndex: number }
  | { type: 'UNLOCK_PLOT'; plotIndex: number }
  | { type: 'BUY_ANIMAL'; animalId: AnimalId }
  | { type: 'COLLECT_PRODUCT'; animalIndex: number }
  | { type: 'SELL_ITEM'; itemId: ItemId; quantity: number }
  | { type: 'BUY_FERTILIZER'; quantity: number }
  | { type: 'USE_FERTILIZER'; plotIndex: number }
  | { type: 'SET_PROFILE'; profile: PlayerProfile }
  | { type: 'HELP_NEIGHBOR'; neighborId: string }
  | { type: 'COLLECT_GIFT'; neighborId: string }
  | { type: 'START_CRAFT'; recipeId: CraftedId; quantity?: number }
  | { type: 'COLLECT_CRAFT'; slotIndex: number }
  | { type: 'UPGRADE_CRAFTING' }
  | { type: 'FULFILL_ORDER'; orderId: string }
  | { type: 'UPGRADE_STORAGE' }
  | { type: 'CLAIM_QUEST'; questId: string }
  | { type: 'SELL_ANIMAL'; animalIndex: number }
  | { type: 'UPGRADE_PEN' }
  | { type: 'BUY_TRACTOR' }
  | { type: 'BUY_AUTO_COLLECTOR' }
  | { type: 'GATHER_WOOD'; plotIndex: number }
  | { type: 'COLLECT_WOOD'; plotIndex: number }
  | { type: 'UPGRADE_SOIL'; plotIndex: number }
  | { type: 'FRIEND_HARVEST_REWARD'; coins: number; xp: number }
  | { type: 'CLEAR_HELP_LOG' }
  | { type: 'LOAD_SAVE'; state: GameState }
  | { type: 'RESET_GAME' };
