/**
 * Pure functions that determine whether a Firestore save should proceed.
 * Extracted from GameContext for testability.
 */

export interface SaveGuardContext {
  hasRealData: boolean;
  highWaterMark: number;
  hasFarmerId: boolean;
  profileName: string;
  profilePassword: string | undefined;
  level: number;
  totalEarned: number;
}

export type SaveBlockReason =
  | 'no_farmer_id'
  | 'no_real_data'
  | 'no_profile'
  | 'regression_below_high_water'
  | null; // null = save allowed

/**
 * Check whether a Firestore save should be allowed.
 * Returns null if save is OK, or a reason string if blocked.
 */
export function shouldBlockFirestoreSave(ctx: SaveGuardContext): SaveBlockReason {
  if (!ctx.hasFarmerId) return 'no_farmer_id';
  if (!ctx.hasRealData) return 'no_real_data';
  if (!ctx.profileName || !ctx.profilePassword) return 'no_profile';
  if (ctx.highWaterMark > 1000 && ctx.totalEarned < ctx.highWaterMark * 0.1) {
    return 'regression_below_high_water';
  }
  return null;
}

export interface RegressionCheckInput {
  existingTotalEarned: number;
  newTotalEarned: number;
}

/**
 * Check whether writing to Firestore would be a regression (overwriting better data).
 * Returns true if the write should be BLOCKED.
 */
export function isFirestoreRegression(input: RegressionCheckInput): boolean {
  if (input.existingTotalEarned > 1000 && input.newTotalEarned < input.existingTotalEarned * 0.5) {
    return true;
  }
  return false;
}

export interface ProgressCompareInput {
  localTotalEarned: number;
  localLevel: number;
  firestoreTotalEarned: number;
  firestoreLevel: number;
}

/**
 * Pick the better save between local and Firestore based on progress.
 * Returns 'local' or 'firestore'.
 */
export function pickBetterSave(input: ProgressCompareInput): 'local' | 'firestore' {
  const localProgress = input.localTotalEarned + input.localLevel * 1000;
  const fireProgress = input.firestoreTotalEarned + input.firestoreLevel * 1000;
  return localProgress >= fireProgress ? 'local' : 'firestore';
}
