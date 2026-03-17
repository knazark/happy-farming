import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import { getFarmerId } from './db';
import { loadGame, clearSave } from '../state/storage';
import type { GameState, Inventory, ItemId, PlotState } from '../types';

/**
 * Save full game state to Firestore (merge — won't overwrite profile/leaderboard fields)
 */
export async function saveGameToFirestore(state: GameState): Promise<void> {
  const id = getFarmerId();
  // Strip undefined values — Firestore rejects them
  const clean = JSON.parse(JSON.stringify(state));
  await setDoc(doc(db, 'farmers', id), { gameState: clean }, { merge: true });
}

/**
 * Combined save: game state + profile in a single Firestore write
 */
export async function saveGameAndProfile(state: GameState): Promise<void> {
  const id = getFarmerId();
  const clean = JSON.parse(JSON.stringify(state));

  const unlockedPlots = state.plots.filter((p: { status: string }) => p.status !== 'locked').length;
  const score = state.level * state.animals.length * unlockedPlots;
  const profileName = state.profile.name || 'Фермер';

  const data: Record<string, unknown> = {
    gameState: clean,
    id,
    name: profileName,
    nameLower: profileName.toLowerCase().trim(),
    avatar: state.profile.avatar || '👨‍🌾',
    level: state.level,
    xp: state.xp,
    coins: state.coins,
    totalEarned: state.totalEarned,
    animalCount: state.animals.length,
    unlockedPlots,
    score,
    lastSeen: serverTimestamp(),
  };

  if (state.profile.password) {
    data.password = state.profile.password;
  }

  await setDoc(doc(db, 'farmers', id), data, { merge: true });
}

/**
 * Load full game state from Firestore
 */
export async function loadGameFromFirestore(): Promise<GameState | null> {
  const id = getFarmerId();
  const snap = await getDoc(doc(db, 'farmers', id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return (data?.gameState as GameState) ?? null;
}

/**
 * One-time migration: localStorage → Firestore.
 * If localStorage has save data, write it to Firestore and clear localStorage.
 * Idempotent — if localStorage is empty, does nothing.
 */
export async function migrateFromLocalStorage(): Promise<GameState | null> {
  const localState = loadGame();
  if (!localState) return null;

  // Write to Firestore first — only clear localStorage if write succeeds
  await saveGameToFirestore(localState);
  clearSave();
  return localState;
}

/**
 * Load a friend's game state from Firestore (read-only)
 */
export async function loadFriendGameState(friendId: string): Promise<GameState | null> {
  const snap = await getDoc(doc(db, 'farmers', friendId));
  if (!snap.exists()) return null;
  return (snap.data()?.gameState as GameState) ?? null;
}

/**
 * Pure logic: apply harvest to a friend's game state.
 * Returns updated GameState or null if plot isn't ready.
 */
export function applyFriendHarvest(
  gs: GameState,
  plotIndex: number,
  helperName: string,
): GameState | null {
  const plot = gs.plots[plotIndex];
  if (!plot || plot.status !== 'ready') return null;

  const cropId = plot.cropId;

  // Update plot → empty
  const newPlots = [...gs.plots];
  // Decrement soil harvests
  let soilLevel = plot.soilLevel;
  let soilHarvestsLeft = plot.soilHarvestsLeft;
  if (soilLevel && soilLevel > 0 && soilHarvestsLeft != null) {
    soilHarvestsLeft -= 1;
    if (soilHarvestsLeft <= 0) {
      soilLevel = undefined;
      soilHarvestsLeft = undefined;
    }
  }

  const emptyPlot: Record<string, unknown> = { status: 'empty' };
  if (soilLevel != null) emptyPlot.soilLevel = soilLevel;
  if (soilHarvestsLeft != null) emptyPlot.soilHarvestsLeft = soilHarvestsLeft;
  if (plot.autoCropId) emptyPlot.autoCropId = plot.autoCropId;
  newPlots[plotIndex] = emptyPlot as PlotState;

  // Add crop to inventory
  const newInv: Inventory = { ...gs.inventory, [cropId]: ((gs.inventory[cropId as ItemId] ?? 0) + 1) };

  // Add helper notification (copy array to avoid mutation)
  const helpLog = [...(gs.helpLog ?? []), { helper: helperName, cropId, at: Date.now() }];

  return {
    ...gs,
    plots: newPlots,
    inventory: newInv,
    totalHarvested: gs.totalHarvested + 1,
    helpLog,
  };
}

/**
 * Harvest a friend's ready plot: set plot to empty, add crop to their inventory.
 * Returns the updated friend GameState, or null if plot wasn't ready.
 */
export async function harvestFriendPlot(
  friendId: string,
  plotIndex: number,
  helperName: string,
): Promise<GameState | null> {
  const snap = await getDoc(doc(db, 'farmers', friendId));
  if (!snap.exists()) return null;

  const gs = snap.data()?.gameState as GameState | undefined;
  if (!gs) return null;

  const updated = applyFriendHarvest(gs, plotIndex, helperName);
  if (!updated) return null;

  // Strip undefined values — Firestore rejects them
  const clean = JSON.parse(JSON.stringify(updated));
  await setDoc(doc(db, 'farmers', friendId), { gameState: clean }, { merge: true });
  return updated;
}
