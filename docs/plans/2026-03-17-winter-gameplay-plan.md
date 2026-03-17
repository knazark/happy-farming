# Winter Gameplay Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add two winter-exclusive plot activities (wood gathering + soil improvement) and passive winter bonuses, replacing the greenhouse mechanic.

**Architecture:** Extend PlotState union type with `gathering_wood` state. Add `soilLevel` to plot states. New `firewood` resource and 3 winter craft recipes. Winter bonuses via multiplier constants. Remove greenhouse from shop/reducer/state.

**Tech Stack:** React + TypeScript, useReducer state management, CSS for visual indicators.

---

### Task 1: Extend Types

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add firewood to ItemId and PlotState**

Add `firewood` as a standalone resource type and `gathering_wood` plot state:

```typescript
// Line 1: Add 'firewood' to CropId? No — firewood is NOT a crop. Add it to ItemId directly.

// Update PlotState (line 31-35) to:
export type PlotState =
  | { status: 'locked' }
  | { status: 'empty'; soilLevel?: number }
  | { status: 'growing'; cropId: CropId; plantedAt: number; growthTime: number; fertilized?: boolean; soilLevel?: number }
  | { status: 'ready'; cropId: CropId; soilLevel?: number }
  | { status: 'gathering_wood'; startedAt: number; gatherTime: number; soilLevel?: number }
  | { status: 'wood_ready'; soilLevel?: number };

// Update ItemId (line 39) to include firewood:
export type ItemId = CropId | `${AnimalId}_product` | CraftedId | 'firewood';

// Update CraftedId (line 37) to add winter crafts:
export type CraftedId = 'bread' | 'cheese' | 'butter' | 'cake' | 'sweater' | 'salad' | 'truffle_oil' | 'pickle' | 'meat_pie' | 'gourmet_dish' | 'jam' | 'pizza' | 'borscht' | 'juice' | 'pirozhki' | 'ratatouille' | 'smoothie' | 'farmer_pie' | 'royal_feast' | 'golden_honey' | 'honey_cake' | 'roast_turkey' | 'down_pillow' | 'horse_carriage' | 'campfire' | 'warm_scarf' | 'wooden_chest';
```

**Step 2: Add new GameActions**

```typescript
// Add to GameAction union (line 166+):
  | { type: 'GATHER_WOOD'; plotIndex: number }
  | { type: 'COLLECT_WOOD'; plotIndex: number }
  | { type: 'UPGRADE_SOIL'; plotIndex: number }
```

**Step 3: Remove greenhouse references**

```typescript
// Remove from GameAction:
  | { type: 'BUY_GREENHOUSE' }

// Remove from GameState:
  hasGreenhouse: boolean;  // DELETE this line
```

**Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: extend types for winter gameplay — wood gathering, soil levels, remove greenhouse"
```

---

### Task 2: Add Winter Constants

**Files:**
- Modify: `src/constants/seasons.ts`
- Modify: `src/constants/recipes.ts`
- Create: `src/constants/winter.ts`

**Step 1: Create winter constants file**

```typescript
// src/constants/winter.ts
export const WOOD_GATHER_TIME = 45; // seconds
export const WOOD_SELL_PRICE = 15;
export const WOOD_XP_REWARD = 3;

export const SOIL_UPGRADE_COSTS = [50, 100, 200]; // cost for level 1, 2, 3
export const SOIL_GROWTH_BONUS = [1.0, 0.9, 0.8, 0.7]; // multiplier per soil level (0-3)
export const MAX_SOIL_LEVEL = 3;

// Winter passive bonuses
export const WINTER_CRAFT_ORDER_BONUS = 1.5;   // +50% coins for craft orders
export const WINTER_ANIMAL_DOUBLE = 2;          // double animal products
export const WINTER_ORDER_XP_BONUS = 1.25;      // +25% XP from orders
```

**Step 2: Add 3 winter-exclusive recipes to recipes.ts**

```typescript
// Add to RECIPES object:
campfire: {
  id: 'campfire',
  name: 'Багаття',
  emoji: '🔥',
  ingredients: { firewood: 3 },
  craftTime: 90,
  sellPrice: 80,
  unlockLevel: 1,
  xpReward: 10,
},
warm_scarf: {
  id: 'warm_scarf',
  name: 'Теплий шарф',
  emoji: '🧣',
  ingredients: { firewood: 2, sheep_product: 2 },
  craftTime: 180,
  sellPrice: 120,
  unlockLevel: 3,
  xpReward: 18,
},
wooden_chest: {
  id: 'wooden_chest',
  name: "Дерев'яна скринька",
  emoji: '📦',
  ingredients: { firewood: 5 },
  craftTime: 240,
  sellPrice: 150,
  unlockLevel: 4,
  xpReward: 22,
},
```

**Step 3: Update winter season description**

In `src/constants/seasons.ts`, change winter description:
```typescript
winter: { name: 'Зима', emoji: '❄️', description: 'Збирайте дрова та покращуйте ґрунт' },
```

**Step 4: Commit**

```bash
git add src/constants/winter.ts src/constants/recipes.ts src/constants/seasons.ts
git commit -m "feat: add winter constants — firewood, soil upgrades, winter recipes"
```

---

### Task 3: Game Reducer — Winter Actions

**Files:**
- Modify: `src/state/gameReducer.ts`

**Step 1: Add GATHER_WOOD action**

```typescript
case 'GATHER_WOOD': {
  const { plotIndex } = action;
  const plot = state.plots[plotIndex];
  if (!plot || plot.status !== 'empty') return state;
  if (state.season !== 'winter') return state;

  const newPlots = [...state.plots];
  newPlots[plotIndex] = {
    status: 'gathering_wood',
    startedAt: Date.now(),
    gatherTime: WOOD_GATHER_TIME,
    soilLevel: plot.soilLevel,
  };
  return { ...state, plots: newPlots };
}
```

**Step 2: Add COLLECT_WOOD action**

```typescript
case 'COLLECT_WOOD': {
  const { plotIndex } = action;
  const plot = state.plots[plotIndex];
  if (!plot || plot.status !== 'wood_ready') return state;

  const newPlots = [...state.plots];
  newPlots[plotIndex] = { status: 'empty', soilLevel: plot.soilLevel };

  let newState: GameState = {
    ...state,
    plots: newPlots,
    inventory: addToInventory(state.inventory, 'firewood', 1),
    totalHarvested: state.totalHarvested + 1,
  };
  newState = addXp(newState, WOOD_XP_REWARD);
  return newState;
}
```

**Step 3: Add UPGRADE_SOIL action**

```typescript
case 'UPGRADE_SOIL': {
  const { plotIndex } = action;
  const plot = state.plots[plotIndex];
  if (!plot || plot.status !== 'empty') return state;
  if (state.season !== 'winter') return state;

  const currentLevel = plot.soilLevel ?? 0;
  if (currentLevel >= MAX_SOIL_LEVEL) return state;

  const cost = SOIL_UPGRADE_COSTS[currentLevel];
  if (state.coins < cost) return state;

  const newPlots = [...state.plots];
  newPlots[plotIndex] = { status: 'empty', soilLevel: currentLevel + 1 };
  return { ...state, plots: newPlots, coins: state.coins - cost };
}
```

**Step 4: Update TICK to transition gathering_wood → wood_ready**

In the TICK handler, add wood gathering completion check (similar to crop growth):

```typescript
// Inside TICK, after crop ready checks:
if (plot.status === 'gathering_wood') {
  const elapsed = (now - plot.startedAt) / 1000;
  if (elapsed >= plot.gatherTime) {
    newPlots[i] = { status: 'wood_ready', soilLevel: plot.soilLevel };
    changed = true;
  }
}
```

**Step 5: Apply soilLevel to PLANT_CROP growth time**

In PLANT_CROP handler, after computing growthTime, add:

```typescript
const soilLevel = plot.soilLevel ?? 0;
growthTime *= SOIL_GROWTH_BONUS[soilLevel];
```

Preserve soilLevel in new plot state:

```typescript
newPlots[plotIndex] = {
  status: 'growing',
  cropId,
  plantedAt: Date.now(),
  growthTime: Math.round(growthTime),
  soilLevel: plot.soilLevel,
};
```

**Step 6: Preserve soilLevel on HARVEST**

In HARVEST handler:
```typescript
newPlots[plotIndex] = { status: 'empty', soilLevel: plot.soilLevel };
```

**Step 7: Remove BUY_GREENHOUSE action and greenhouse references**

Delete the `BUY_GREENHOUSE` case. Remove `hasGreenhouse` from initial state. Remove greenhouse checks from PLANT_CROP (the `isGreenhousePlot` logic).

**Step 8: Apply winter passive bonuses**

- In COLLECT_PRODUCT: if `state.season === 'winter'`, add product to inventory twice (double)
- In FULFILL_ORDER: if winter, multiply reward by `WINTER_CRAFT_ORDER_BONUS` and xpReward by `WINTER_ORDER_XP_BONUS`

**Step 9: Commit**

```bash
git add src/state/gameReducer.ts
git commit -m "feat: add winter reducer actions — gather wood, collect wood, upgrade soil, remove greenhouse"
```

---

### Task 4: UI — Winter Plot Selector

**Files:**
- Create: `src/components/WinterSelector.tsx`
- Modify: `src/components/CropSelector.tsx`
- Modify: `src/App.tsx`

**Step 1: Create WinterSelector component**

Popup shown when clicking empty plot in winter. Two options: "Gather Wood" or "Upgrade Soil".

```typescript
// src/components/WinterSelector.tsx
import { useGame } from '../state/GameContext';
import { SOIL_UPGRADE_COSTS, MAX_SOIL_LEVEL } from '../constants/winter';
import { showToast } from './Toast';

interface WinterSelectorProps {
  plotIndex: number;
  onClose: () => void;
}

export function WinterSelector({ plotIndex, onClose }: WinterSelectorProps) {
  const { state, dispatch } = useGame();
  const plot = state.plots[plotIndex];
  const soilLevel = (plot && 'soilLevel' in plot ? plot.soilLevel : undefined) ?? 0;
  const canUpgrade = soilLevel < MAX_SOIL_LEVEL;
  const upgradeCost = canUpgrade ? SOIL_UPGRADE_COSTS[soilLevel] : 0;

  return (
    <div className="crop-selector-overlay" onClick={onClose}>
      <div className="crop-selector winter-selector" onClick={(e) => e.stopPropagation()}>
        <h3 className="crop-selector-title">❄️ Зимові роботи</h3>
        <div className="winter-options">
          <button className="winter-option" onClick={() => {
            dispatch({ type: 'GATHER_WOOD', plotIndex });
            showToast('🪵 Збираємо дрова...', 'info');
            onClose();
          }}>
            <span className="winter-option-emoji">🪵</span>
            <span className="winter-option-name">Збір дров</span>
            <span className="winter-option-desc">~45 сек → дрова для крафту</span>
          </button>
          {canUpgrade ? (
            <button
              className="winter-option"
              disabled={state.coins < upgradeCost}
              onClick={() => {
                dispatch({ type: 'UPGRADE_SOIL', plotIndex });
                showToast(`🔧 Ґрунт покращено до рівня ${soilLevel + 1}! −${upgradeCost}💰`, 'spend');
                onClose();
              }}
            >
              <span className="winter-option-emoji">🔧</span>
              <span className="winter-option-name">Покращити ґрунт (рівень {soilLevel + 1})</span>
              <span className="winter-option-desc">{upgradeCost}💰 → −{(soilLevel + 1) * 10}% часу росту</span>
            </button>
          ) : (
            <div className="winter-option winter-option--maxed">
              <span className="winter-option-emoji">✅</span>
              <span className="winter-option-name">Ґрунт макс. рівня</span>
            </div>
          )}
        </div>
        {soilLevel > 0 && (
          <div className="winter-soil-info">🌱 Поточний рівень ґрунту: {soilLevel}/{MAX_SOIL_LEVEL} (−{soilLevel * 10}% часу)</div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Update CropSelector**

Remove greenhouse winter logic. In winter, don't show CropSelector at all (App.tsx will show WinterSelector instead).

**Step 3: Update App.tsx handlePlotClick**

When plot is empty + winter → show WinterSelector instead of CropSelector.
When plot is `wood_ready` → dispatch COLLECT_WOOD.

**Step 4: Commit**

```bash
git add src/components/WinterSelector.tsx src/components/CropSelector.tsx src/App.tsx
git commit -m "feat: add WinterSelector UI — choose between wood gathering and soil upgrade"
```

---

### Task 5: UI — PlotCell Winter States

**Files:**
- Modify: `src/components/PlotCell.tsx`
- Modify: `src/styles/farm.css`

**Step 1: Add gathering_wood rendering in PlotCell**

Similar to `growing` state but with wood emojis: 🪵 stages.

```typescript
// In PlotCell content rendering:
case 'gathering_wood': {
  const elapsed = (now - plot.startedAt) / 1000;
  const progress = Math.min(1, elapsed / plot.gatherTime);
  const timeLeft = Math.max(0, Math.ceil(plot.gatherTime - elapsed));
  const stage = progress < 0.5 ? '🪓' : '🪵';
  // Show stage emoji, progress bar, time pill (same structure as growing)
}

case 'wood_ready': {
  // Show 🪵 with harvest animation (same as crop ready)
}
```

**Step 2: Add soil level indicator**

For all non-locked plots with soilLevel > 0, show a small indicator:

```typescript
// Bottom-left corner badge:
{soilLevel > 0 && <div className="soil-level-badge">🌱{soilLevel}</div>}
```

**Step 3: Add CSS for wood states and soil badge**

```css
.plot-gathering { /* same gradient as plot-growing but slightly different tint */ }
.plot-wood-ready { /* golden glow like plot-ready */ }
.soil-level-badge {
  position: absolute;
  bottom: 4px;
  left: 4px;
  font-size: 10px;
  background: rgba(0,0,0,0.5);
  color: #fff;
  padding: 1px 4px;
  border-radius: 6px;
}
```

**Step 4: Commit**

```bash
git add src/components/PlotCell.tsx src/styles/farm.css
git commit -m "feat: render wood gathering and soil level in PlotCell"
```

---

### Task 6: Update SeasonWeatherBar for Winter Bonuses

**Files:**
- Modify: `src/components/SeasonWeatherBar.tsx`

**Step 1: Show winter-specific bonuses**

When season is winter, display:
- 🪵 Збір дров
- 🐾 ×2 продукти
- 📋 +50% за крафт
- ⭐ +25% XP

**Step 2: Commit**

```bash
git add src/components/SeasonWeatherBar.tsx
git commit -m "feat: show winter bonuses in SeasonWeatherBar"
```

---

### Task 7: Remove Greenhouse

**Files:**
- Modify: `src/components/ShopPanel.tsx` — remove greenhouse section
- Modify: `src/constants/game.ts` — remove GREENHOUSE_PRICE, GREENHOUSE_REQUIRED_CRAFTS
- Modify: `src/state/gameReducer.ts` — remove BUY_GREENHOUSE handler, remove hasGreenhouse from initialState

**Step 1: Remove greenhouse from ShopPanel**

Delete the entire greenhouse section from the shop UI.

**Step 2: Remove greenhouse constants**

Delete GREENHOUSE_PRICE and GREENHOUSE_REQUIRED_CRAFTS from game.ts.

**Step 3: Clean up reducer**

Remove the BUY_GREENHOUSE case. Set `hasGreenhouse` to never be used (or remove from state entirely). Remove isGreenhousePlot checks from PLANT_CROP.

**Step 4: Commit**

```bash
git add src/components/ShopPanel.tsx src/constants/game.ts src/state/gameReducer.ts
git commit -m "feat: remove greenhouse mechanic — replaced by winter activities"
```

---

### Task 8: Build & Integration Test

**Step 1: Run build**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

**Step 2: Manual test checklist**

- [ ] In winter, click empty plot → WinterSelector shows
- [ ] Choose "Gather Wood" → plot shows wood gathering animation
- [ ] Wait 45s → plot shows wood_ready → click to collect → firewood in inventory
- [ ] Choose "Upgrade Soil" → coins deducted, soil level visible on plot
- [ ] Spring arrives → plant crop on upgraded soil → growth time reduced
- [ ] Winter crafts (campfire, scarf, chest) appear in crafting panel
- [ ] Winter bonuses: double animal products, +50% craft order coins, +25% XP
- [ ] Greenhouse removed from shop
- [ ] Existing saves don't crash (soilLevel defaults to 0)

**Step 3: Commit final**

```bash
git add -A
git commit -m "feat: winter gameplay complete — wood gathering, soil upgrades, winter bonuses"
git push
```
