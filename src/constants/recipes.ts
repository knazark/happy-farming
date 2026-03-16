import type { RecipeDef, CraftedId } from '../types';

export const RECIPES: Record<CraftedId, RecipeDef> = {
  bread: {
    id: 'bread',
    name: 'Хліб',
    emoji: '🍞',
    ingredients: { wheat: 3 },
    craftTime: 120,       // 2 хв
    sellPrice: 65,
    unlockLevel: 2,
    xpReward: 15,
  },
  salad: {
    id: 'salad',
    name: 'Салат',
    emoji: '🥗',
    ingredients: { tomato: 2, carrot: 2 },
    craftTime: 90,        // 1.5 хв
    sellPrice: 80,
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
    ingredients: { cow_product: 3 },
    craftTime: 180,       // 3 хв
    sellPrice: 160,
    unlockLevel: 4,
    xpReward: 22,
  },
  cheese: {
    id: 'cheese',
    name: 'Сир',
    emoji: '🧀',
    ingredients: { goat_product: 2 },
    craftTime: 240,       // 4 хв
    sellPrice: 150,
    unlockLevel: 5,
    xpReward: 25,
  },
  pickle: {
    id: 'pickle',
    name: 'Соління',
    emoji: '🥒',
    ingredients: { cucumber: 3, parsley: 2 },
    craftTime: 150,       // 2.5 хв
    sellPrice: 90,
    unlockLevel: 6,
    xpReward: 18,
  },
  truffle_oil: {
    id: 'truffle_oil',
    name: 'Трюфельна олія',
    emoji: '🫒',
    ingredients: { pig_product: 2, sunflower: 1 },
    craftTime: 480,       // 8 хв
    sellPrice: 280,
    unlockLevel: 7,
    xpReward: 40,
  },
  meat_pie: {
    id: 'meat_pie',
    name: 'М\'ясний пиріг',
    emoji: '🥧',
    ingredients: { wheat: 3, rabbit_product: 2 },
    craftTime: 240,       // 4 хв
    sellPrice: 120,
    unlockLevel: 8,
    xpReward: 35,
  },
  gourmet_dish: {
    id: 'gourmet_dish',
    name: 'Гурме страва',
    emoji: '🍽️',
    ingredients: { truffle_oil: 1, cow_product: 1, potato: 2 },
    craftTime: 600,       // 10 хв
    sellPrice: 450,
    unlockLevel: 9,
    xpReward: 60,
  },
};

export const STORAGE_BASE = 50;
export const STORAGE_UPGRADE_COST = 200;
export const STORAGE_UPGRADE_AMOUNT = 25;

export const MARKET_FLUCTUATION_MIN = 0.7;
export const MARKET_FLUCTUATION_MAX = 1.4;
export const MARKET_UPDATE_INTERVAL = 300; // seconds

export const ORDER_EXPIRE_TIME = 600; // seconds
export const MAX_ORDERS = 3;
export const ORDER_REWARD_MULTIPLIER = 1.5;

export const NPC_CUSTOMERS = [
  { name: 'Марічка', emoji: '👩' },
  { name: 'Степан', emoji: '👨' },
  { name: 'Пані Зоя', emoji: '👵' },
  { name: 'Козак Андрій', emoji: '🧔' },
  { name: 'Оленка', emoji: '👧' },
];
