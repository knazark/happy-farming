import {
  doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove,
  collection, query, orderBy, limit, getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';

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
  lastSeen: unknown;
  createdAt: unknown;
}

// Get or create farmer ID from localStorage
const FARMER_ID_KEY = 'happyFarmer_id';

export function getFarmerId(): string {
  let id = localStorage.getItem(FARMER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(FARMER_ID_KEY, id);
  }
  return id;
}

// Sync local game state to Firestore profile
export async function syncProfile(state: {
  profile: { name: string; avatar: string };
  level: number;
  xp: number;
  coins: number;
  totalEarned: number;
  animals: unknown[];
  plots: { status: string }[];
}): Promise<void> {
  const id = getFarmerId();
  const unlockedPlots = state.plots.filter(p => p.status !== 'locked').length;
  const score = state.level * state.animals.length * unlockedPlots;

  await setDoc(doc(db, 'farmers', id), {
    id,
    name: state.profile.name || 'Фермер',
    avatar: state.profile.avatar || '👨‍🌾',
    level: state.level,
    xp: state.xp,
    coins: state.coins,
    totalEarned: state.totalEarned,
    animalCount: state.animals.length,
    unlockedPlots,
    score,
    lastSeen: serverTimestamp(),
  }, { merge: true });
}

// Ensure profile exists (called once on mount)
export async function ensureProfile(state: Parameters<typeof syncProfile>[0]): Promise<void> {
  const id = getFarmerId();
  const snap = await getDoc(doc(db, 'farmers', id));
  if (!snap.exists()) {
    await setDoc(doc(db, 'farmers', id), {
      id,
      name: state.profile.name || 'Фермер',
      avatar: state.profile.avatar || '👨‍🌾',
      neighborIds: [],
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      level: state.level,
      score: 0,
    });
  }
  await syncProfile(state);
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

// Fetch top 20 leaderboard
export async function getLeaderboard(): Promise<FarmerProfile[]> {
  const q = query(collection(db, 'farmers'), orderBy('score', 'desc'), limit(20));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as FarmerProfile);
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

// Send friend request: add myId to their pendingRequests
export async function sendFriendRequest(myId: string, theirId: string): Promise<boolean> {
  if (myId === theirId) return false;
  const theirSnap = await getDoc(doc(db, 'farmers', theirId));
  if (!theirSnap.exists()) return false;
  const data = theirSnap.data();
  // Already friends?
  if ((data.neighborIds ?? []).includes(myId)) return false;
  // Already pending?
  if ((data.pendingRequests ?? []).includes(myId)) return false;
  await updateDoc(doc(db, 'farmers', theirId), { pendingRequests: arrayUnion(myId) });
  return true;
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
