import { GRID_COLS } from './grid';

export const STARTING_COINS = 100;
export const TICK_INTERVAL = 1000;
export const AUTOSAVE_INTERVAL = 5000;
export const ANIMAL_CELL_H = 65; // animal cell height (half-height of crop cell)
export const ANIMAL_PEN_HEIGHT = 24 + ANIMAL_CELL_H * 2 + 18; // label + 2 rows + padding
export const ANIMAL_PEN_COLS = GRID_COLS; // match farm grid columns
export const MAX_ANIMALS = 16;

// Level system: XP needed = BASE * level^EXPONENT
export const XP_BASE = 50;
export const XP_EXPONENT = 1.35;
export const MAX_LEVEL = 10;

// Fertilizer
export const FERTILIZER_PRICE = 30;
export const FERTILIZER_SPEED_MULTIPLIER = 0.5; // cuts growth time in half

export function xpForLevel(level: number): number {
  return Math.floor(XP_BASE * Math.pow(level, XP_EXPONENT));
}
