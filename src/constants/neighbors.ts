import type { NeighborState } from '../types';

export const AVATARS = ['👨‍🌾', '👩‍🌾', '🧑‍🌾', '👴', '👵', '🧔', '👲', '🤠'];

export const HELP_XP_REWARD = 10;
export const HELP_COIN_REWARD = 5;
export const GIFT_COIN_REWARD = 15;
export const GIFT_FERTILIZER_CHANCE = 0.3;

export const DEFAULT_NEIGHBORS: NeighborState[] = [
  { id: 'n1', name: 'Оксана', avatar: '👩‍🌾', helpedToday: false, giftCollectedToday: false },
  { id: 'n2', name: 'Тарас', avatar: '🧑‍🌾', helpedToday: false, giftCollectedToday: false },
  { id: 'n3', name: 'Бабуся Галя', avatar: '👵', helpedToday: false, giftCollectedToday: false },
  { id: 'n4', name: 'Дід Петро', avatar: '👴', helpedToday: false, giftCollectedToday: false },
];

// Simulated neighbor farm descriptions
export const NEIGHBOR_FARMS: Record<string, { crops: string[]; animals: string[]; description: string }> = {
  n1: { crops: ['🌾', '🍅', '🥕'], animals: ['🐔', '🐄'], description: 'Невелика затишна ферма з городом' },
  n2: { crops: ['🌽', '🌻', '🥔'], animals: ['🐷', '🐑'], description: 'Велике поле з кукурудзою та соняшниками' },
  n3: { crops: ['🥕', '🍅', '🌾'], animals: ['🐔'], description: 'Бабусин город з травами та курочками' },
  n4: { crops: ['🥔', '🌾', '🌽'], animals: ['🐄', '🐑', '🐷'], description: 'Старе господарство з великим стадом' },
};
