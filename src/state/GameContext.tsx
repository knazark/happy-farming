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

// Firestore sync interval: 2 minutes
const FIRESTORE_SYNC_MS = 2 * 60 * 1000;

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, null, () => createInitialState());
  const [loading, setLoading] = useState(true);

  const stateRef = useRef(state);
  stateRef.current = state;

  // Track whether we successfully loaded real data (not initial state)
  const hasRealDataRef = useRef(false);

  // --- localStorage save (fast, free, every 5s) ---
  const saveToLocal = useCallback(() => {
    if (!getFarmerIdIfExists()) return; // don't save after logout
    saveGame(stateRef.current);
  }, []);

  // --- Firestore save (remote backup, every 2 min) ---
  const savingRef = useRef(false);
  const lastFirestoreJsonRef = useRef('');
  const saveToFirestore = useCallback(() => {
    if (savingRef.current) return;
    if (!getFarmerIdIfExists()) return;
    // Don't save initial state to Firestore (could overwrite real data)
    if (!hasRealDataRef.current && stateRef.current.level <= 1 && stateRef.current.totalEarned === 0) {
      console.log('[save] skipped: initial state, won\'t overwrite Firestore');
      return;
    }
    const snapshot = JSON.stringify(stateRef.current);
    if (snapshot === lastFirestoreJsonRef.current) return;
    savingRef.current = true;
    lastFirestoreJsonRef.current = snapshot;
    console.log('[save] saving to Firestore...');
    saveGameAndProfile(stateRef.current).then(() => {
      console.log('[save] ✅ Firestore save OK');
    }).catch((err) => {
      console.warn('[save] ❌ Firestore save failed:', err);
      lastFirestoreJsonRef.current = '';
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
        const firestoreState = await loadGameFromFirestore();
        const localState = loadGame();

        debugLines.push(`fire: ${firestoreState ? `lv${firestoreState.level} ${firestoreState.coins}💰` : 'null'}`);
        debugLines.push(`local: ${localState ? `lv${localState.level} ${localState.coins}💰` : 'null'}`);

        if (!cancelled) {
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
            hasRealDataRef.current = true;
            debugLines.push(`loaded lv${best.level}`);
          } else {
            debugLines.push('NO DATA → initial');
          }

          // Debug overlay (visible on devices without console, disappears after 15s)
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
            hasRealDataRef.current = true;
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

  // After loading: ensure profile exists
  useEffect(() => {
    if (!loading) {
      ensureProfile(stateRef.current).catch(() => {});
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

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        saveToLocal();
        saveToFirestore();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

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
