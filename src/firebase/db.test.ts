import { describe, it, expect } from 'vitest';
import { calcScore, calcChecksum, verifyChecksum } from './db';

describe('calcScore', () => {
  it('returns level * 100 + floor(totalEarned / 100)', () => {
    expect(calcScore({ level: 1, totalEarned: 0 })).toBe(100);
    expect(calcScore({ level: 5, totalEarned: 1000 })).toBe(510);
    expect(calcScore({ level: 10, totalEarned: 5050 })).toBe(1050);
  });

  it('floors the totalEarned component', () => {
    expect(calcScore({ level: 1, totalEarned: 99 })).toBe(100);
    expect(calcScore({ level: 1, totalEarned: 150 })).toBe(101);
  });

  it('handles zero values', () => {
    expect(calcScore({ level: 0, totalEarned: 0 })).toBe(0);
  });

  it('handles large values', () => {
    expect(calcScore({ level: 100, totalEarned: 1000000 })).toBe(20000);
  });
});

describe('calcChecksum', () => {
  it('returns a base-36 string', () => {
    const cs = calcChecksum({ level: 1, totalEarned: 0, coins: 100, totalHarvested: 0 });
    expect(typeof cs).toBe('string');
    expect(cs).toMatch(/^[0-9a-z]+$/);
  });

  it('is deterministic for the same input', () => {
    const state = { level: 5, totalEarned: 1000, coins: 500, totalHarvested: 50 };
    const a = calcChecksum(state);
    const b = calcChecksum(state);
    expect(a).toBe(b);
  });

  it('changes when any field changes', () => {
    const base = { level: 5, totalEarned: 1000, coins: 500, totalHarvested: 50 };
    const original = calcChecksum(base);

    expect(calcChecksum({ ...base, level: 6 })).not.toBe(original);
    expect(calcChecksum({ ...base, totalEarned: 1001 })).not.toBe(original);
    expect(calcChecksum({ ...base, coins: 501 })).not.toBe(original);
    expect(calcChecksum({ ...base, totalHarvested: 51 })).not.toBe(original);
  });

  it('handles zero state', () => {
    const cs = calcChecksum({ level: 0, totalEarned: 0, coins: 0, totalHarvested: 0 });
    expect(typeof cs).toBe('string');
    expect(cs.length).toBeGreaterThan(0);
  });
});

describe('verifyChecksum', () => {
  it('returns true when no checksum is present (old saves)', () => {
    expect(verifyChecksum({ level: 1, totalEarned: 0, coins: 100, totalHarvested: 0 })).toBe(true);
  });

  it('returns true when checksum is undefined', () => {
    expect(verifyChecksum({ level: 1, totalEarned: 0, coins: 100, totalHarvested: 0, checksum: undefined })).toBe(true);
  });

  it('returns true for a valid checksum', () => {
    const state = { level: 5, totalEarned: 1000, coins: 500, totalHarvested: 50 };
    const checksum = calcChecksum(state);
    expect(verifyChecksum({ ...state, checksum })).toBe(true);
  });

  it('returns false for a tampered state', () => {
    const state = { level: 5, totalEarned: 1000, coins: 500, totalHarvested: 50 };
    const checksum = calcChecksum(state);
    // Tamper with coins
    expect(verifyChecksum({ ...state, coins: 99999, checksum })).toBe(false);
  });

  it('returns false for a completely wrong checksum', () => {
    expect(verifyChecksum({ level: 1, totalEarned: 0, coins: 100, totalHarvested: 0, checksum: 'bogus' })).toBe(false);
  });
});
