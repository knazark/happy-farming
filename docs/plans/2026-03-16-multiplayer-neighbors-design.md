# Multiplayer Neighbors & Leaderboard Design

## Stack
- **Frontend:** Vercel (existing React + Vite)
- **Database:** Firebase Firestore (direct client SDK access)
- **Auth:** Anonymous UUID in localStorage (no login)
- **Invite:** Link-based (`?invite=<farmerId>`)

## Firestore Schema

### Collection: `farmers/{farmerId}`
```
{
  id: string,              // UUID (matches localStorage)
  name: string,
  avatar: string,          // emoji
  level: number,
  xp: number,
  coins: number,
  totalEarned: number,     // lifetime coins earned (for tracking)
  animalCount: number,
  unlockedPlots: number,
  score: number,           // level × animalCount × unlockedPlots
  neighborIds: string[],   // array of farmer IDs
  lastSeen: Timestamp,
  createdAt: Timestamp
}
```

### Collection: `farmers/{farmerId}/interactions/{neighborId}`
```
{
  helpedAt: Timestamp | null,
  giftCollectedAt: Timestamp | null
}
```

## Invite Flow
1. Player A clicks "Запросити" → copies `happyfarm.vercel.app?invite=abc123`
2. Player B opens link → if new, farmer doc created with new UUID
3. Automatic: A.neighborIds ← B.id, B.neighborIds ← A.id
4. Both see each other in "Сусіди" panel

## Neighbors Panel (3 tabs)

### Tab "Мої сусіди"
- List of real neighbors (avatar + name + level + score)
- "Відвідати" button → water garden (+5💰 +10XP), collect gift (+15💰)
- Green checkmark when all daily actions done
- "Запросити" button → copies invite link to clipboard
- NPC neighbors (Оксана, Тарас...) remain as fallback when no real neighbors

### Tab "Рейтинг"
- Top 20 farmers table: #, avatar, name, ⭐ level, 🏆 score
- Current player highlighted in list
- Score formula: `level × animalCount × unlockedPlots`
- Firestore query: `farmers` ordered by `score` desc, limit 20

### Tab "Моя ферма"
- Large "📋 Копіювати посилання" button
- Shows neighbor count

## Data Sync
- Autosave syncs to Firestore (profile fields: level, coins, score, etc.)
- First launch with Firebase: migrate existing localStorage save to Firestore
- `totalEarned` — new field in game state, incremented on SELL_ITEM and HARVEST

## Security Rules
- Anyone can read public farmer data (name, avatar, level, score)
- Each farmer can only write their own document (verified by farmerId header)
- Interactions — only the initiator can write
