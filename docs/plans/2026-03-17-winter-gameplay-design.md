# Winter Gameplay Design

## Problem
Winter blocks planting on all plots. Players can only collect animal products and craft — boring downtime.

## Solution
Two exclusive winter activities on plots + passive bonuses. No greenhouse needed.

## Winter Plot Activities

### 1. Wood Gathering (Firewood)
- Click empty plot → start gathering wood (timer ~45s)
- Produces: Firewood resource (sells for ~15 coins)
- Winter-exclusive crafting recipes using firewood:
  - Campfire (bonfire) — sell ~80 coins
  - Warm Scarf — sell ~120 coins
  - Wooden Chest — sell ~150 coins
- Same UX as crops: click → timer → collect

### 2. Soil Improvement
- Click empty plot → spend coins to upgrade soil
- Levels: 0 → 1 → 2 → 3
- Cost per level: 50 → 100 → 200 coins
- Effect: -10% / -20% / -30% growth time on that plot
- Permanent (persists across seasons)
- Visual indicator on plot showing soil level

### Player Choice
Each plot: gather wood OR improve soil. Not both simultaneously.

## Winter Passive Bonuses
- Crafting orders pay +50% coins
- Animals produce double products per collection
- Orders give +25% XP

## Removed
- Greenhouse mechanic (was 15,000 coins unlock for bottom row planting in winter)

## Data Changes
- New resource: `firewood`
- New recipes: 2-3 winter-exclusive crafts
- New plot state: `gathering_wood` (similar to growing crop)
- New plot property: `soilLevel` (0-3, default 0)
- Remove greenhouse from shop and game state

## UI
- Winter plot click → choice popup: "Gather Wood" or "Improve Soil"
- Wood gathering: same progress bar as crops, wood emoji stages
- Soil improvement: instant purchase, visual soil level indicator on plot
- Winter bonuses shown in SeasonWeatherBar
