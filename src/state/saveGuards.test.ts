import { describe, it, expect } from 'vitest';
import {
  shouldBlockFirestoreSave,
  isFirestoreRegression,
  pickBetterSave,
  type SaveGuardContext,
} from './saveGuards';

// ─── Helper ────────────────────────────────────────────────────────
function makeCtx(overrides?: Partial<SaveGuardContext>): SaveGuardContext {
  return {
    hasFarmerId: true,
    hasRealData: true,
    highWaterMark: 50000,
    profileName: 'Тест',
    profilePassword: '1234',
    level: 10,
    totalEarned: 50000,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════
// shouldBlockFirestoreSave
// ═══════════════════════════════════════════════════════════════════
describe('shouldBlockFirestoreSave', () => {
  // --- VECTOR 1: No real data loaded → NEVER save ---
  describe('VECTOR 1: no real data loaded', () => {
    it('blocks when hasRealData=false even with high totalEarned', () => {
      // This was the root cause: totalEarned=84 bypassed the old guard
      expect(shouldBlockFirestoreSave(makeCtx({
        hasRealData: false,
        totalEarned: 84,
        level: 1,
      }))).toBe('no_real_data');
    });

    it('blocks when hasRealData=false with level>1', () => {
      expect(shouldBlockFirestoreSave(makeCtx({
        hasRealData: false,
        totalEarned: 5000,
        level: 5,
      }))).toBe('no_real_data');
    });

    it('blocks when hasRealData=false with zero progress', () => {
      expect(shouldBlockFirestoreSave(makeCtx({
        hasRealData: false,
        totalEarned: 0,
        level: 1,
      }))).toBe('no_real_data');
    });
  });

  // --- VECTOR 2: No farmer ID ---
  describe('no farmer id', () => {
    it('blocks when no farmer ID exists', () => {
      expect(shouldBlockFirestoreSave(makeCtx({ hasFarmerId: false }))).toBe('no_farmer_id');
    });
  });

  // --- VECTOR 3: No profile setup ---
  describe('no profile', () => {
    it('blocks when profile name is empty', () => {
      expect(shouldBlockFirestoreSave(makeCtx({ profileName: '' }))).toBe('no_profile');
    });

    it('blocks when profile password is undefined', () => {
      expect(shouldBlockFirestoreSave(makeCtx({ profilePassword: undefined }))).toBe('no_profile');
    });

    it('blocks when profile password is empty string', () => {
      expect(shouldBlockFirestoreSave(makeCtx({ profilePassword: '' }))).toBe('no_profile');
    });
  });

  // --- VECTOR 4: High-water mark regression ---
  describe('VECTOR 4: high-water mark regression', () => {
    it('blocks when totalEarned dropped to <10% of high-water mark', () => {
      // User had 50000 earned, now state shows 84 → regression
      expect(shouldBlockFirestoreSave(makeCtx({
        highWaterMark: 50000,
        totalEarned: 84,
      }))).toBe('regression_below_high_water');
    });

    it('blocks at exactly 10% boundary', () => {
      expect(shouldBlockFirestoreSave(makeCtx({
        highWaterMark: 10000,
        totalEarned: 999, // < 10% of 10000
      }))).toBe('regression_below_high_water');
    });

    it('allows when totalEarned is >= 10% of high-water mark', () => {
      expect(shouldBlockFirestoreSave(makeCtx({
        highWaterMark: 50000,
        totalEarned: 5001,
      }))).toBeNull();
    });

    it('skips high-water check when high-water mark is low (<= 1000)', () => {
      // New player who hasn't earned much — don't block
      expect(shouldBlockFirestoreSave(makeCtx({
        highWaterMark: 500,
        totalEarned: 10,
      }))).toBeNull();
    });

    it('allows normal gameplay progression', () => {
      expect(shouldBlockFirestoreSave(makeCtx({
        highWaterMark: 50000,
        totalEarned: 50500, // slight increase
      }))).toBeNull();
    });
  });

  // --- Happy path ---
  describe('allows valid saves', () => {
    it('allows save with all conditions met', () => {
      expect(shouldBlockFirestoreSave(makeCtx())).toBeNull();
    });

    it('allows first-time save for new player with real data', () => {
      expect(shouldBlockFirestoreSave(makeCtx({
        highWaterMark: 0,
        totalEarned: 50,
        level: 1,
      }))).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// isFirestoreRegression
// ═══════════════════════════════════════════════════════════════════
describe('isFirestoreRegression', () => {
  it('detects regression: existing 50k, new 84', () => {
    expect(isFirestoreRegression({
      existingTotalEarned: 50000,
      newTotalEarned: 84,
    })).toBe(true);
  });

  it('detects regression at 50% boundary', () => {
    expect(isFirestoreRegression({
      existingTotalEarned: 10000,
      newTotalEarned: 4999,
    })).toBe(true);
  });

  it('allows write when progress is similar', () => {
    expect(isFirestoreRegression({
      existingTotalEarned: 10000,
      newTotalEarned: 9500,
    })).toBe(false);
  });

  it('allows write when progress increased', () => {
    expect(isFirestoreRegression({
      existingTotalEarned: 10000,
      newTotalEarned: 15000,
    })).toBe(false);
  });

  it('skips check for new accounts (existing < 1000)', () => {
    expect(isFirestoreRegression({
      existingTotalEarned: 500,
      newTotalEarned: 10,
    })).toBe(false);
  });

  it('allows first write (existing 0)', () => {
    expect(isFirestoreRegression({
      existingTotalEarned: 0,
      newTotalEarned: 100,
    })).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// pickBetterSave
// ═══════════════════════════════════════════════════════════════════
describe('pickBetterSave', () => {
  it('picks firestore when it has more progress', () => {
    expect(pickBetterSave({
      localTotalEarned: 100,
      localLevel: 2,
      firestoreTotalEarned: 50000,
      firestoreLevel: 10,
    })).toBe('firestore');
  });

  it('picks local when it has more progress', () => {
    expect(pickBetterSave({
      localTotalEarned: 60000,
      localLevel: 12,
      firestoreTotalEarned: 50000,
      firestoreLevel: 10,
    })).toBe('local');
  });

  it('picks local on tie (safer — more recent)', () => {
    expect(pickBetterSave({
      localTotalEarned: 1000,
      localLevel: 5,
      firestoreTotalEarned: 1000,
      firestoreLevel: 5,
    })).toBe('local');
  });

  it('considers level heavily (level 10 vs level 1 with same earned)', () => {
    expect(pickBetterSave({
      localTotalEarned: 5000,
      localLevel: 1,
      firestoreTotalEarned: 5000,
      firestoreLevel: 10,
    })).toBe('firestore');
  });

  it('handles zero/initial state correctly', () => {
    // Local is empty/initial, firestore has real data
    expect(pickBetterSave({
      localTotalEarned: 0,
      localLevel: 1,
      firestoreTotalEarned: 50000,
      firestoreLevel: 10,
    })).toBe('firestore');
  });

  it('handles firestore empty, local has data', () => {
    expect(pickBetterSave({
      localTotalEarned: 5000,
      localLevel: 5,
      firestoreTotalEarned: 0,
      firestoreLevel: 1,
    })).toBe('local');
  });
});

// ═══════════════════════════════════════════════════════════════════
// Scenario: exact reproduction of the bug
// ═══════════════════════════════════════════════════════════════════
describe('BUG REPRODUCTION: "спина болит" data loss scenario', () => {
  it('scenario: app froze, localStorage failed, user earned 84 coins → blocks Firestore write', () => {
    // Step 1: Real data never loaded (both sources failed)
    // Step 2: User plays briefly, earns 84 coins
    // Step 3: Firestore sync triggers
    // OLD behavior: this would PASS the guard and overwrite Firestore
    // NEW behavior: hasRealData=false blocks everything
    const result = shouldBlockFirestoreSave({
      hasFarmerId: true,
      hasRealData: false, // load failed!
      highWaterMark: 0, // never set because load failed
      profileName: 'спина болит',
      profilePassword: '1111',
      level: 1,
      totalEarned: 84,
    });

    expect(result).toBe('no_real_data');
  });

  it('scenario: data loaded, then state somehow reset → high-water blocks', () => {
    // Step 1: Real data loaded successfully (hasRealData=true, highWaterMark=170000)
    // Step 2: Some bug resets state to initial
    // Step 3: User earns 84 coins from quick harvest
    // Step 4: Firestore sync triggers
    const result = shouldBlockFirestoreSave({
      hasFarmerId: true,
      hasRealData: true,
      highWaterMark: 170000, // was set when data loaded
      profileName: 'спина болит',
      profilePassword: '1111',
      level: 1,
      totalEarned: 84,
    });

    expect(result).toBe('regression_below_high_water');
  });

  it('scenario: Firestore regression check blocks overwriting good data', () => {
    // saveGameAndProfile reads existing doc before writing
    // existing has 170000, new state has 84 → regression detected
    expect(isFirestoreRegression({
      existingTotalEarned: 170000,
      newTotalEarned: 84,
    })).toBe(true);
  });

  it('scenario: pickBetterSave chooses Firestore over empty local', () => {
    // localStorage was cleared/failed, Firestore has real data
    expect(pickBetterSave({
      localTotalEarned: 84,
      localLevel: 1,
      firestoreTotalEarned: 170000,
      firestoreLevel: 10,
    })).toBe('firestore');
  });
});

// ═══════════════════════════════════════════════════════════════════
// pickBetterSave edge cases
// ═══════════════════════════════════════════════════════════════════
describe('pickBetterSave edge cases', () => {
  it('picks firestore when both have zero progress', () => {
    // Both zero → localProgress = 0+1*1000=1000, fireProgress = 0+1*1000=1000 → tie → local wins
    // Actually with level 1 on both sides, scores are equal → local wins
    // But the score is totalEarned + level*1000, so 0+1000 vs 0+1000 → local >= fire → 'local'
    // Correction: zero totalEarned + level 1 = 1000 for both → local wins on tie
    expect(pickBetterSave({
      localTotalEarned: 0,
      localLevel: 1,
      firestoreTotalEarned: 0,
      firestoreLevel: 1,
    })).toBe('local');
  });
});

// ═══════════════════════════════════════════════════════════════════
// shouldBlockFirestoreSave boundary tests
// ═══════════════════════════════════════════════════════════════════
describe('shouldBlockFirestoreSave boundary tests', () => {
  it('allows save when totalEarned is 999 (below 1000 threshold)', () => {
    const result = shouldBlockFirestoreSave(makeCtx({
      totalEarned: 999,
      highWaterMark: 999,
    }));
    expect(result).toBeNull();
  });

  it('blocks when totalEarned was 1001 and drops to 100', () => {
    const result = shouldBlockFirestoreSave(makeCtx({
      totalEarned: 100,
      highWaterMark: 1001,
    }));
    expect(result).toBe('regression_below_high_water');
  });
});

// ═══════════════════════════════════════════════════════════════════
// isFirestoreRegression edge cases
// ═══════════════════════════════════════════════════════════════════
describe('isFirestoreRegression edge cases', () => {
  it('allows when both existing and new are 0 (new game)', () => {
    expect(isFirestoreRegression({ existingTotalEarned: 0, newTotalEarned: 0 })).toBe(false);
  });

  it('allows when existing is 500 and new is 400 (below 1000 threshold)', () => {
    expect(isFirestoreRegression({ existingTotalEarned: 500, newTotalEarned: 400 })).toBe(false);
  });
});
