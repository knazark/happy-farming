import type { AchievementDef, AchievementId } from '../types';

export const ACHIEVEMENTS: Record<AchievementId, AchievementDef> = {
  first_harvest: {
    id: 'first_harvest',
    name: 'Перший врожай',
    emoji: '🌾',
    description: 'Зберіть перший врожай',
    reward: 20,
  },
  first_animal: {
    id: 'first_animal',
    name: 'Тваринник',
    emoji: '🐔',
    description: 'Купіть першу тварину',
    reward: 30,
  },
  first_craft: {
    id: 'first_craft',
    name: 'Майстер',
    emoji: '🔨',
    description: 'Скрафтіть перший предмет',
    reward: 25,
  },
  rich_farmer: {
    id: 'rich_farmer',
    name: 'Багатий фермер',
    emoji: '💰',
    description: 'Заробіть 1000 монет загалом',
    reward: 50,
  },
  full_farm: {
    id: 'full_farm',
    name: 'Повна ферма',
    emoji: '🏡',
    description: 'Розблокуйте всі ділянки',
    reward: 100,
  },
  master_crafter: {
    id: 'master_crafter',
    name: 'Майстер крафту',
    emoji: '⚒️',
    description: 'Скрафтіть 10 предметів',
    reward: 75,
  },
  order_champion: {
    id: 'order_champion',
    name: 'Чемпіон замовлень',
    emoji: '📋',
    description: 'Виконайте 10 замовлень',
    reward: 75,
  },
  social_butterfly: {
    id: 'social_butterfly',
    name: 'Душа компанії',
    emoji: '🤝',
    description: 'Допоможіть усім сусідам за один день',
    reward: 40,
  },
  level_5: {
    id: 'level_5',
    name: 'Досвідчений',
    emoji: '⭐',
    description: 'Досягніть 5-го рівня',
    reward: 60,
  },
  level_max: {
    id: 'level_max',
    name: 'Легенда',
    emoji: '👑',
    description: 'Досягніть максимального рівня',
    reward: 200,
  },
  rainbow: {
    id: 'rainbow',
    name: 'Веселка',
    emoji: '🌈',
    description: 'Посадіть 🍅🥕🌽🥒🫐🍆 в один ряд',
    reward: 500,
  },
};

export const ACHIEVEMENT_LIST = Object.values(ACHIEVEMENTS);
