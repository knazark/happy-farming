import {
  doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove,
  collection, query, orderBy, limit, getDocs, where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';

/** Central score formula — used everywhere to keep leaderboard consistent */
export function calcScore(state: {
  level: number;
  totalEarned: number;
}): number {
  // level × 100 + totalEarned / 100 — balanced, doesn't inflate too fast
  return state.level * 100 + Math.floor(state.totalEarned / 100);
}

/** Simple checksum to detect localStorage tampering (not cryptographic — just a deterrent) */
const SALT = 'hf_2026';
export function calcChecksum(state: { level: number; totalEarned: number; coins: number; totalHarvested: number }): string {
  const raw = `${SALT}:${state.level}:${state.totalEarned}:${state.coins}:${state.totalHarvested}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

export function verifyChecksum(state: { level: number; totalEarned: number; coins: number; totalHarvested: number; checksum?: string }): boolean {
  if (!state.checksum) return true; // old saves without checksum are OK
  return state.checksum === calcChecksum(state);
}

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
  neighborIds: string[];
  pendingRequests: string[];
  password?: string;
  nameLower?: string;
  lastSeen: unknown;
  createdAt: unknown;
}

// Farmer ID management
const FARMER_ID_KEY = 'happyFarmer_id';

/** Read existing farmer ID from localStorage (no side effects) */
export function getFarmerIdIfExists(): string | null {
  return localStorage.getItem(FARMER_ID_KEY);
}

/** Create a new farmer ID and store in localStorage (clears old save to prevent cloning) */
export function createFarmerId(): string {
  localStorage.removeItem('happyFarmer_save');
  const id = crypto.randomUUID();
  localStorage.setItem(FARMER_ID_KEY, id);
  return id;
}

/** Store a recovered farmer ID in localStorage */
export function setFarmerId(id: string): void {
  localStorage.setItem(FARMER_ID_KEY, id);
}

/** Clear farmer ID and game save from localStorage (logout) */
export function clearFarmerId(): void {
  localStorage.removeItem(FARMER_ID_KEY);
  localStorage.removeItem('happyFarmer_save');
}

/** Get farmer ID — throws if not set (must login or create first) */
export function getFarmerId(): string {
  const id = localStorage.getItem(FARMER_ID_KEY);
  if (!id) {
    throw new Error('No farmer ID set — user must login or create account first');
  }
  return id;
}

// Sync local game state to Firestore profile
export async function syncProfile(state: {
  profile: { name: string; avatar: string; password?: string };
  level: number;
  xp: number;
  coins: number;
  totalEarned: number;
  animals: unknown[];
  plots: { status: string }[];
}): Promise<void> {
  const id = getFarmerId();
  const unlockedPlots = state.plots.filter(p => p.status !== 'locked').length;
  const score = calcScore(state);
  const profileName = state.profile.name || 'Фермер';

  const data: Record<string, unknown> = {
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

// Ensure profile exists (called once on mount — creates doc if missing, no extra writes if exists)
export async function ensureProfile(state: Parameters<typeof syncProfile>[0]): Promise<void> {
  const id = getFarmerId();
  const profileName = state.profile.name || 'Фермер';
  const score = calcScore(state);
  const snap = await getDoc(doc(db, 'farmers', id));
  if (!snap.exists()) {
    const data: Record<string, unknown> = {
      id,
      name: profileName,
      nameLower: profileName.toLowerCase().trim(),
      avatar: state.profile.avatar || '👨‍🌾',
      neighborIds: [],
      pendingRequests: [],
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      level: state.level,
      score,
    };
    if (state.profile.password) {
      data.password = state.profile.password;
    }
    await setDoc(doc(db, 'farmers', id), data);
  } else {
    // Doc exists but might be missing password — update it
    const existing = snap.data();
    if (state.profile.password && !existing.password) {
      await setDoc(doc(db, 'farmers', id), {
        password: state.profile.password,
        name: profileName,
        nameLower: profileName.toLowerCase().trim(),
        score,
        lastSeen: serverTimestamp(),
      }, { merge: true });
    }
  }
}

// Fetch farmer profile by ID
export async function getFarmer(id: string): Promise<FarmerProfile | null> {
  const snap = await getDoc(doc(db, 'farmers', id));
  return snap.exists() ? (snap.data() as FarmerProfile) : null;
}

// Add neighbor (bidirectional)
export async function addNeighbor(myId: string, theirId: string): Promise<boolean> {
  if (myId === theirId) return false;
  const theirDoc = await getDoc(doc(db, 'farmers', theirId));
  if (!theirDoc.exists()) return false;

  await updateDoc(doc(db, 'farmers', myId), { neighborIds: arrayUnion(theirId) });
  await updateDoc(doc(db, 'farmers', theirId), { neighborIds: arrayUnion(myId) });
  return true;
}

// Remove friend (bidirectional)
export async function removeFriend(myId: string, theirId: string): Promise<void> {
  await updateDoc(doc(db, 'farmers', myId), { neighborIds: arrayRemove(theirId) });
  await updateDoc(doc(db, 'farmers', theirId), { neighborIds: arrayRemove(myId) });
}

// Fetch multiple farmers by IDs
export async function getNeighborProfiles(ids: string[]): Promise<FarmerProfile[]> {
  if (ids.length === 0) return [];
  const results: FarmerProfile[] = [];
  for (const id of ids) {
    const snap = await getDoc(doc(db, 'farmers', id));
    if (snap.exists()) results.push(snap.data() as FarmerProfile);
  }
  return results;
}

// Fetch top 20 leaderboard (only players with a profile name)
export async function getLeaderboard(): Promise<FarmerProfile[]> {
  try {
    const q = query(collection(db, 'farmers'), orderBy('score', 'desc'), limit(30));
    const snap = await getDocs(q);
    return snap.docs
      .map(d => {
        const data = d.data() as FarmerProfile;
        // Recalculate score from real fields if available (in case formula changed)
        if (data.totalEarned > 0 || data.level > 1) {
          data.score = calcScore({ level: data.level ?? 1, totalEarned: data.totalEarned ?? 0 });
        }
        return data;
      })
      .filter(f => f.name && (f.score > 0 || f.totalEarned > 0 || f.level > 1))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  } catch (err) {
    console.error('Leaderboard fetch failed:', err);
    return [];
  }
}

// Record daily help interaction
export async function recordHelp(myId: string, neighborId: string): Promise<void> {
  await setDoc(
    doc(db, 'farmers', myId, 'interactions', neighborId),
    { helpedAt: serverTimestamp() },
    { merge: true },
  );
}

// Record daily gift collection
export async function recordGiftCollect(myId: string, neighborId: string): Promise<void> {
  await setDoc(
    doc(db, 'farmers', myId, 'interactions', neighborId),
    { giftCollectedAt: serverTimestamp() },
    { merge: true },
  );
}

// Get today's interactions with a neighbor
export async function getInteraction(myId: string, neighborId: string): Promise<{
  helpedToday: boolean;
  giftCollectedToday: boolean;
}> {
  const snap = await getDoc(doc(db, 'farmers', myId, 'interactions', neighborId));
  if (!snap.exists()) return { helpedToday: false, giftCollectedToday: false };
  const data = snap.data();
  const today = new Date().toDateString();
  const helpedToday = data.helpedAt?.toDate?.()?.toDateString?.() === today;
  const giftToday = data.giftCollectedAt?.toDate?.()?.toDateString?.() === today;
  return { helpedToday: helpedToday ?? false, giftCollectedToday: giftToday ?? false };
}

/// Send friend request: add myId to their pendingRequests
export async function sendFriendRequest(myId: string, theirId: string): Promise<boolean> {
  if (myId === theirId) return false;
  try {
    const theirSnap = await getDoc(doc(db, 'farmers', theirId));
    if (!theirSnap.exists()) return false;
    const data = theirSnap.data();
    // Already friends?
    if ((data.neighborIds ?? []).includes(myId)) return false;
    // Already pending?
    if ((data.pendingRequests ?? []).includes(myId)) return false;
    await updateDoc(doc(db, 'farmers', theirId), { pendingRequests: arrayUnion(myId) });
    return true;
  } catch (err) {
    console.error('sendFriendRequest failed:', err);
    return false;
  }
}

// Accept friend request: add as neighbors + remove from pendingRequests
export async function acceptFriendRequest(myId: string, theirId: string): Promise<void> {
  await updateDoc(doc(db, 'farmers', myId), {
    neighborIds: arrayUnion(theirId),
    pendingRequests: arrayRemove(theirId),
  });
  await updateDoc(doc(db, 'farmers', theirId), {
    neighborIds: arrayUnion(myId),
  });
}

// Decline friend request: just remove from pendingRequests
export async function declineFriendRequest(myId: string, theirId: string): Promise<void> {
  await updateDoc(doc(db, 'farmers', myId), {
    pendingRequests: arrayRemove(theirId),
  });
}

// Get pending friend requests (profiles of people who sent requests)
export async function getPendingRequests(myId: string): Promise<FarmerProfile[]> {
  const snap = await getDoc(doc(db, 'farmers', myId));
  if (!snap.exists()) return [];
  const ids: string[] = snap.data().pendingRequests ?? [];
  if (ids.length === 0) return [];
  return getNeighborProfiles(ids);
}

// Login by name (case-insensitive) + password (case-sensitive)
export async function loginByNameAndPassword(name: string, password: string): Promise<string | null> {
  const nameLower = name.toLowerCase().trim();
  if (!nameLower || !password) return null;

  const q = query(
    collection(db, 'farmers'),
    where('nameLower', '==', nameLower),
    where('password', '==', password),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data().id as string;
}
