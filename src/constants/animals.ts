import type { AnimalId, AnimalDef } from '../types';

export const ANIMALS: Record<AnimalId, AnimalDef> = {
  chicken: {
    id: 'chicken',
    name: 'Курка',
    emoji: '🐔',
    productEmoji: '🥚',
    productName: 'Яйця',
    productionTime: 180,    // 3 хв
    buyPrice: 60,
    productSellPrice: 10,
    unlockLevel: 1,
    xpReward: 8,
  },
  duck: {
    id: 'duck',
    name: 'Качка',
    emoji: '🦆',
    productEmoji: '🪶',
    productName: 'Пір\'я',
    productionTime: 240,    // 4 хв
    buyPrice: 130,
    productSellPrice: 16,
    unlockLevel: 2,
    xpReward: 10,
  },
  rabbit: {
    id: 'rabbit',
    name: 'Кролик',
    emoji: '🐰',
    productEmoji: '🥩',
    productName: 'Крільчатина',
    productionTime: 300,    // 5 хв
    buyPrice: 220,
    productSellPrice: 24,
    unlockLevel: 3,
    xpReward: 15,
  },
  sheep: {
    id: 'sheep',
    name: 'Вівця',
    emoji: '🐑',
    productEmoji: '🧶',
    productName: 'Вовна',
    productionTime: 420,    // 7 хв
    buyPrice: 380,
    productSellPrice: 40,
    unlockLevel: 4,
    xpReward: 20,
  },
  goat: {
    id: 'goat',
    name: 'Коза',
    emoji: '🐐',
    productEmoji: '🥛',
    productName: 'Козине молоко',
    productionTime: 360,    // 6 хв
    buyPrice: 550,
    productSellPrice: 35,
    unlockLevel: 5,
    xpReward: 25,
  },
  cow: {
    id: 'cow',
    name: 'Корова',
    emoji: '🐄',
    productEmoji: '🥛',
    productName: 'Молоко',
    productionTime: 480,    // 8 хв
    buyPrice: 750,
    productSellPrice: 55,
    unlockLevel: 6,
    xpReward: 30,
  },
  pig: {
    id: 'pig',
    name: 'Свиня',
    emoji: '🐷',
    productEmoji: '🍄',
    productName: 'Трюфелі',
    productionTime: 600,    // 10 хв
    buyPrice: 700,
    productSellPrice: 110,
    unlockLevel: 7,
    xpReward: 40,
  },
  cat: {
    id: 'cat',
    name: 'Котик',
    emoji: '😺',
    productEmoji: '💛',
    productName: 'Щастя',
    productionTime: 180,    // 3 хв
    buyPrice: 1500,
    productSellPrice: 5,
    unlockLevel: 8,
    xpReward: 50,
  },
  dog: {
    id: 'dog',
    name: 'Песик',
    emoji: '🐶',
    productEmoji: '🦴',
    productName: 'Вірність',
    productionTime: 180,    // 3 хв
    buyPrice: 1500,
    productSellPrice: 5,
    unlockLevel: 8,
    xpReward: 50,
  },
  goose: {
    id: 'goose',
    name: 'Гуска',
    emoji: '🦢',
    productEmoji: '🪶',
    productName: 'Гусячий пух',
    productionTime: 360,    // 6 хв
    buyPrice: 400,
    productSellPrice: 30,
    unlockLevel: 4,
    xpReward: 18,
  },
  turkey: {
    id: 'turkey',
    name: 'Індик',
    emoji: '🦃',
    productEmoji: '🍗',
    productName: 'Індичатина',
    productionTime: 420,    // 7 хв
    buyPrice: 450,
    productSellPrice: 55,
    unlockLevel: 5,
    xpReward: 22,
  },
  bee: {
    id: 'bee',
    name: 'Бджоли',
    emoji: '🐝',
    productEmoji: '🍯',
    productName: 'Мед',
    productionTime: 300,    // 5 хв
    buyPrice: 600,
    productSellPrice: 65,
    unlockLevel: 6,
    xpReward: 28,
  },
  horse: {
    id: 'horse',
    name: 'Кінь',
    emoji: '🐴',
    productEmoji: '🏇',
    productName: 'Верхова їзда',
    productionTime: 540,    // 9 хв
    buyPrice: 800,
    productSellPrice: 100,
    unlockLevel: 7,
    xpReward: 35,
  },
};

export const ANIMAL_LIST: AnimalDef[] = Object.values(ANIMALS).sort((a, b) => a.unlockLevel - b.unlockLevel || a.buyPrice - b.buyPrice);
