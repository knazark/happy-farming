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
// ~48 hours of active play to reach level 10
export const XP_BASE = 300;
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

// Tractor — late game (level 7-8), auto-harvests ready crops
export const TRACTOR_PRICE = 7000;
export const TRACTOR_REQUIRED_CRAFTS = ['farmer_pie', 'jam', 'pickles'] as const;

// Auto-collector (Kaleb) — mid game (level 5-6), auto-collects animal products
export const AUTO_COLLECTOR_PRICE = 4000;
export const AUTO_COLLECTOR_REQUIRED_CRAFTS = ['cheese', 'butter'] as const;

// Auto-planter — early-mid game (level 3-4), auto-replants after harvest
export const AUTO_PLANTER_PRICE = 2000;
export const AUTO_PLANTER_REQUIRED_CRAFTS = ['bread'] as const;
export const AUTO_PLANTER_MAX_PLOTS = 3;

export function xpForLevel(level: number): number {
  return Math.floor(XP_BASE * Math.pow(level, XP_EXPONENT));
}
