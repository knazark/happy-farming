# Routing Design — React Router for Happy Farming

## Problem
The app uses state-based conditional rendering + `window.location.reload()` for navigation. This causes:
- New game → profile popup flicker → redirect to login on error
- No browser back/forward support
- Confusing flow for users (especially on tablet)

## Solution
Use React Router (already installed v7.13.1) with proper route-based navigation.

## Routes

| URL | Component | Guard |
|-----|-----------|-------|
| `/` | `LoginScreen` | If farmerId exists → redirect `/game` |
| `/game` | `GameContent` | If no farmerId → redirect `/` |
| `/profile` | `ProfileEditor` (full page) | If no farmerId → redirect `/` |
| `/friend/:id` | `FriendFarmView` | If no farmerId → redirect `/` |

## Navigation Flow

```
/ (login)
  ├─ "New Game" → createFarmerId() → navigate('/profile')
  └─ "Login" → loginByName() → navigate('/game')

/profile (create/edit)
  └─ "Save" → navigate('/game')

/game (main game)
  ├─ Avatar click → navigate('/profile')
  ├─ Visit friend → navigate('/friend/:id')
  └─ Logout → clearFarmerId() → navigate('/')

/friend/:id (friend farm)
  └─ "Back" → navigate('/game')
```

## Architecture

### Guard Components
- `RequireAuth` — wraps authenticated routes, checks farmerId, redirects to `/`
- `GuestOnly` — wraps `/`, redirects to `/game` if farmerId exists

### GameProvider Scope
GameProvider wraps only authenticated routes (not login). Structure:

```tsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<GuestOnly><LoginScreen /></GuestOnly>} />
    <Route element={<RequireAuth><GameProvider><Outlet /></GameProvider></RequireAuth>}>
      <Route path="/game" element={<GameContent />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/friend/:id" element={<FriendFarmPage />} />
    </Route>
  </Routes>
</BrowserRouter>
```

### What Changes
1. Remove all `window.location.reload()` — use `useNavigate()` instead
2. ProfileEditor becomes full page at `/profile` (not modal)
3. FriendFarmView becomes page at `/friend/:id`
4. App.tsx simplified — just routes, no conditional rendering
5. GameContext.tsx — remove reload logic, use navigate

### What Stays
- Modal panels (shop, craft, orders, inventory, friends) — remain modals
- CropSelector/WinterSelector — remain popups
- GameContext/useReducer state management — unchanged
- localStorage/Firestore sync — unchanged
- `?invite=...` query param handling — moves to `/game` route

## Files to Modify
- `src/main.tsx` — already has BrowserRouter, no change
- `src/App.tsx` — rewrite to use Routes
- `src/state/GameContext.tsx` — remove window.location.reload, add navigate
- `src/components/ProfileEditor.tsx` — convert to full page + navigate
- `src/components/FriendFarmView.tsx` — adapt for route param
- `src/components/LoginScreen.tsx` — use navigate instead of callbacks
- `src/components/HUD.tsx` — navigate('/profile') instead of callback

## New Files
- `src/components/guards/RequireAuth.tsx`
- `src/components/guards/GuestOnly.tsx`
- `src/pages/ProfilePage.tsx` (wrapper for ProfileEditor as page)
- `src/pages/FriendFarmPage.tsx` (wrapper for FriendFarmView with useParams)
