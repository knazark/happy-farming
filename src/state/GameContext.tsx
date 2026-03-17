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
    if (savingRef.current) return;
    if (!getFarmerIdIfExists()) return;
    // Skip if state hasn't changed since last Firestore save
    const snapshot = JSON.stringify(stateRef.current);
    if (snapshot === lastFirestoreJsonRef.current) return;
    savingRef.current = true;
    lastFirestoreJsonRef.current = snapshot;
    saveGameAndProfile(stateRef.current).catch((err) => {
      console.warn('Firestore save failed:', err);
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
      try {
        // Try Firestore first (authoritative for cross-device)
        const firestoreState = await loadGameFromFirestore();
        const localState = loadGame();

        if (!cancelled) {
          // Pick the most recent save
          let best: GameState | null = null;
          if (firestoreState && localState) {
            // Compare lastTick or totalEarned to pick fresher state
            best = (localState.lastTickAt ?? 0) > (firestoreState.lastTickAt ?? 0)
              ? localState : firestoreState;
          } else {
            best = firestoreState ?? localState;
          }

          if (best) {
            dispatch({ type: 'LOAD_SAVE', state: tick(migrateSave(best), Date.now()) });
          }
          setLoading(false);
        }
      } catch (err) {
        console.warn('Firestore load failed, trying localStorage:', err);
        if (!cancelled) {
          const localState = loadGame();
          if (localState) {
            dispatch({ type: 'LOAD_SAVE', state: tick(migrateSave(localState), Date.now()) });
          }
          setLoading(false);
        }
      }
    }

    initLoad();
    return () => { cancelled = true; };
  }, []);

  // Ensure Firestore profile exists after loading
  useEffect(() => {
    if (!loading) {
      ensureProfile(stateRef.current).catch(() => {});
    }
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
