import { CROPS } from '../constants/crops';
import { ANIMALS } from '../constants/animals';
import { RECIPES } from '../constants/recipes';

export function getItemEmoji(itemId: string): string {
  if (itemId === 'firewood') return '🪵';
  if (itemId in CROPS) return CROPS[itemId as keyof typeof CROPS].emoji;
  if (itemId.endsWith('_product')) {
    const animalId = itemId.replace('_product', '') as keyof typeof ANIMALS;
    if (animalId in ANIMALS) return ANIMALS[animalId].productEmoji;
  }
  if (itemId in RECIPES) return RECIPES[itemId as keyof typeof RECIPES].emoji;
  return '❓';
}

export function getItemName(itemId: string): string {
  if (itemId === 'firewood') return 'Дрова';
  if (itemId in CROPS) return CROPS[itemId as keyof typeof CROPS].name;
  if (itemId.endsWith('_product')) {
    const animalId = itemId.replace('_product', '') as keyof typeof ANIMALS;
    if (animalId in ANIMALS) return ANIMALS[animalId].productName;
  }
  if (itemId in RECIPES) return RECIPES[itemId as keyof typeof RECIPES].name;
  return itemId;
}
