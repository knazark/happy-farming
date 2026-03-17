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
    if (!getFarmerIdIfExists()) return;
    saveGame(stateRef.current);
  }, []);

  // --- Firestore save (remote backup, every 2 min) ---
  const savingRef = useRef(false);
  const lastFirestoreJsonRef = useRef('');
  const saveToFirestore = useCallback(() => {
    if (savingRef.current) return;
    if (!getFarmerIdIfExists()) return;
    // Don't save initial state to Firestore (could overwrite real data)
    if (!hasRealDataRef.current && stateRef.current.level <= 1 && stateRef.current.totalEarned === 0) return;
    // Don't save to Firestore until user has set up profile (name + password)
    if (!stateRef.current.profile.name || !stateRef.current.profile.password) return;
    const snapshot = JSON.stringify(stateRef.current);
    if (snapshot === lastFirestoreJsonRef.current) return;
    savingRef.current = true;
    lastFirestoreJsonRef.current = snapshot;
    saveGameAndProfile(stateRef.current).catch(() => {
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
      try {
        const firestoreState = await loadGameFromFirestore();
        const localState = loadGame();

        if (!cancelled) {
          let best: GameState | null = null;
          if (firestoreState && localState) {
            const localTick = localState.lastTickAt ?? 0;
            const fireTick = firestoreState.lastTickAt ?? 0;
            best = localTick > fireTick ? localState : firestoreState;
          } else {
            best = firestoreState ?? localState;
          }

          if (best) {
            dispatch({ type: 'LOAD_SAVE', state: tick(migrateSave(best), Date.now()) });
            hasRealDataRef.current = true;
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          const localState = loadGame();
          if (localState) {
            dispatch({ type: 'LOAD_SAVE', state: tick(migrateSave(localState), Date.now()) });
            hasRealDataRef.current = true;
          }
          setLoading(false);
        }
      }
    }

    initLoad();
    return () => { cancelled = true; };
  }, []);

  // After loading: ensure profile exists (only if profile is set up — name + password)
  useEffect(() => {
    if (!loading && stateRef.current.profile.name && stateRef.current.profile.password) {
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

    // Save on tab hide/close — visibilitychange is more reliable on mobile
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        saveToLocal();
        saveToFirestore();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Also try on beforeunload (desktop browsers)
    const onBeforeUnload = () => {
      saveToLocal();
      saveToFirestore();
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    // pagehide fires reliably on mobile Safari/Chrome when closing tab
    const onPageHide = () => {
      saveToLocal();
      saveToFirestore();
    };
    window.addEventListener('pagehide', onPageHide);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onPageHide);
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
