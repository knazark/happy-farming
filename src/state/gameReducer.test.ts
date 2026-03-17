import { describe, it, expect } from 'vitest';
import { createInitialState, gameReducer } from './gameReducer';

describe('FRIEND_HARVEST_REWARD action', () => {
  it('adds coins to state', () => {
    const state = createInitialState();
    const before = state.coins;
    const result = gameReducer(state, { type: 'FRIEND_HARVEST_REWARD', coins: 10, xp: 5 });
    expect(result.coins).toBe(before + 10);
  });

  it('adds xp to state', () => {
    const state = createInitialState();
    const before = state.xp;
    const result = gameReducer(state, { type: 'FRIEND_HARVEST_REWARD', coins: 10, xp: 5 });
    expect(result.xp).toBe(before + 5);
  });

  it('does not mutate original state', () => {
    const state = createInitialState();
    const origCoins = state.coins;
    const origXp = state.xp;
    gameReducer(state, { type: 'FRIEND_HARVEST_REWARD', coins: 10, xp: 5 });
    expect(state.coins).toBe(origCoins);
    expect(state.xp).toBe(origXp);
  });
});
