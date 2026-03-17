import type { DailyQuest, QuestType } from '../types';

export const MAX_DAILY_QUESTS = 3;

interface QuestTemplate {
  type: QuestType;
  descriptions: string[];
  emoji: string;
  targetRange: [number, number];
  rewardPerUnit: number;
  xpPerUnit: number;
  minLevel?: number;
}

const QUEST_TEMPLATES: QuestTemplate[] = [
  {
    type: 'harvest',
    descriptions: ['Зберіть {n} врожаїв', 'Час жнив! Зберіть {n} рослин'],
    emoji: '🌾',
    targetRange: [3, 8],
    rewardPerUnit: 8,
    xpPerUnit: 3,
  },
  {
    type: 'sell',
    descriptions: ['Продайте {n} предметів', 'Торгівля! Продайте {n} товарів'],
    emoji: '💰',
    targetRange: [2, 6],
    rewardPerUnit: 10,
    xpPerUnit: 4,
  },
  {
    type: 'craft',
    descriptions: ['Скрафтіть {n} предметів', 'Майстерня чекає! Скрафтіть {n} речей'],
    emoji: '🔨',
    targetRange: [1, 3],
    rewardPerUnit: 20,
    xpPerUnit: 8,
  },
  {
    type: 'help',
    descriptions: ['Допоможіть {n} сусідам', 'Будьте добрим сусідом {n} разів'],
    emoji: '🤝',
    targetRange: [1, 3],
    rewardPerUnit: 15,
    xpPerUnit: 5,
  },
  {
    type: 'earn',
    descriptions: ['Заробіть {n} монет', 'Підприємець! Заробіть {n}💰'],
    emoji: '🏦',
    targetRange: [50, 200],
    rewardPerUnit: 0.3,
    xpPerUnit: 0.1,
  },
  // --- Premium quests for high-level players ---
  {
    type: 'harvest',
    descriptions: ['Зберіть {n} преміум врожаїв 🍇🍒🍑🍍', 'Екзотика! Зберіть {n} рідкісних культур'],
    emoji: '🍇',
    targetRange: [2, 5],
    rewardPerUnit: 25,
    xpPerUnit: 10,
    minLevel: 7,
  },
  {
    type: 'craft',
    descriptions: ['Скрафтіть {n} вишуканих страв', 'Шеф-кухар! Приготуйте {n} делікатесів'],
    emoji: '🍷',
    targetRange: [1, 2],
    rewardPerUnit: 50,
    xpPerUnit: 20,
    minLevel: 8,
  },
  {
    type: 'earn',
    descriptions: ['Заробіть {n} монет за день', 'Магнат! Заробіть {n}💰'],
    emoji: '👑',
    targetRange: [300, 800],
    rewardPerUnit: 0.4,
    xpPerUnit: 0.15,
    minLevel: 7,
  },
  {
    type: 'sell',
    descriptions: ['Продайте {n} крафтових товарів', 'Ярмарок! Продайте {n} виробів'],
    emoji: '🏪',
    targetRange: [3, 8],
    rewardPerUnit: 15,
    xpPerUnit: 6,
    minLevel: 5,
  },
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateDailyQuests(playerLevel = 1): DailyQuest[] {
  const available = QUEST_TEMPLATES.filter((t) => !t.minLevel || playerLevel >= t.minLevel);
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, MAX_DAILY_QUESTS);
  const now = Date.now();

  return selected.map((template, i) => {
    const target = randInt(template.targetRange[0], template.targetRange[1]);
    const desc = template.descriptions[Math.floor(Math.random() * template.descriptions.length)]
      .replace('{n}', String(target));

    return {
      id: `quest_${now}_${i}`,
      type: template.type,
      description: desc,
      emoji: template.emoji,
      target,
      progress: 0,
      reward: Math.round(target * template.rewardPerUnit),
      xpReward: Math.round(target * template.xpPerUnit),
      completed: false,
    };
  });
}
