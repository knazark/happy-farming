import { createContext, useContext, useReducer, useEffect, useRef, useState, useCallback, type ReactNode, type Dispatch } from 'react';
import type { GameState, GameAction } from '../types';
import { gameReducer, createInitialState, migrateSave } from './gameReducer';
import { saveGame, loadGame, clearSave } from './storage';
import { tick } from '../engine/gameLoop';
import { ensureProfile, getFarmerIdIfExists, clearFarmerId } from '../firebase/db';
import { loadGameFromFirestoreEx, saveGameAndProfile } from '../firebase/gameStateSync';
import { shouldBlockFirestoreSave } from './saveGuards';

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
  // High-water mark: highest totalEarned ever seen for this session
  const highWaterMarkRef = useRef(0);

  // --- localStorage save (fast, free, every 5s) ---
  const saveToLocal = useCallback(() => {
    if (!getFarmerIdIfExists() || !hasRealDataRef.current) return;
    // Update high-water mark
    if (stateRef.current.totalEarned > highWaterMarkRef.current) {
      highWaterMarkRef.current = stateRef.current.totalEarned;
    }
    saveGame(stateRef.current);
  }, []);

  // --- Firestore save (remote backup, every 2 min) ---
  const savingRef = useRef(false);
  const lastFirestoreJsonRef = useRef('');
  const saveToFirestore = useCallback(() => {
    if (savingRef.current) return;
    const blockReason = shouldBlockFirestoreSave({
      hasFarmerId: !!getFarmerIdIfExists(),
      hasRealData: hasRealDataRef.current,
      highWaterMark: highWaterMarkRef.current,
      profileName: stateRef.current.profile.name,
      profilePassword: stateRef.current.profile.password,
      level: stateRef.current.level,
      totalEarned: stateRef.current.totalEarned,
    });
    if (blockReason) {
      if (blockReason === 'regression_below_high_water') {
        console.warn(`Blocked Firestore write: totalEarned ${stateRef.current.totalEarned} << highWater ${highWaterMarkRef.current}`);
      }
      return;
    }
    const snapshot = JSON.stringify(stateRef.current);
    if (snapshot === lastFirestoreJsonRef.current) return;
    savingRef.current = true;
    lastFirestoreJsonRef.current = snapshot;
    saveGameAndProfile(stateRef.current).catch(() => {
      lastFirestoreJsonRef.current = '';
    }).finally(() => { savingRef.current = false; });
  }, []);

  // Track level for event-based Firestore saves
  const prevLevelRef = useRef(state.level);

  // Event-based Firestore save: triggers on level-up
  useEffect(() => {
    if (loading) return;
    if (state.level > prevLevelRef.current) {
      prevLevelRef.current = state.level;
      // Level up — save immediately to Firestore
      saveToFirestore();
    }
  }, [state.level, loading, saveToFirestore]);

  // Dispatch wrapper
  const smartDispatch = useCallback((action: GameAction) => {
    dispatch(action);
  }, []);

  // Load: localStorage first (instant), then verify farmerId exists in Firestore
  // If farmerId not in Firestore → account deleted → clear everything → login screen
  useEffect(() => {
    let cancelled = false;

    async function initLoad() {
      const farmerId = getFarmerIdIfExists();
      const localState = loadGame();

      // Step 1: load from localStorage immediately (primary source)
      if (localState) {
        const migrated = tick(migrateSave(localState), Date.now());
        dispatch({ type: 'LOAD_SAVE', state: migrated });
        hasRealDataRef.current = true;
        highWaterMarkRef.current = migrated.totalEarned ?? 0;
      }
      setLoading(false);

      // Step 2: verify farmerId exists in Firestore (only if localStorage had data)
      // Skip for new games — doc doesn't exist yet and that's expected
      if (farmerId && localState) {
        try {
          const { docExists } = await loadGameFromFirestoreEx();
          if (!cancelled && !docExists) {
            // Account was deleted from Firestore → wipe and redirect to login
            clearSave();
            clearFarmerId();
            window.location.reload();
          }
        } catch {
          // Firestore unavailable — that's OK, localStorage is primary
        }
      }
    }

    initLoad();
    return () => { cancelled = true; };
  }, []);

  // After loading: ensure profile exists (only if profile is set up — name + password + farmerId)
  useEffect(() => {
    if (!loading && getFarmerIdIfExists() && stateRef.current.profile.name && stateRef.current.profile.password) {
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
