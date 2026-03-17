import type { GameState } from '../types';
import { calcChecksum, verifyChecksum } from '../firebase/db';

const STORAGE_KEY = 'happyFarmer_save';

export function saveGame(state: GameState): void {
  try {
    const withChecksum = { ...state, checksum: calcChecksum(state) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withChecksum));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as GameState & { checksum?: string };
    // If checksum exists but doesn't match — data was tampered with, ignore it
    if (state.checksum && !verifyChecksum(state)) {
      console.warn('localStorage save failed checksum — ignoring tampered data');
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  localStorage.removeItem(STORAGE_KEY);
}
