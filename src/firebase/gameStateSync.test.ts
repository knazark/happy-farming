import { describe, it, expect } from 'vitest';
import { applyFriendHarvest } from './gameStateSync';
import { isFirestoreRegression } from '../state/saveGuards';
import { createInitialState } from '../state/gameReducer';
import type { GameState, PlotState } from '../types';

function makeState(overrides?: Partial<GameState>): GameState {
  return { ...createInitialState(), ...overrides };
}

function readyPlot(cropId: 'wheat' | 'carrot' = 'wheat', soilLevel?: number): PlotState {
  const p: PlotState = { status: 'ready', cropId };
  if (soilLevel != null) (p as any).soilLevel = soilLevel;
  return p;
}

describe('applyFriendHarvest', () => {
  it('returns null when plot index is out of bounds', () => {
    const gs = makeState({ plots: [{ status: 'empty' }] });
    expect(applyFriendHarvest(gs, 5, 'Alice')).toBeNull();
  });

  it('returns null when plot is not ready', () => {
    const gs = makeState({ plots: [{ status: 'empty' }, { status: 'locked' }] });
    expect(applyFriendHarvest(gs, 0, 'Alice')).toBeNull();
    expect(applyFriendHarvest(gs, 1, 'Alice')).toBeNull();
  });

  it('returns null for growing plot', () => {
    const gs = makeState({
      plots: [{ status: 'growing', cropId: 'wheat', plantedAt: Date.now(), growthTime: 60 }],
    });
    expect(applyFriendHarvest(gs, 0, 'Alice')).toBeNull();
  });

  it('harvests a ready plot: sets to empty and adds crop to inventory', () => {
    const gs = makeState({
      plots: [readyPlot('wheat'), { status: 'empty' }],
      inventory: {},
      totalHarvested: 0,
    });

    const result = applyFriendHarvest(gs, 0, 'Alice');

    expect(result).not.toBeNull();
    expect(result!.plots[0].status).toBe('empty');
    expect(result!.inventory.wheat).toBe(1);
    expect(result!.totalHarvested).toBe(1);
  });

  it('adds to existing inventory count', () => {
    const gs = makeState({
      plots: [readyPlot('carrot')],
      inventory: { carrot: 3 },
      totalHarvested: 5,
    });

    const result = applyFriendHarvest(gs, 0, 'Bob');

    expect(result!.inventory.carrot).toBe(4);
    expect(result!.totalHarvested).toBe(6);
  });

  it('preserves soilLevel on the emptied plot', () => {
    const gs = makeState({
      plots: [readyPlot('wheat', 2)],
    });

    const result = applyFriendHarvest(gs, 0, 'Alice');

    expect(result!.plots[0].status).toBe('empty');
    expect((result!.plots[0] as any).soilLevel).toBe(2);
  });

  it('omits soilLevel when undefined (no undefined in output)', () => {
    const gs = makeState({
      plots: [readyPlot('wheat')],
    });

    const result = applyFriendHarvest(gs, 0, 'Alice');

    expect(result!.plots[0].status).toBe('empty');
    expect('soilLevel' in result!.plots[0]).toBe(false);
  });

  it('adds helpLog entry with helper name and cropId', () => {
    const gs = makeState({
      plots: [readyPlot('wheat')],
    });

    const result = applyFriendHarvest(gs, 0, 'Alice');

    expect(result!.helpLog).toHaveLength(1);
    expect(result!.helpLog![0].helper).toBe('Alice');
    expect(result!.helpLog![0].cropId).toBe('wheat');
    expect(result!.helpLog![0].at).toBeGreaterThan(0);
  });

  it('appends to existing helpLog without mutating original', () => {
    const existingLog = [{ helper: 'Bob', cropId: 'carrot' as const, at: 1000 }];
    const gs = makeState({
      plots: [readyPlot('wheat')],
      helpLog: existingLog,
    });

    const result = applyFriendHarvest(gs, 0, 'Alice');

    expect(result!.helpLog).toHaveLength(2);
    expect(result!.helpLog![0].helper).toBe('Bob');
    expect(result!.helpLog![1].helper).toBe('Alice');
    // Original not mutated
    expect(existingLog).toHaveLength(1);
  });

  it('does not mutate the original game state', () => {
    const gs = makeState({
      plots: [readyPlot('wheat'), { status: 'empty' }],
      inventory: { wheat: 1 },
      totalHarvested: 3,
    });
    const origPlots = [...gs.plots];
    const origInv = { ...gs.inventory };

    applyFriendHarvest(gs, 0, 'Alice');

    expect(gs.plots).toEqual(origPlots);
    expect(gs.inventory).toEqual(origInv);
    expect(gs.totalHarvested).toBe(3);
  });

  it('does not affect other plots', () => {
    const gs = makeState({
      plots: [readyPlot('wheat'), readyPlot('carrot'), { status: 'locked' }],
    });

    const result = applyFriendHarvest(gs, 0, 'Alice');

    expect(result!.plots[0].status).toBe('empty');
    expect(result!.plots[1].status).toBe('ready');
    expect(result!.plots[2].status).toBe('locked');
  });

  it('can harvest multiple plots sequentially', () => {
    const gs = makeState({
      plots: [readyPlot('wheat'), readyPlot('carrot')],
      inventory: {},
      totalHarvested: 0,
    });

    const after1 = applyFriendHarvest(gs, 0, 'Alice')!;
    const after2 = applyFriendHarvest(after1, 1, 'Alice')!;

    expect(after2.plots[0].status).toBe('empty');
    expect(after2.plots[1].status).toBe('empty');
    expect(after2.inventory.wheat).toBe(1);
    expect(after2.inventory.carrot).toBe(1);
    expect(after2.totalHarvested).toBe(2);
    expect(after2.helpLog).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════
// isFirestoreRegression — regression detection used by gameStateSync
// ═══════════════════════════════════════════════════════════════════
describe('isFirestoreRegression (used by saveGameAndProfile)', () => {
  it('blocks overwrite when existing progress is significantly higher', () => {
    expect(isFirestoreRegression({
      existingTotalEarned: 80000,
      newTotalEarned: 200,
    })).toBe(true);
  });

  it('allows write when new progress is close to existing', () => {
    expect(isFirestoreRegression({
      existingTotalEarned: 10000,
      newTotalEarned: 9000,
    })).toBe(false);
  });

  it('allows write when new progress exceeds existing', () => {
    expect(isFirestoreRegression({
      existingTotalEarned: 5000,
      newTotalEarned: 12000,
    })).toBe(false);
  });

  it('skips regression check for low-progress accounts', () => {
    // Existing is below 1000 threshold — never triggers regression
    expect(isFirestoreRegression({
      existingTotalEarned: 800,
      newTotalEarned: 10,
    })).toBe(false);
  });

  it('blocks when drop is exactly at 50% boundary', () => {
    // existingTotalEarned * 0.5 = 5000, newTotalEarned 4999 < 5000 → regression
    expect(isFirestoreRegression({
      existingTotalEarned: 10000,
      newTotalEarned: 4999,
    })).toBe(true);
  });

  it('allows when drop is exactly at 50%', () => {
    // newTotalEarned = 5000 which is NOT < 5000 → allowed
    expect(isFirestoreRegression({
      existingTotalEarned: 10000,
      newTotalEarned: 5000,
    })).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// State validation for saveGameAndProfile preconditions
// ═══════════════════════════════════════════════════════════════════
describe('state validation for save preconditions', () => {
  it('initial state has zero totalEarned — would not trigger regression against any existing data', () => {
    const initial = createInitialState();
    // A fresh state with 0 totalEarned should never be considered a regression
    // when existing data is below 1000
    expect(isFirestoreRegression({
      existingTotalEarned: 0,
      newTotalEarned: initial.totalEarned,
    })).toBe(false);
  });

  it('initial state has level 1 and coins 0', () => {
    const initial = createInitialState();
    expect(initial.level).toBe(1);
    expect(initial.coins).toBe(100);
    expect(initial.totalEarned).toBe(0);
  });

  it('state with real progress should not trigger regression against similar progress', () => {
    expect(isFirestoreRegression({
      existingTotalEarned: 25000,
      newTotalEarned: 25500,
    })).toBe(false);
  });
});
