# Multiplayer Neighbors & Leaderboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace fake NPC neighbors with real multiplayer using Firebase Firestore, invite links, and a leaderboard.

**Architecture:** Firebase Firestore accessed directly from React client via SDK. Anonymous identity via UUID in localStorage. Invite via URL query param `?invite=<id>`. Autosave syncs profile to Firestore alongside existing localStorage save.

**Tech Stack:** Firebase JS SDK v10 (modular), react-router-dom v7 (for invite URL handling), existing React 19 + Vite 8.

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install Firebase and react-router**

Run:
```bash
npm install firebase react-router-dom
```

**Step 2: Verify build**

Run: `npm run build`
Expected: 0 errors

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add firebase and react-router-dom dependencies"
```

---

### Task 2: Firebase Project Config

**Files:**
- Create: `src/firebase/config.ts`
- Create: `src/firebase/db.ts`

**Step 1: Create Firebase config file**

```typescript
// src/firebase/config.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

**Step 2: Create Firestore service layer**

```typescript
// src/firebase/db.ts
import {
  doc, getDoc, setDoc, updateDoc, arrayUnion,
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

// Fetch multiple farmers by IDs
export async function getNeighborProfiles(ids: string[]): Promise<FarmerProfile[]> {
  if (ids.length === 0) return [];
  const results: FarmerProfile[] = [];
  // Firestore doesn't support `in` with > 30, batch manually
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
```

**Step 3: Create `.env.local` template**

Create `.env.local.example`:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Add `.env.local` to `.gitignore` if not already there.

**Step 4: Verify build**

Run: `npm run build`
Expected: 0 errors (Firebase is tree-shaken if not used yet)

**Step 5: Commit**

```bash
git add src/firebase/ .env.local.example .gitignore
git commit -m "feat: add Firebase config and Firestore service layer"
```

---

### Task 3: Integrate Autosave with Firestore

**Files:**
- Modify: `src/state/GameContext.tsx` — add Firestore sync to autosave interval

**Step 1: Import and call syncProfile in autosave**

In `GameContext.tsx`, add to the autosave `useEffect`:
- Import `syncProfile` and `getFarmerId` from `../firebase/db`
- After `saveGame(stateRef.current)`, also call `syncProfile(stateRef.current).catch(() => {})` (silent fail — offline-first)
- On mount, call `syncProfile` once to ensure profile exists in Firestore

**Step 2: Ensure `createdAt` is set on first sync**

In `syncProfile`, use `merge: true` so `createdAt` is only set once. Add `createdAt` only if creating new doc (check with getDoc first, or use `setDoc` with merge and a sentinel).

Simpler: in `syncProfile`, always pass `createdAt: serverTimestamp()` but Firestore `merge: true` won't overwrite existing fields — WRONG, it will. Fix: use a separate `createProfileIfNeeded()` function called once on mount.

Add to `db.ts`:
```typescript
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
```

Modify `GameContext.tsx` mount effect to call `ensureProfile(stateRef.current).catch(() => {})`.

**Step 3: Verify build**

Run: `npm run build`
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/state/GameContext.tsx src/firebase/db.ts
git commit -m "feat: sync game state to Firestore on autosave"
```

---

### Task 4: Invite Flow via URL Param

**Files:**
- Modify: `src/main.tsx` — wrap App in BrowserRouter
- Modify: `src/App.tsx` — read `?invite=` param, trigger addNeighbor
- Modify: `src/firebase/db.ts` — if needed

**Step 1: Add BrowserRouter to main.tsx**

```tsx
import { BrowserRouter } from 'react-router-dom';

// Wrap <App /> with <BrowserRouter>
```

**Step 2: Handle invite param in App.tsx**

In `GameContent`, add a `useEffect` that:
1. Reads `?invite=<id>` from `window.location.search` (or `useSearchParams`)
2. If present, calls `addNeighbor(getFarmerId(), inviteId)`
3. Shows toast "Нового сусіда додано!" on success
4. Cleans URL with `window.history.replaceState({}, '', '/')`

```tsx
import { useSearchParams } from 'react-router-dom';
import { getFarmerId, addNeighbor, ensureProfile } from './firebase/db';

// Inside GameContent:
const [searchParams] = useSearchParams();
useEffect(() => {
  const inviteId = searchParams.get('invite');
  if (inviteId && inviteId !== getFarmerId()) {
    ensureProfile(state).then(() =>
      addNeighbor(getFarmerId(), inviteId)
    ).then(ok => {
      if (ok) showToast('🏘️ Нового сусіда додано!', 'earn');
      window.history.replaceState({}, '', '/');
    }).catch(() => {});
  }
}, []); // Run once on mount
```

**Step 3: Verify build**

Run: `npm run build`
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/main.tsx src/App.tsx
git commit -m "feat: handle invite links via URL param"
```

---

### Task 5: Rewrite NeighborsPanel — Tab Structure

**Files:**
- Rewrite: `src/components/NeighborsPanel.tsx`

**Step 1: Create tabbed panel with 3 tabs**

Replace the entire `NeighborsPanel.tsx` with a new component that has:
- State: `activeTab: 'neighbors' | 'leaderboard' | 'invite'`
- Tab buttons at top
- Conditional rendering based on active tab

**Tab "Мої сусіди":**
- On mount, fetch neighbor profiles via `getNeighborProfiles(neighborIds)` where `neighborIds` come from Firestore (fetch own farmer doc)
- Show loading spinner while fetching
- List each neighbor: avatar, name, level, score
- "Допомогти" button (+5💰 +10XP) — calls existing `dispatch({ type: 'HELP_NEIGHBOR' })` + `recordHelp()`
- "Подарунок" button (+15💰) — calls existing `dispatch({ type: 'COLLECT_GIFT' })` + `recordGiftCollect()`
- If no real neighbors, show NPC fallback (existing DEFAULT_NEIGHBORS)

**Tab "Рейтинг":**
- On tab switch, fetch `getLeaderboard()`
- Table: position, avatar, name, ⭐ level, 🏆 score
- Highlight current player row with CSS class

**Tab "Запросити":**
- Show invite URL: `${window.location.origin}?invite=${getFarmerId()}`
- Big "📋 Копіювати" button — copies to clipboard, shows toast
- Show neighbor count

**Step 2: Add CSS for tabs**

In `App.css`, add:
```css
.neighbor-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
.neighbor-tab { flex: 1; padding: 8px; border: none; border-radius: 10px; background: #F0EBF8; font-weight: 600; cursor: pointer; }
.neighbor-tab-active { background: #7C4DFF; color: white; }
.leaderboard-table { width: 100%; border-collapse: collapse; }
.leaderboard-row { padding: 6px 0; border-bottom: 1px solid #F0EBF8; }
.leaderboard-me { background: #FFF3E0; border-radius: 8px; }
.invite-url { word-break: break-all; background: #F0EBF8; padding: 10px; border-radius: 10px; font-size: 12px; margin: 8px 0; }
```

**Step 3: Verify build**

Run: `npm run build`
Expected: 0 errors

**Step 4: Manual test**

Open preview, click "Сусіди" → should see 3 tabs. Without Firebase config, neighbors/leaderboard will be empty (graceful error handling). Invite tab should show the link.

**Step 5: Commit**

```bash
git add src/components/NeighborsPanel.tsx src/App.css
git commit -m "feat: rewrite NeighborsPanel with tabs — neighbors, leaderboard, invite"
```

---

### Task 6: Firebase Project Setup & Environment

**This is a manual step (not code):**

1. Go to https://console.firebase.google.com/
2. Create project "happy-farming"
3. Enable Firestore (production mode)
4. Create web app → copy config values
5. Fill `.env.local` with real values
6. Add Firestore security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /farmers/{farmerId} {
      allow read: if true;
      allow write: if true;  // MVP: open writes. Tighten later with custom claims.

      match /interactions/{neighborId} {
        allow read, write: if true;
      }
    }
  }
}
```

7. For Vercel deployment: add env vars in Vercel project settings (same VITE_FIREBASE_* keys)

**Step: Commit env template update if needed**

---

### Task 7: End-to-End Testing & Polish

**Step 1: Test full flow locally**

1. Open app → profile should sync to Firestore (check Firebase console)
2. Copy invite link from "Запросити" tab
3. Open in incognito → new farmer created, both become neighbors
4. Check "Мої сусіди" tab — should show each other
5. Check "Рейтинг" tab — should show both farmers
6. Help neighbor → coins/XP increase, button disabled
7. Collect gift → coins increase, button disabled

**Step 2: Fix any issues found**

**Step 3: Deploy to Vercel**

```bash
vercel --prod
```
Or push to GitHub and let Vercel auto-deploy.

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: multiplayer neighbors with Firebase — complete"
```
