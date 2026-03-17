import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';
import { getFarmerId } from './db';
import { loadGame, clearSave } from '../state/storage';
import type { GameState } from '../types';

/**
 * Save full game state to Firestore (merge — won't overwrite profile/leaderboard fields)
 */
export async function saveGameToFirestore(state: GameState): Promise<void> {
  const id = getFarmerId();
  await setDoc(doc(db, 'farmers', id), { gameState: state }, { merge: true });
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
