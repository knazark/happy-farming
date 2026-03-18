import type { Season, WeatherType, CropId } from '../types';

export const SEASON_DURATION = 300; // seconds per season (5 min)

export const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];

export const SEASON_INFO: Record<Season, { name: string; emoji: string; description: string }> = {
  spring: { name: 'Весна', emoji: '🌸', description: 'Рослини ростуть швидше' },
  summer: { name: 'Літо', emoji: '☀️', description: 'Тварини виробляють більше' },
  autumn: { name: 'Осінь', emoji: '🍂', description: 'Ціни продажу вищі' },
  winter: { name: 'Зима', emoji: '❄️', description: 'Дрова, ґрунт, крафт ×2 швидше, ∞ слотів' },
};

// Growth time multipliers per season
export const SEASON_CROP_MULTIPLIER: Record<Season, number> = {
  spring: 0.75,
  summer: 1.0,
  autumn: 1.0,
  winter: 1.5,
};

// Animal production time multipliers
export const SEASON_ANIMAL_MULTIPLIER: Record<Season, number> = {
  spring: 1.0,
  summer: 0.75,
  autumn: 1.0,
  winter: 1.3,
};

// Sell price multipliers per season
export const SEASON_PRICE_MULTIPLIER: Record<Season, number> = {
  spring: 1.0,
  summer: 1.0,
  autumn: 1.3,
  winter: 0.9,
};

// Seasonal crop bonuses — these crops grow extra fast in their preferred season
export const SEASONAL_CROP_BONUS: Partial<Record<Season, CropId[]>> = {
  spring: ['carrot', 'potato', 'cherry', 'radish', 'strawberry'],
  summer: ['tomato', 'sunflower', 'watermelon', 'melon', 'peach', 'cucumber', 'eggplant'],
  autumn: ['wheat', 'corn', 'pumpkin', 'grape', 'cabbage', 'beet'],
};

export const SEASONAL_BONUS_MULTIPLIER = 0.6; // extra speed for bonus crops

// Weather
export const WEATHER_DURATION_MIN = 60; // seconds
export const WEATHER_DURATION_MAX = 180;

export const WEATHER_BY_SEASON: Record<Season, { types: WeatherType[]; weights: number[] }> = {
  spring: { types: ['sunny', 'rainy', 'rainy', 'sunny'], weights: [0.4, 0.4, 0.15, 0.05] },
  summer: { types: ['sunny', 'sunny', 'stormy', 'rainy'], weights: [0.5, 0.3, 0.1, 0.1] },
  autumn: { types: ['rainy', 'rainy', 'stormy', 'sunny'], weights: [0.4, 0.3, 0.2, 0.1] },
  winter: { types: ['snowy', 'snowy', 'stormy', 'sunny'], weights: [0.5, 0.3, 0.15, 0.05] },
};

export const WEATHER_INFO: Record<WeatherType, { name: string; emoji: string; effect: string }> = {
  sunny: { name: 'Сонячно', emoji: '☀️', effect: 'Нормальний ріст' },
  rainy: { name: 'Дощ', emoji: '🌧️', effect: 'Рослини +20% швидше' },
  stormy: { name: 'Гроза', emoji: '⛈️', effect: 'Тварини сповільнені' },
  snowy: { name: 'Сніг', emoji: '🌨️', effect: 'Все сповільнено на 20%' },
};

export const WEATHER_CROP_MULTIPLIER: Record<WeatherType, number> = {
  sunny: 1.0,
  rainy: 0.8,
  stormy: 1.0,
  snowy: 1.2,
};

export const WEATHER_ANIMAL_MULTIPLIER: Record<WeatherType, number> = {
  sunny: 1.0,
  rainy: 1.0,
  stormy: 1.3,
  snowy: 1.2,
};
