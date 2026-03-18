import type { RecipeDef, CraftedId } from '../types';

export const RECIPES: Record<CraftedId, RecipeDef> = {
  bread: {
    id: 'bread',
    name: 'Хліб',
    emoji: '🍞',
    ingredients: { wheat: 3 },
    craftTime: 120,       // 2 хв
    sellPrice: 45,
    unlockLevel: 2,
    xpReward: 15,
  },
  salad: {
    id: 'salad',
    name: 'Салат',
    emoji: '🥗',
    ingredients: { tomato: 2, carrot: 2 },
    craftTime: 90,        // 1.5 хв
    sellPrice: 120,
    unlockLevel: 2,
    xpReward: 12,
  },
  cake: {
    id: 'cake',
    name: 'Торт',
    emoji: '🎂',
    ingredients: { wheat: 2, chicken_product: 3 },
    craftTime: 300,       // 5 хв
    sellPrice: 120,
    unlockLevel: 3,
    xpReward: 20,
  },
  sweater: {
    id: 'sweater',
    name: 'Светр',
    emoji: '🧶',
    ingredients: { sheep_product: 3 },
    craftTime: 360,       // 6 хв
    sellPrice: 180,
    unlockLevel: 4,
    xpReward: 30,
  },
  butter: {
    id: 'butter',
    name: 'Масло',
    emoji: '🧈',
    ingredients: { cow_product: 2, sunflower: 2 },
    craftTime: 180,       // 3 хв
    sellPrice: 280,
    unlockLevel: 4,
    xpReward: 22,
  },
  cheese: {
    id: 'cheese',
    name: 'Сир',
    emoji: '🧀',
    ingredients: { goat_product: 2, wheat: 1, parsley: 1 },
    craftTime: 240,       // 4 хв
    sellPrice: 250,
    unlockLevel: 5,
    xpReward: 25,
  },
  pickle: {
    id: 'pickle',
    name: 'Соління',
    emoji: '🥒',
    ingredients: { cucumber: 3, parsley: 2 },
    craftTime: 150,       // 2.5 хв
    sellPrice: 150,
    unlockLevel: 6,
    xpReward: 18,
  },
  truffle_oil: {
    id: 'truffle_oil',
    name: 'Трюфельна олія',
    emoji: '🫒',
    ingredients: { pig_product: 2, sunflower: 1 },
    craftTime: 480,       // 8 хв
    sellPrice: 450,
    unlockLevel: 7,
    xpReward: 40,
  },
  meat_pie: {
    id: 'meat_pie',
    name: 'М\'ясний пиріг',
    emoji: '🥧',
    ingredients: { wheat: 3, rabbit_product: 2 },
    craftTime: 240,       // 4 хв
    sellPrice: 200,
    unlockLevel: 8,
    xpReward: 35,
  },
  jam: {
    id: 'jam',
    name: 'Варення',
    emoji: '🍯',
    ingredients: { strawberry: 3, blueberry: 1 },
    craftTime: 200,       // 3.3 хв
    sellPrice: 480,
    unlockLevel: 6,
    xpReward: 20,
  },
  pizza: {
    id: 'pizza',
    name: 'Піца',
    emoji: '🍕',
    ingredients: { wheat: 2, tomato: 2, cheese: 1 },
    craftTime: 300,       // 5 хв
    sellPrice: 420,
    unlockLevel: 6,
    xpReward: 28,
  },
  borscht: {
    id: 'borscht',
    name: 'Борщ',
    emoji: '🍲',
    ingredients: { cabbage: 2, potato: 1, carrot: 2, tomato: 1 },
    craftTime: 360,       // 6 хв
    sellPrice: 250,
    unlockLevel: 5,
    xpReward: 32,
  },
  juice: {
    id: 'juice',
    name: 'Сік',
    emoji: '🧃',
    ingredients: { strawberry: 2, carrot: 2 },
    craftTime: 120,       // 2 хв
    sellPrice: 280,
    unlockLevel: 3,
    xpReward: 14,
  },
  pirozhki: {
    id: 'pirozhki',
    name: 'Пиріжки',
    emoji: '🥟',
    ingredients: { wheat: 3, cabbage: 1, chicken_product: 1 },
    craftTime: 240,       // 4 хв
    sellPrice: 130,
    unlockLevel: 4,
    xpReward: 18,
  },
  gourmet_dish: {
    id: 'gourmet_dish',
    name: 'Гурме страва',
    emoji: '🍽️',
    ingredients: { truffle_oil: 1, cow_product: 1, potato: 2 },
    craftTime: 600,       // 10 хв
    sellPrice: 750,
    unlockLevel: 9,
    xpReward: 60,
  },
  ratatouille: {
    id: 'ratatouille',
    name: 'Рататуй',
    emoji: '🍆',
    ingredients: { eggplant: 2, tomato: 2, parsley: 1 },
    craftTime: 270,       // 4.5 хв
    sellPrice: 320,
    unlockLevel: 5,
    xpReward: 26,
  },
  smoothie: {
    id: 'smoothie',
    name: 'Смузі',
    emoji: '🥤',
    ingredients: { strawberry: 2, blueberry: 2, carrot: 1 },
    craftTime: 90,        // 1.5 хв
    sellPrice: 540,
    unlockLevel: 4,
    xpReward: 16,
  },
  farmer_pie: {
    id: 'farmer_pie',
    name: 'Фермерський пиріг',
    emoji: '🫓',
    ingredients: { potato: 2, corn: 2, chicken_product: 2, wheat: 1 },
    craftTime: 420,       // 7 хв
    sellPrice: 300,
    unlockLevel: 7,
    xpReward: 45,
  },
  royal_feast: {
    id: 'royal_feast',
    name: 'Королівський бенкет',
    emoji: '👑',
    ingredients: { gourmet_dish: 1, cake: 1, borscht: 1, cheese: 1 },
    craftTime: 900,       // 15 хв
    sellPrice: 1600,
    unlockLevel: 10,
    xpReward: 100,
  },
  golden_honey: {
    id: 'golden_honey',
    name: 'Золотий мед',
    emoji: '🍯',
    ingredients: { jam: 2, butter: 1, sunflower: 3, strawberry: 3 },
    craftTime: 720,       // 12 хв
    sellPrice: 1300,
    unlockLevel: 9,
    xpReward: 75,
  },
  honey_cake: {
    id: 'honey_cake',
    name: 'Медовик',
    emoji: '🍰',
    ingredients: { bee_product: 2, wheat: 3, chicken_product: 2 },
    craftTime: 360,       // 6 хв
    sellPrice: 220,
    unlockLevel: 6,
    xpReward: 30,
  },
  roast_turkey: {
    id: 'roast_turkey',
    name: 'Індичка запечена',
    emoji: '🍗',
    ingredients: { turkey_product: 2, potato: 2, carrot: 1 },
    craftTime: 420,       // 7 хв
    sellPrice: 260,
    unlockLevel: 6,
    xpReward: 35,
  },
  down_pillow: {
    id: 'down_pillow',
    name: 'Пухова подушка',
    emoji: '🛏️',
    ingredients: { goose_product: 3, sheep_product: 2 },
    craftTime: 480,       // 8 хв
    sellPrice: 300,
    unlockLevel: 5,
    xpReward: 32,
  },
  horse_carriage: {
    id: 'horse_carriage',
    name: 'Кінна прогулянка',
    emoji: '🏇',
    ingredients: { horse_product: 2, wheat: 2, carrot: 3 },
    craftTime: 540,       // 9 хв
    sellPrice: 350,
    unlockLevel: 8,
    xpReward: 45,
  },
  campfire: {
    id: 'campfire',
    name: 'Багаття',
    emoji: '🔥',
    ingredients: { firewood: 3 },
    craftTime: 90,
    sellPrice: 80,
    unlockLevel: 1,
    xpReward: 10,
  },
  warm_scarf: {
    id: 'warm_scarf',
    name: 'Теплий шарф',
    emoji: '🧣',
    ingredients: { firewood: 2, sheep_product: 2 },
    craftTime: 180,
    sellPrice: 120,
    unlockLevel: 3,
    xpReward: 18,
  },
  wooden_chest: {
    id: 'wooden_chest',
    name: "Дерев'яна скринька",
    emoji: '📦',
    ingredients: { firewood: 5 },
    craftTime: 240,
    sellPrice: 150,
    unlockLevel: 4,
    xpReward: 22,
  },
  pumpkin_soup: {
    id: 'pumpkin_soup',
    name: 'Гарбузовий суп',
    emoji: '🍜',
    ingredients: { pumpkin: 2, potato: 1, parsley: 1 },
    craftTime: 300,       // 5 хв
    sellPrice: 490,
    unlockLevel: 7,
    xpReward: 35,
  },
  pumpkin_pie: {
    id: 'pumpkin_pie',
    name: 'Гарбузовий пиріг',
    emoji: '🥧',
    ingredients: { pumpkin: 1, wheat: 2, butter: 1 },
    craftTime: 360,       // 6 хв
    sellPrice: 630,
    unlockLevel: 7,
    xpReward: 38,
  },
  cherry_pie: {
    id: 'cherry_pie',
    name: 'Вишневий пиріг',
    emoji: '🫕',
    ingredients: { cherry: 2, wheat: 2, chicken_product: 2 },
    craftTime: 360,       // 6 хв
    sellPrice: 470,
    unlockLevel: 8,
    xpReward: 40,
  },
  wine: {
    id: 'wine',
    name: 'Вино',
    emoji: '🍷',
    ingredients: { grape: 3 },
    craftTime: 600,       // 10 хв
    sellPrice: 700,
    unlockLevel: 8,
    xpReward: 50,
  },
  fruit_basket: {
    id: 'fruit_basket',
    name: 'Фруктовий кошик',
    emoji: '🧺',
    ingredients: { cherry: 2, peach: 1, strawberry: 2 },
    craftTime: 300,       // 5 хв
    sellPrice: 920,
    unlockLevel: 8,
    xpReward: 42,
  },
  peach_compote: {
    id: 'peach_compote',
    name: 'Персиковий компот',
    emoji: '🫙',
    ingredients: { peach: 2, cherry: 1, blueberry: 1 },
    craftTime: 420,       // 7 хв
    sellPrice: 920,
    unlockLevel: 9,
    xpReward: 55,
  },
  grape_juice: {
    id: 'grape_juice',
    name: 'Виноградний сік',
    emoji: '🍹',
    ingredients: { grape: 2, watermelon: 1, melon: 1 },
    craftTime: 480,       // 8 хв
    sellPrice: 760,
    unlockLevel: 9,
    xpReward: 65,
  },
  grand_feast: {
    id: 'grand_feast',
    name: 'Великий бенкет',
    emoji: '🌴',
    ingredients: { grape_juice: 1, wine: 1, fruit_basket: 1, golden_honey: 1 },
    craftTime: 1200,      // 20 хв
    sellPrice: 5300,
    unlockLevel: 10,
    xpReward: 120,
  },
};

export const STORAGE_BASE = 50;
export const STORAGE_UPGRADE_COST = 200;
export const STORAGE_UPGRADE_AMOUNT = 25;

export const MARKET_FLUCTUATION_MIN = 0.7;
export const MARKET_FLUCTUATION_MAX = 1.4;
export const MARKET_UPDATE_INTERVAL = 300; // seconds

export const ORDER_EXPIRE_TIME = 900; // seconds (15 min)
export function getMaxOrders(level: number): number {
  // Lv1-4: 2 orders, Lv5+: 3 orders
  return level >= 5 ? 3 : 2;
}
export const ORDER_EXPIRED_PENALTY = 0.5; // expired orders pay 50% reward
export const ORDER_REWARD_MULTIPLIER = 1.5;

export const NPC_CUSTOMERS = [
  { name: 'Марічка', emoji: '👩' },
  { name: 'Степан', emoji: '👨' },
  { name: 'Пані Зоя', emoji: '👵' },
  { name: 'Козак Андрій', emoji: '🧔' },
  { name: 'Оленка', emoji: '👧' },
];
