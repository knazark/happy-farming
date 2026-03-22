import { createContext, useContext, useReducer, useEffect, useRef, useState, useCallback, type ReactNode, type Dispatch } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameState, GameAction } from '../types';
import { gameReducer, createInitialState, migrateSave } from './gameReducer';
import { tick } from '../engine/gameLoop';
import { getFarmerIdIfExists, clearFarmerId } from '../firebase/rtdb';
import { saveGameState, loadGameState, subscribeGameState, setupPresence, ensureProfileRTDB } from '../firebase/rtdb';

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const GameContext = createContext<GameContextValue | null>(null);

// Debounce interval for RTDB writes (5 seconds)
const RTDB_DEBOUNCE_MS = 5000;

export function GameProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(gameReducer, null, () => createInitialState());
  const [loading, setLoading] = useState(true);

  const stateRef = useRef(state);
  stateRef.current = state;

  // Track whether we successfully loaded real data (not initial state)
  const hasRealDataRef = useRef(false);
  // Debounce timer for RTDB writes
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Flag to skip onValue updates while we're writing
  const isWritingRef = useRef(false);
  // Last saved JSON to prevent redundant writes
  const lastSavedJsonRef = useRef('');

  // --- Debounced RTDB save ---
  const flushToRTDB = useCallback(async () => {
    const farmerId = getFarmerIdIfExists();
    if (!farmerId || !hasRealDataRef.current) return;
    if (!stateRef.current.profile.name || !stateRef.current.profile.password) return;

    const snapshot = JSON.stringify(stateRef.current);
    if (snapshot === lastSavedJsonRef.current) return;

    isWritingRef.current = true;
    lastSavedJsonRef.current = snapshot;
    try {
      await saveGameState(farmerId, stateRef.current);
    } catch {
      lastSavedJsonRef.current = ''; // allow retry on next flush
    } finally {
      isWritingRef.current = false;
    }
  }, []);

  const scheduleRTDBWrite = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(flushToRTDB, RTDB_DEBOUNCE_MS);
  }, [flushToRTDB]);

  // Immediate flush (for important events)
  const immediateFlush = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
    flushToRTDB();
  }, [flushToRTDB]);

  // Dispatch wrapper — schedules RTDB write after each action
  const smartDispatch = useCallback((action: GameAction) => {
    dispatch(action);
    scheduleRTDBWrite();
  }, [scheduleRTDBWrite]);

  // Track level for immediate saves on level-up
  const prevLevelRef = useRef(state.level);
  useEffect(() => {
    if (loading) return;
    if (state.level > prevLevelRef.current) {
      prevLevelRef.current = state.level;
      immediateFlush();
    }
  }, [state.level, loading, immediateFlush]);

  // --- Load from RTDB + subscribe to real-time updates ---
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    async function initLoad() {
      const farmerId = getFarmerIdIfExists();

      if (!farmerId) {
        // No farmerId — fresh new user
        setLoading(false);
        return;
      }

      try {
        // Load game state from RTDB
        const gameState = await loadGameState(farmerId);
        if (cancelled) return;

        if (gameState) {
          const migrated = tick(migrateSave(gameState), Date.now());
          dispatch({ type: 'LOAD_SAVE', state: migrated });
          hasRealDataRef.current = true;
          lastSavedJsonRef.current = JSON.stringify(migrated);
        } else {
          // No data in RTDB — account doesn't exist
          clearFarmerId();
          navigate('/', { replace: true });
          return;
        }
      } catch {
        // RTDB unavailable — show initial state, will retry on next action
      }

      setLoading(false);

      // Subscribe to real-time updates (e.g., friend harvested your plot)
      unsubscribe = subscribeGameState(farmerId, (serverState) => {
        if (isWritingRef.current || !serverState) return;
        // Only accept server updates if they have newer data
        // (e.g., friend harvest added to helpLog or totalHarvested increased)
        const current = stateRef.current;
        if (serverState.totalHarvested > current.totalHarvested ||
            (serverState.helpLog?.length ?? 0) > (current.helpLog?.length ?? 0)) {
          dispatch({ type: 'LOAD_SAVE', state: migrateSave(serverState) });
        }
      });

      // Setup presence (online/offline status)
      setupPresence(farmerId);
    }

    initLoad();
    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // After loading: ensure profile exists in RTDB
  useEffect(() => {
    if (!loading && getFarmerIdIfExists() && stateRef.current.profile.name && stateRef.current.profile.password) {
      ensureProfileRTDB(getFarmerIdIfExists()!, stateRef.current).catch(() => {});
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

  // Flush on tab hide / page close
  useEffect(() => {
    if (loading) return;

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        immediateFlush();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onBeforeUnload = () => immediateFlush();
    window.addEventListener('beforeunload', onBeforeUnload);

    const onPageHide = () => immediateFlush();
    window.addEventListener('pagehide', onPageHide);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onPageHide);
      // Flush any pending changes on unmount
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        flushToRTDB();
      }
    };
  }, [loading, immediateFlush, flushToRTDB]);

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
