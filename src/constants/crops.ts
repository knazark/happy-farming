import type { CropId, CropDef } from '../types';

export const CROPS: Record<CropId, CropDef> = {
  wheat: {
    id: 'wheat',
    name: 'Пшениця',
    emoji: '🌾',
    seedEmoji: '🌱',
    growthTime: 60,       // 1 хв
    seedPrice: 5,
    sellPrice: 12,
    unlockLevel: 1,
    xpReward: 5,
  },
  carrot: {
    id: 'carrot',
    name: 'Морква',
    emoji: '🥕',
    seedEmoji: '🌱',
    growthTime: 90,       // 1.5 хв
    seedPrice: 8,
    sellPrice: 20,
    unlockLevel: 1,
    xpReward: 8,
  },
  parsley: {
    id: 'parsley',
    name: 'Петрушка',
    emoji: '🌿',
    seedEmoji: '🌱',
    growthTime: 75,       // 1.25 хв
    seedPrice: 6,
    sellPrice: 15,
    unlockLevel: 2,
    xpReward: 6,
  },
  cucumber: {
    id: 'cucumber',
    name: 'Огірок',
    emoji: '🥒',
    seedEmoji: '🌱',
    growthTime: 120,      // 2 хв
    seedPrice: 9,
    sellPrice: 24,
    unlockLevel: 2,
    xpReward: 10,
  },
  tomato: {
    id: 'tomato',
    name: 'Помідор',
    emoji: '🍅',
    seedEmoji: '🌱',
    growthTime: 150,      // 2.5 хв
    seedPrice: 12,
    sellPrice: 30,
    unlockLevel: 2,
    xpReward: 12,
  },
  sunflower: {
    id: 'sunflower',
    name: 'Соняшник',
    emoji: '🌻',
    seedEmoji: '🌱',
    growthTime: 180,      // 3 хв
    seedPrice: 14,
    sellPrice: 36,
    unlockLevel: 3,
    xpReward: 15,
  },
  cabbage: {
    id: 'cabbage',
    name: 'Капуста',
    emoji: '🥬',
    seedEmoji: '🌱',
    growthTime: 240,      // 4 хв
    seedPrice: 18,
    sellPrice: 50,
    unlockLevel: 3,
    xpReward: 22,
  },
  corn: {
    id: 'corn',
    name: 'Кукурудза',
    emoji: '🌽',
    seedEmoji: '🌱',
    growthTime: 300,      // 5 хв
    seedPrice: 20,
    sellPrice: 55,
    unlockLevel: 4,
    xpReward: 20,
  },
  potato: {
    id: 'potato',
    name: 'Картопля',
    emoji: '🥔',
    seedEmoji: '🌱',
    growthTime: 360,      // 6 хв
    seedPrice: 25,
    sellPrice: 65,
    unlockLevel: 5,
    xpReward: 28,
  },
  eggplant: {
    id: 'eggplant',
    name: 'Баклажан',
    emoji: '🍆',
    seedEmoji: '🌱',
    growthTime: 420,      // 7 хв
    seedPrice: 28,
    sellPrice: 72,
    unlockLevel: 5,
    xpReward: 26,
  },
  strawberry: {
    id: 'strawberry',
    name: 'Полуниця',
    emoji: '🍓',
    seedEmoji: '🌱',
    growthTime: 300,      // 5 хв (швидша але дорожча)
    seedPrice: 30,
    sellPrice: 78,
    unlockLevel: 6,
    xpReward: 30,
  },
  blueberry: {
    id: 'blueberry',
    name: 'Лохина',
    emoji: '🫐',
    seedEmoji: '🌱',
    growthTime: 600,      // 10 хв
    seedPrice: 35,
    sellPrice: 100,
    unlockLevel: 7,
    xpReward: 35,
  },
  watermelon: {
    id: 'watermelon',
    name: 'Кавун',
    emoji: '🍉',
    seedEmoji: '🌱',
    growthTime: 480,      // 8 хв
    seedPrice: 40,
    sellPrice: 110,
    unlockLevel: 5,
    xpReward: 40,
    seasonOnly: 'summer',
  },
  melon: {
    id: 'melon',
    name: 'Диня',
    emoji: '🍈',
    seedEmoji: '🌱',
    growthTime: 420,      // 7 хв
    seedPrice: 35,
    sellPrice: 95,
    unlockLevel: 4,
    xpReward: 35,
    seasonOnly: 'summer',
  },
};

export const CROP_LIST: CropDef[] = Object.values(CROPS).sort((a, b) => a.growthTime - b.growthTime);
