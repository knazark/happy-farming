import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveGame, loadGame, clearSave } from './storage';
import { calcChecksum } from '../firebase/db';
import { createInitialState } from './gameReducer';
import type { GameState } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    _getStore: () => store,
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

function makeState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState(), ...overrides };
}

describe('saveGame', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('saves state with checksum to localStorage', () => {
    const state = makeState({ coins: 500, level: 3 });
    saveGame(state);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'happyFarmer_save',
      expect.any(String),
    );

    const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(saved.coins).toBe(500);
    expect(saved.level).toBe(3);
    expect(saved.checksum).toBe(calcChecksum(state));
  });

  it('does not throw if localStorage.setItem throws', () => {
    localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('quota'); });
    expect(() => saveGame(makeState())).not.toThrow();
  });
});

describe('loadGame', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('returns null when nothing is saved', () => {
    expect(loadGame()).toBeNull();
  });

  it('returns the saved state when valid', () => {
    const state = makeState({ coins: 777 });
    const withChecksum = { ...state, checksum: calcChecksum(state) };
    localStorageMock.setItem('happyFarmer_save', JSON.stringify(withChecksum));

    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.coins).toBe(777);
  });

  it('returns null for tampered data (checksum mismatch)', () => {
    const state = makeState({ coins: 100 });
    const withChecksum = { ...state, checksum: calcChecksum(state) };
    // Tamper
    withChecksum.coins = 999999;
    localStorageMock.setItem('happyFarmer_save', JSON.stringify(withChecksum));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const loaded = loadGame();
    expect(loaded).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('returns state when no checksum is present (old saves)', () => {
    const state = makeState({ coins: 200 });
    // No checksum field at all
    localStorageMock.setItem('happyFarmer_save', JSON.stringify(state));

    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.coins).toBe(200);
  });

  it('returns null for invalid JSON', () => {
    localStorageMock.setItem('happyFarmer_save', 'not json{{{');
    expect(loadGame()).toBeNull();
  });

  it('returns null when localStorage.getItem throws', () => {
    localStorageMock.getItem.mockImplementationOnce(() => { throw new Error('error'); });
    expect(loadGame()).toBeNull();
  });
});

describe('clearSave', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('removes the save key from localStorage', () => {
    localStorageMock.setItem('happyFarmer_save', 'data');
    clearSave();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('happyFarmer_save');
  });
});

describe('storage roundtrip', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('saveGame then loadGame returns equivalent state', () => {
    const state = makeState({ coins: 1234, level: 5, xp: 300, totalEarned: 9999 });
    saveGame(state);

    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.coins).toBe(1234);
    expect(loaded!.level).toBe(5);
    expect(loaded!.xp).toBe(300);
    expect(loaded!.totalEarned).toBe(9999);
  });
});

describe('clearSave isolation', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('only removes happyFarmer_save key', () => {
    localStorageMock.setItem('other_key', 'other_value');
    saveGame(makeState({ coins: 100 }));

    clearSave();

    // other_key should still exist
    expect(localStorageMock._getStore()['other_key']).toBe('other_value');
    // happyFarmer_save should be removed
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('happyFarmer_save');
  });
});
