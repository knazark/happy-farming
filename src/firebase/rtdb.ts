import {
  ref, get, set, update, remove, onValue, onDisconnect,
  runTransaction, query, orderByChild, limitToLast,
  serverTimestamp,
} from 'firebase/database';
import { rtdb } from './config';
import type { GameState, PlotState, Inventory, ItemId } from '../types';

// ─── FarmerProfile ──────────────────────────────────────────────────────────
export interface FarmerProfile {
  id: string;
  name: string;
  avatar: string;
  level: number;
  xp: number;
  coins: number;
  totalEarned: number;
  animalCount: number;
  unlockedPlots: number;
  score: number;
  password?: string;
  nameLower?: string;
  lastSeen: unknown;
  createdAt: unknown;
}

// ─── Pure helpers (re-exported from pure.ts — no Firebase deps) ─────────────
import { calcScore, hashPassword } from './pure';
export { calcScore, calcChecksum, verifyChecksum, hashPassword } from './pure';

// ─── Farmer ID management (localStorage) ───────────────────────────────────

const FARMER_ID_KEY = 'happyFarmer_id';

export function getFarmerIdIfExists(): string | null {
  return localStorage.getItem(FARMER_ID_KEY);
}

export function createFarmerId(): string {
  localStorage.removeItem('happyFarmer_save');
  const id = crypto.randomUUID();
  localStorage.setItem(FARMER_ID_KEY, id);
  return id;
}

export function setFarmerId(id: string): void {
  localStorage.setItem(FARMER_ID_KEY, id);
}

export function clearFarmerId(): void {
  localStorage.removeItem(FARMER_ID_KEY);
  localStorage.removeItem('happyFarmer_save');
}

export function getFarmerId(): string {
  const id = localStorage.getItem(FARMER_ID_KEY);
  if (!id) {
    throw new Error('No farmer ID set — user must login or create account first');
  }
  return id;
}

// ─── Pure function: apply friend harvest ────────────────────────────────────

export function applyFriendHarvest(
  gs: GameState,
  plotIndex: number,
  helperName: string,
): GameState | null {
  const plot = gs.plots[plotIndex];
  if (!plot || (plot.status !== 'ready' && plot.status !== 'wood_ready')) return null;

  const isWood = plot.status === 'wood_ready';
  const itemId: ItemId = isWood ? 'firewood' : plot.cropId;

  const newPlots = [...gs.plots];
  let soilLevel = plot.soilLevel;
  let soilHarvestsLeft = plot.soilHarvestsLeft;
  if (!isWood && soilLevel && soilLevel > 0 && soilHarvestsLeft != null) {
    soilHarvestsLeft -= 1;
    if (soilHarvestsLeft <= 0) {
      soilLevel = undefined;
      soilHarvestsLeft = undefined;
    }
  }

  const emptyPlot: Record<string, unknown> = { status: 'empty' };
  if (soilLevel != null) emptyPlot.soilLevel = soilLevel;
  if (soilHarvestsLeft != null) emptyPlot.soilHarvestsLeft = soilHarvestsLeft;
  if (!isWood && plot.autoCropId) emptyPlot.autoCropId = plot.autoCropId;
  newPlots[plotIndex] = emptyPlot as PlotState;

  const newInv: Inventory = { ...gs.inventory, [itemId]: ((gs.inventory[itemId] ?? 0) + 1) };
  const helpLog = [...(gs.helpLog ?? []), { helper: helperName, cropId: isWood ? 'wheat' as any : plot.cropId, at: Date.now() }];

  return {
    ...gs,
    plots: newPlots,
    inventory: newInv,
    totalHarvested: gs.totalHarvested + 1,
    helpLog,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Strip undefined values (RTDB rejects them) */
function cleanForRTDB<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function isTodayTimestamp(ts: unknown): boolean {
  if (typeof ts !== 'number') return false;
  return new Date(ts).toDateString() === new Date().toDateString();
}

// ═══════════════════════════════════════════════════════════════════════════
//  1. Game State
// ═══════════════════════════════════════════════════════════════════════════

/** Atomic multi-path update: writes gameState + profile fields + lastSeen */
export async function saveGameState(farmerId: string, state: GameState): Promise<void> {
  const cleanState = cleanForRTDB(state);
  const profileName = state.profile.name || 'Фермер';
  const score = calcScore(state);
  const unlockedPlots = state.plots.filter(p => p.status !== 'locked').length;

  const updates: Record<string, unknown> = {};
  updates[`gameStates/${farmerId}`] = cleanState;
  updates[`profiles/${farmerId}/name`] = profileName;
  updates[`profiles/${farmerId}/nameLower`] = profileName.toLowerCase().trim();
  updates[`profiles/${farmerId}/avatar`] = state.profile.avatar || '👨‍🌾';
  updates[`profiles/${farmerId}/level`] = state.level;
  updates[`profiles/${farmerId}/score`] = score;
  updates[`profiles/${farmerId}/xp`] = state.xp;
  updates[`profiles/${farmerId}/coins`] = state.coins;
  updates[`profiles/${farmerId}/totalEarned`] = state.totalEarned;
  updates[`profiles/${farmerId}/animalCount`] = state.animals.length;
  updates[`profiles/${farmerId}/unlockedPlots`] = unlockedPlots;
  updates[`profiles/${farmerId}/lastSeen`] = serverTimestamp();
  updates[`presence/${farmerId}/lastSeen`] = serverTimestamp();

  await update(ref(rtdb), updates);
}

/** One-time read of full game state */
export async function loadGameState(farmerId: string): Promise<GameState | null> {
  const snap = await get(ref(rtdb, `gameStates/${farmerId}`));
  if (!snap.exists()) return null;
  return snap.val() as GameState;
}

/** Real-time subscription to game state. Returns an unsubscribe function. */
export function subscribeGameState(
  farmerId: string,
  callback: (state: GameState | null) => void,
): () => void {
  const gsRef = ref(rtdb, `gameStates/${farmerId}`);
  const unsub = onValue(gsRef, (snap) => {
    callback(snap.exists() ? (snap.val() as GameState) : null);
  });
  return unsub;
}

/** Sets online status and registers onDisconnect handler */
export function setupPresence(farmerId: string): void {
  const presRef = ref(rtdb, `presence/${farmerId}`);
  set(presRef, { online: true, lastSeen: serverTimestamp() });
  onDisconnect(presRef).set({ online: false, lastSeen: serverTimestamp() });
}

// ═══════════════════════════════════════════════════════════════════════════
//  2. Profile
// ═══════════════════════════════════════════════════════════════════════════

/** Creates profile + gameState if not exists, updates if exists */
export async function ensureProfileRTDB(farmerId: string, state: GameState): Promise<void> {
  const profileName = state.profile.name || 'Фермер';
  const score = calcScore(state);
  const cleanState = cleanForRTDB(state);
  const unlockedPlots = state.plots.filter(p => p.status !== 'locked').length;

  const profileSnap = await get(ref(rtdb, `profiles/${farmerId}`));

  if (!profileSnap.exists()) {
    // Create full profile + gameState + nameLookup
    const updates: Record<string, unknown> = {};

    const profileData: Record<string, unknown> = {
      id: farmerId,
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
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
    };

    if (state.profile.password) {
      profileData.password = await hashPassword(state.profile.password);
    }

    updates[`profiles/${farmerId}`] = profileData;
    updates[`gameStates/${farmerId}`] = cleanState;
    updates[`nameLookup/${profileName.toLowerCase().trim()}`] = farmerId;

    await update(ref(rtdb), updates);
  } else {
    // Doc exists — update profile fields + ensure gameState exists
    const existing = profileSnap.val() as Record<string, unknown>;
    const updates: Record<string, unknown> = {};

    updates[`profiles/${farmerId}/name`] = profileName;
    updates[`profiles/${farmerId}/nameLower`] = profileName.toLowerCase().trim();
    updates[`profiles/${farmerId}/score`] = score;
    updates[`profiles/${farmerId}/level`] = state.level;
    updates[`profiles/${farmerId}/lastSeen`] = serverTimestamp();

    // Write gameState if missing
    const gsSnap = await get(ref(rtdb, `gameStates/${farmerId}`));
    if (!gsSnap.exists()) {
      updates[`gameStates/${farmerId}`] = cleanState;
    }

    // Hash and set password if new or missing
    if (state.profile.password && !existing.password) {
      updates[`profiles/${farmerId}/password`] = await hashPassword(state.profile.password);
    }

    // Update nameLookup
    updates[`nameLookup/${profileName.toLowerCase().trim()}`] = farmerId;

    await update(ref(rtdb), updates);
  }
}

/** Read a single farmer profile */
export async function getFarmerProfile(farmerId: string): Promise<FarmerProfile | null> {
  const snap = await get(ref(rtdb, `profiles/${farmerId}`));
  if (!snap.exists()) return null;
  return snap.val() as FarmerProfile;
}

/** Batch-read multiple farmer profiles */
export async function getNeighborProfiles(ids: string[]): Promise<FarmerProfile[]> {
  if (ids.length === 0) return [];
  const results: FarmerProfile[] = [];
  for (const id of ids) {
    const snap = await get(ref(rtdb, `profiles/${id}`));
    if (snap.exists()) results.push(snap.val() as FarmerProfile);
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
//  3. Friends
// ═══════════════════════════════════════════════════════════════════════════

/** Get friend IDs for a farmer */
export async function getFriendIds(farmerId: string): Promise<string[]> {
  const snap = await get(ref(rtdb, `friends/${farmerId}`));
  if (!snap.exists()) return [];
  return Object.keys(snap.val());
}

/** Add friend (bidirectional) using multi-path update */
export async function addFriend(myId: string, theirId: string): Promise<boolean> {
  if (myId === theirId) return false;
  const theirProfile = await get(ref(rtdb, `profiles/${theirId}`));
  if (!theirProfile.exists()) return false;

  const updates: Record<string, unknown> = {};
  updates[`friends/${myId}/${theirId}`] = true;
  updates[`friends/${theirId}/${myId}`] = true;
  await update(ref(rtdb), updates);
  return true;
}

/** Remove friend (bidirectional) */
export async function removeFriend(myId: string, theirId: string): Promise<void> {
  const updates: Record<string, unknown> = {};
  updates[`friends/${myId}/${theirId}`] = null;
  updates[`friends/${theirId}/${myId}`] = null;
  await update(ref(rtdb), updates);
}

/** Send friend request: add myId to their pending requests */
export async function sendFriendRequest(myId: string, theirId: string): Promise<boolean> {
  if (myId === theirId) return false;
  try {
    const theirProfile = await get(ref(rtdb, `profiles/${theirId}`));
    if (!theirProfile.exists()) return false;

    // Already friends?
    const friendSnap = await get(ref(rtdb, `friends/${theirId}/${myId}`));
    if (friendSnap.exists()) return false;

    // Already pending?
    const pendingSnap = await get(ref(rtdb, `pendingRequests/${theirId}/${myId}`));
    if (pendingSnap.exists()) return false;

    await set(ref(rtdb, `pendingRequests/${theirId}/${myId}`), true);
    return true;
  } catch (err) {
    console.error('sendFriendRequest failed:', err);
    return false;
  }
}

/** Accept friend request: add as friends + remove from pending */
export async function acceptFriendRequest(myId: string, theirId: string): Promise<void> {
  const updates: Record<string, unknown> = {};
  updates[`friends/${myId}/${theirId}`] = true;
  updates[`friends/${theirId}/${myId}`] = true;
  updates[`pendingRequests/${myId}/${theirId}`] = null;
  await update(ref(rtdb), updates);
}

/** Decline friend request: remove from pending */
export async function declineFriendRequest(myId: string, theirId: string): Promise<void> {
  await remove(ref(rtdb, `pendingRequests/${myId}/${theirId}`));
}

/** Get pending friend requests (profiles of people who sent requests) */
export async function getPendingRequests(myId: string): Promise<FarmerProfile[]> {
  const snap = await get(ref(rtdb, `pendingRequests/${myId}`));
  if (!snap.exists()) return [];
  const requesterIds = Object.keys(snap.val() as Record<string, boolean>);
  if (requesterIds.length === 0) return [];
  return getNeighborProfiles(requesterIds);
}

// ═══════════════════════════════════════════════════════════════════════════
//  4. Interactions
// ═══════════════════════════════════════════════════════════════════════════

/** Record daily help interaction */
export async function recordHelp(myId: string, neighborId: string): Promise<void> {
  await set(ref(rtdb, `interactions/${myId}/${neighborId}/helpedAt`), serverTimestamp());
}

/** Record daily gift collection */
export async function recordGiftCollect(myId: string, neighborId: string): Promise<void> {
  await set(ref(rtdb, `interactions/${myId}/${neighborId}/giftCollectedAt`), serverTimestamp());
}

/** Get today's interactions with a neighbor */
export async function getInteraction(myId: string, neighborId: string): Promise<{
  helpedToday: boolean;
  giftCollectedToday: boolean;
}> {
  const snap = await get(ref(rtdb, `interactions/${myId}/${neighborId}`));
  if (!snap.exists()) return { helpedToday: false, giftCollectedToday: false };
  const data = snap.val() as { helpedAt?: number; giftCollectedAt?: number };
  return {
    helpedToday: isTodayTimestamp(data.helpedAt),
    giftCollectedToday: isTodayTimestamp(data.giftCollectedAt),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  5. Friend Harvest (transactional)
// ═══════════════════════════════════════════════════════════════════════════

/** Atomic compare-and-swap harvest of a friend's plot */
export async function harvestFriendPlot(
  friendId: string,
  plotIndex: number,
  helperName: string,
): Promise<GameState | null> {
  const gsRef = ref(rtdb, `gameStates/${friendId}`);
  let result: GameState | null = null;

  await runTransaction(gsRef, (currentData: GameState | null) => {
    if (!currentData) return currentData;

    const updated = applyFriendHarvest(currentData, plotIndex, helperName);
    if (!updated) return undefined; // abort transaction

    result = updated;
    return cleanForRTDB(updated);
  });

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
//  6. Leaderboard
// ═══════════════════════════════════════════════════════════════════════════

/** Top 20 players by score */
export async function getLeaderboard(): Promise<FarmerProfile[]> {
  try {
    const q = query(ref(rtdb, 'profiles'), orderByChild('score'), limitToLast(20));
    const snap = await get(q);
    if (!snap.exists()) return [];

    const profiles: FarmerProfile[] = [];
    snap.forEach((child) => {
      const data = child.val() as FarmerProfile;
      // Recalculate score from real fields in case formula changed
      if (data.totalEarned > 0 || data.level > 1) {
        data.score = calcScore({ level: data.level ?? 1, totalEarned: data.totalEarned ?? 0 });
      }
      if (data.name && (data.score > 0 || data.totalEarned > 0 || data.level > 1)) {
        profiles.push(data);
      }
    });

    // limitToLast returns ascending; sort descending
    return profiles.sort((a, b) => b.score - a.score);
  } catch (err) {
    console.error('Leaderboard fetch failed:', err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  7. Login
// ═══════════════════════════════════════════════════════════════════════════

/** Login by name (case-insensitive) + password */
export async function loginByNameAndPassword(name: string, password: string): Promise<string | null> {
  const nameLower = name.toLowerCase().trim();
  if (!nameLower || !password) return null;

  // Look up farmerId via nameLookup
  const lookupSnap = await get(ref(rtdb, `nameLookup/${nameLower}`));
  if (!lookupSnap.exists()) return null;

  const farmerId = lookupSnap.val() as string;

  // Read password from profile
  const pwdSnap = await get(ref(rtdb, `profiles/${farmerId}/password`));
  if (!pwdSnap.exists()) return null;
  const storedPassword = pwdSnap.val() as string;

  const hashed = await hashPassword(password);

  // Check hashed password
  if (storedPassword === hashed) return farmerId;

  // Fallback: check plain-text (legacy) and migrate
  if (storedPassword === password) {
    await set(ref(rtdb, `profiles/${farmerId}/password`), hashed);
    return farmerId;
  }

  return null;
}

/** Check if a name is already taken */
export async function isNameTaken(name: string): Promise<boolean> {
  const nameLower = name.toLowerCase().trim();
  if (!nameLower) return false;
  const snap = await get(ref(rtdb, `nameLookup/${nameLower}`));
  return snap.exists();
}
