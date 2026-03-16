import { GRID_COLS } from './grid';

export const STARTING_COINS = 100;
export const TICK_INTERVAL = 1000;
export const AUTOSAVE_INTERVAL = 5000;
export const ANIMAL_CELL_H = 65; // animal cell height (half-height of crop cell)
export const ANIMAL_PEN_HEIGHT = 24 + ANIMAL_CELL_H * 2 + 18; // label + 2 rows + padding
export const ANIMAL_PEN_COLS = GRID_COLS; // match farm grid columns
export const MAX_ANIMALS = 16;
export const PEN_UPGRADE_COST = 300;
export const PEN_UPGRADE_AMOUNT = 4;

// Level system: XP needed = BASE * level^EXPONENT
export const XP_BASE = 50;
export const XP_EXPONENT = 1.35;
export const MAX_LEVEL = 10;

// Fertilizer
export const FERTILIZER_PRICE = 30;
export const FERTILIZER_SPEED_MULTIPLIER = 0.5; // cuts growth time in half

// Animal feed
export const FEED_PRICE = 25;
export const FEED_SPEED_MULTIPLIER = 0.5; // cuts production time in half
export const FEED_DURATION = 120; // seconds — feed lasts 2 minutes

// Crafting slots
export const CRAFTING_SLOTS_BASE = 1;
export const CRAFTING_SLOTS_MAX = 4;
export const CRAFTING_UPGRADE_COST_BASE = 200; // cost for 2nd slot, scales up
export function craftingUpgradeCost(currentSlots: number): number {
  return CRAFTING_UPGRADE_COST_BASE * currentSlots; // 200, 400, 600...
}

// Tractor
export const TRACTOR_PRICE = 10000;
export const TRACTOR_REQUIRED_CRAFTS = ['royal_feast', 'golden_honey', 'gourmet_dish'] as const;

export function xpForLevel(level: number): number {
  return Math.floor(XP_BASE * Math.pow(level, XP_EXPONENT));
}
