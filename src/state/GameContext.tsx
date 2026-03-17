import { createContext, useContext, useReducer, useEffect, useRef, useState, useCallback, type ReactNode, type Dispatch } from 'react';
import type { GameState, GameAction } from '../types';
import { gameReducer, createInitialState, migrateSave } from './gameReducer';
import { saveGame, loadGame } from './storage';
import { tick } from '../engine/gameLoop';
import { ensureProfile, getFarmerIdIfExists } from '../firebase/db';
import { loadGameFromFirestore, saveGameAndProfile } from '../firebase/gameStateSync';

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const GameContext = createContext<GameContextValue | null>(null);

// Firestore sync interval: 2 minutes (saves ~10 writes/hour instead of 120)
const FIRESTORE_SYNC_MS = 2 * 60 * 1000;

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, null, () => createInitialState());
  const [loading, setLoading] = useState(true);

  const stateRef = useRef(state);
  stateRef.current = state;

  // --- localStorage save (fast, free, every 5s) ---
  const saveToLocal = useCallback(() => {
    saveGame(stateRef.current);
  }, []);

  // --- Firestore save (remote backup, every 2 min) ---
  const savingRef = useRef(false);
  const lastFirestoreJsonRef = useRef('');
  const saveToFirestore = useCallback(() => {
    if (savingRef.current) { console.log('[save] skipped: already saving'); return; }
    if (!getFarmerIdIfExists()) { console.log('[save] skipped: no farmer ID'); return; }
    // Skip if state hasn't changed since last Firestore save
    const snapshot = JSON.stringify(stateRef.current);
    if (snapshot === lastFirestoreJsonRef.current) { console.log('[save] skipped: no changes'); return; }
    savingRef.current = true;
    lastFirestoreJsonRef.current = snapshot;
    console.log('[save] saving to Firestore...');
    saveGameAndProfile(stateRef.current).then(() => {
      console.log('[save] ✅ Firestore save OK');
    }).catch((err) => {
      console.warn('[save] ❌ Firestore save failed:', err);
      lastFirestoreJsonRef.current = ''; // retry next interval
    }).finally(() => { savingRef.current = false; });
  }, []);

  // Dispatch wrapper
  const smartDispatch = useCallback((action: GameAction) => {
    dispatch(action);
  }, []);

  // Load: try Firestore first (cross-device sync), fall back to localStorage
  useEffect(() => {
    let cancelled = false;

    async function initLoad() {
      const farmerId = getFarmerIdIfExists();
      const debugLines: string[] = [`id: ${farmerId?.slice(0, 8) ?? 'null'}`];

      try {
        // Try Firestore first (authoritative for cross-device)
        const firestoreState = await loadGameFromFirestore();
        const localState = loadGame();

        debugLines.push(`fire: ${firestoreState ? `lv${firestoreState.level} ${firestoreState.coins}💰` : 'null'}`);
        debugLines.push(`local: ${localState ? `lv${localState.level} ${localState.coins}💰` : 'null'}`);
        console.log('[load]', debugLines.join(' | '));

        if (!cancelled) {
          // Pick the most recent save
          let best: GameState | null = null;
          if (firestoreState && localState) {
            const localTick = localState.lastTickAt ?? 0;
            const fireTick = firestoreState.lastTickAt ?? 0;
            best = localTick > fireTick ? localState : firestoreState;
            debugLines.push(localTick > fireTick ? '→local' : '→fire');
          } else {
            best = firestoreState ?? localState;
            debugLines.push(firestoreState ? '→fire' : localState ? '→local' : '→new');
          }

          if (best) {
            dispatch({ type: 'LOAD_SAVE', state: tick(migrateSave(best), Date.now()) });
            debugLines.push(`loaded lv${best.level}`);
          } else {
            debugLines.push('NO DATA → initial');
          }

          // Show debug overlay on screen (for devices without console)
          const dbg = document.createElement('div');
          dbg.textContent = debugLines.join(' | ');
          dbg.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#000c;color:#0f0;font:12px monospace;padding:4px 8px;pointer-events:none;';
          document.body.appendChild(dbg);
          setTimeout(() => dbg.remove(), 15000);

          setLoading(false);
        }
      } catch (err) {
        console.warn('[load] Firestore load failed, trying localStorage:', err);
        debugLines.push(`ERROR: ${err}`);
        if (!cancelled) {
          const localState = loadGame();
          if (localState) {
            dispatch({ type: 'LOAD_SAVE', state: tick(migrateSave(localState), Date.now()) });
          }

          const dbg = document.createElement('div');
          dbg.textContent = debugLines.join(' | ');
          dbg.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#000c;color:#f00;font:12px monospace;padding:4px 8px;pointer-events:none;';
          document.body.appendChild(dbg);
          setTimeout(() => dbg.remove(), 15000);

          setLoading(false);
        }
      }
    }

    initLoad();
    return () => { cancelled = true; };
  }, []);

  // After loading: ensure profile exists + force first Firestore save
  useEffect(() => {
    if (!loading) {
      ensureProfile(stateRef.current).catch(() => {});
      // Force immediate Firestore save so gameState is always synced
      // (fixes: localStorage has progress but Firestore gameState was empty)
      setTimeout(() => saveToFirestore(), 2000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Game loop: tick every second
  useEffect(() => {
    if (loading) return;
    const id = setInterval(() => {
      dispatch({ type: 'TICK', now: Date.now() });
    }, 1000);
    return () => clearInterval(id);
  }, [loading]);

  // localStorage: save every 5s (free, instant)
  useEffect(() => {
    if (loading) return;
    const id = setInterval(saveToLocal, 5000);
    return () => clearInterval(id);
  }, [loading, saveToLocal]);

  // Firestore: sync every 2 min + on visibility change + on beforeunload
  useEffect(() => {
    if (loading) return;

    const id = setInterval(saveToFirestore, FIRESTORE_SYNC_MS);

    // Save to both when user switches tab / minimizes
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        saveToLocal();
        saveToFirestore();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Save to both on page refresh / close
    const onBeforeUnload = () => {
      saveToLocal();
      saveToFirestore();
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [loading, saveToLocal, saveToFirestore]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '24px',
        color: '#fff',
      }}>
        🌾 Завантаження ферми...
      </div>
    );
  }

  return (
    <GameContext.Provider value={{ state, dispatch: smartDispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
