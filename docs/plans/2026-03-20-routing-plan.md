# Routing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace state-based conditional rendering with React Router routes (`/`, `/game`, `/profile`, `/friend/:id`).

**Architecture:** Create route guards (`RequireAuth`, `GuestOnly`), wrap authenticated routes in `GameProvider`, convert ProfileEditor and FriendFarmView to standalone pages, replace all `window.location.reload()` with `useNavigate()`.

**Tech Stack:** React Router v7 (already installed), React, TypeScript

---

### Task 1: Create Auth Guard Components

**Files:**
- Create: `src/components/guards/RequireAuth.tsx`
- Create: `src/components/guards/GuestOnly.tsx`

**Step 1: Create RequireAuth guard**

```tsx
// src/components/guards/RequireAuth.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { getFarmerIdIfExists } from '../../firebase/db';

export function RequireAuth() {
  const farmerId = getFarmerIdIfExists();
  if (!farmerId) return <Navigate to="/" replace />;
  return <Outlet />;
}
```

**Step 2: Create GuestOnly guard**

```tsx
// src/components/guards/GuestOnly.tsx
import { Navigate } from 'react-router-dom';
import { getFarmerIdIfExists } from '../../firebase/db';

export function GuestOnly({ children }: { children: React.ReactNode }) {
  const farmerId = getFarmerIdIfExists();
  if (farmerId) return <Navigate to="/game" replace />;
  return <>{children}</>;
}
```

**Step 3: Commit**

```bash
git add src/components/guards/
git commit -m "feat: add RequireAuth and GuestOnly route guards"
```

---

### Task 2: Create ProfilePage and FriendFarmPage Wrappers

**Files:**
- Create: `src/pages/ProfilePage.tsx`
- Create: `src/pages/FriendFarmPage.tsx`

**Step 1: Create ProfilePage (full-screen profile editor)**

```tsx
// src/pages/ProfilePage.tsx
import { useNavigate } from 'react-router-dom';
import { useGame } from '../state/GameContext';
import { ProfileEditor } from '../components/ProfileEditor';
import { SeasonalBackground } from '../components/SeasonalBackground';
import { WeatherEffects } from '../components/WeatherEffects';
import { ToastContainer } from '../components/Toast';

export function ProfilePage() {
  const navigate = useNavigate();
  const { state } = useGame();

  return (
    <div className={`game-layout-v2 season-${state.season}`}>
      <SeasonalBackground />
      <WeatherEffects />
      <ToastContainer />
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        padding: '20px',
      }}>
        <div className="panel-popup" style={{ position: 'relative', maxWidth: '420px', width: '100%' }}>
          <ProfileEditor onClose={() => navigate('/game')} />
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create FriendFarmPage**

```tsx
// src/pages/FriendFarmPage.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../state/GameContext';
import { FriendFarmView } from '../components/FriendFarmView';
import { HUD } from '../components/HUD';
import { SeasonalBackground } from '../components/SeasonalBackground';
import { WeatherEffects } from '../components/WeatherEffects';
import { ToastContainer } from '../components/Toast';
import { HarvestEffectLayer, useHarvestEffect } from '../components/HarvestEffect';

export function FriendFarmPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state } = useGame();
  const { effects } = useHarvestEffect();

  if (!id) {
    navigate('/game');
    return null;
  }

  return (
    <div className={`game-layout-v2 season-${state.season}`}>
      <SeasonalBackground />
      <WeatherEffects />
      <ToastContainer />
      <HarvestEffectLayer effects={effects} />
      <HUD onProfileClick={() => navigate('/profile')} />
      <div className="game-center">
        <FriendFarmView friendId={id} onBack={() => navigate('/game')} />
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/pages/
git commit -m "feat: add ProfilePage and FriendFarmPage route wrappers"
```

---

### Task 3: Rewrite App.tsx with Routes

**Files:**
- Modify: `src/App.tsx` — complete rewrite

**Step 1: Replace App.tsx with route-based structure**

Remove the `hasId` state, the polling useEffect, and the conditional rendering. Replace with `<Routes>`:

```tsx
// src/App.tsx (new structure)
import { Routes, Route, Outlet } from 'react-router-dom';
import { GameProvider } from './state/GameContext';
import { LoginScreen } from './components/LoginScreen';
import { RequireAuth } from './components/guards/RequireAuth';
import { GuestOnly } from './components/guards/GuestOnly';
import { ProfilePage } from './pages/ProfilePage';
import { FriendFarmPage } from './pages/FriendFarmPage';
import './App.css';
import './styles/farm.css';

// GameContent stays in this file (same as current but without profile modal & friend view)

function AuthenticatedLayout() {
  return (
    <GameProvider>
      <Outlet />
    </GameProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<GuestOnly><LoginScreen /></GuestOnly>} />
      <Route element={<RequireAuth />}>
        <Route element={<AuthenticatedLayout />}>
          <Route path="/game" element={<GameContent />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/friend/:id" element={<FriendFarmPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
```

**Step 2: Remove from GameContent:**
- `showProfile` state + useEffect + profile AnimatePresence modal
- `visitingFriendId` state + FriendFarmView conditional
- Replace `setShowProfile(true)` in HUD with `navigate('/profile')`
- Replace `setVisitingFriendId(id)` with `navigate('/friend/${id}')`

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: rewrite App.tsx with React Router routes"
```

---

### Task 4: Update LoginScreen to Use Navigate

**Files:**
- Modify: `src/components/LoginScreen.tsx`

**Step 1: Replace callbacks with useNavigate**

Remove `onNewGame`/`onLogin` props. Use `useNavigate()`:

```tsx
import { useNavigate } from 'react-router-dom';
import { createFarmerId, setFarmerId, loginByNameAndPassword } from '../firebase/db';

export function LoginScreen() {
  const navigate = useNavigate();

  const handleNewGame = () => {
    localStorage.removeItem('happyFarmer_save');
    createFarmerId();
    navigate('/profile');  // Go to profile setup first
  };

  const handleLogin = async () => {
    // ... existing login logic ...
    const farmerId = await loginByNameAndPassword(name, password);
    if (farmerId) {
      localStorage.removeItem('happyFarmer_save');
      setFarmerId(farmerId);
      navigate('/game');
    }
  };

  // ... render (replace onNewGame with handleNewGame) ...
}
```

**Step 2: Commit**

```bash
git add src/components/LoginScreen.tsx
git commit -m "feat: LoginScreen uses useNavigate instead of callbacks"
```

---

### Task 5: Update ProfileEditor to Use Navigate

**Files:**
- Modify: `src/components/ProfileEditor.tsx`

**Step 1: Replace window.location.reload() with navigate**

```tsx
import { useNavigate } from 'react-router-dom';

export function ProfileEditor({ onClose }: ProfileEditorProps) {
  const navigate = useNavigate();

  // Logout button:
  onClick={async () => {
    try { await saveGameAndProfile(state); } catch {}
    clearFarmerId();
    navigate('/');  // instead of window.location.reload()
  }}

  // Back button (no password):
  onClick={() => {
    clearFarmerId();
    navigate('/');  // instead of window.location.reload()
  }}
}
```

**Step 2: Commit**

```bash
git add src/components/ProfileEditor.tsx
git commit -m "feat: ProfileEditor uses navigate instead of reload"
```

---

### Task 6: Update GameContext — Remove Reload Logic

**Files:**
- Modify: `src/state/GameContext.tsx`

**Step 1: Replace window.location.reload() with navigate**

In `initLoad()`, when account is deleted from Firestore, instead of `window.location.reload()`, dispatch an event or use a callback that the route guard can detect (simplest: just `clearFarmerId()` + `clearSave()` — the RequireAuth guard will redirect on next render).

Actually, since GameContext is inside the route, we can use `useNavigate`:

```tsx
import { useNavigate } from 'react-router-dom';

export function GameProvider({ children }) {
  const navigate = useNavigate();

  // In initLoad:
  if (!cancelled && !docExists) {
    clearSave();
    clearFarmerId();
    navigate('/', { replace: true });  // instead of window.location.reload()
    return;
  }
}
```

**Step 2: Commit**

```bash
git add src/state/GameContext.tsx
git commit -m "feat: GameContext uses navigate instead of window.location.reload"
```

---

### Task 7: Update HUD and NeighborsPanel Navigation

**Files:**
- Modify: `src/components/HUD.tsx` — profile click → `navigate('/profile')`
- Modify: `src/components/NeighborsPanel.tsx` — visit friend → `navigate('/friend/:id')`

**Step 1: HUD — navigate to /profile**

Replace `onProfileClick` callback prop with `useNavigate`:

```tsx
import { useNavigate } from 'react-router-dom';

export function HUD() {  // remove onProfileClick prop
  const navigate = useNavigate();
  // Avatar button onClick: navigate('/profile')
}
```

**Step 2: NeighborsPanel — navigate to /friend/:id**

Replace `onVisitFriend` callback with navigate:

```tsx
import { useNavigate } from 'react-router-dom';

// Visit button: navigate(`/friend/${friend.id}`)
```

**Step 3: Commit**

```bash
git add src/components/HUD.tsx src/components/NeighborsPanel.tsx
git commit -m "feat: HUD and NeighborsPanel use navigate for routing"
```

---

### Task 8: Handle Invite Links on /game Route

**Files:**
- Modify: `src/App.tsx` (GameContent)

**Step 1: Keep invite handling in GameContent**

The `?invite=...` query param logic stays in GameContent. After processing, use `navigate('/game', { replace: true })` instead of `window.history.replaceState`:

```tsx
const navigate = useNavigate();
// After processing invite:
navigate('/game', { replace: true });
```

**Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: invite link handling uses navigate"
```

---

### Task 9: Build, Test, Verify

**Step 1: Run build**

```bash
npm run build
```

Expected: no TypeScript errors, successful build.

**Step 2: Run tests**

```bash
npx vitest run
```

Expected: all tests pass (some may need router wrapper in tests).

**Step 3: Fix any test failures**

Tests that render components using `useNavigate` or `useSearchParams` need `<MemoryRouter>` wrapper.

**Step 4: Verify navigation flows manually**
- `/` → shows login screen
- Login → navigates to `/game`
- New game → navigates to `/profile` → save → `/game`
- Avatar click → `/profile` → save → `/game`
- Visit friend → `/friend/:id` → back → `/game`
- Logout → `/`
- Browser back/forward works

**Step 5: Commit and push**

```bash
git add -A
git commit -m "fix: test wrappers for router + final verification"
git push
```
