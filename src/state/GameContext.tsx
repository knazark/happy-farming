import { createContext, useContext, useReducer, useEffect, useRef, useState, useCallback, type ReactNode, type Dispatch } from 'react';
import type { GameState, GameAction } from '../types';
import { gameReducer, createInitialState, migrateSave } from './gameReducer';
import { loadGame, clearSave } from './storage';
import { tick } from '../engine/gameLoop';
import { ensureProfile, getFarmerIdIfExists } from '../firebase/db';
import { saveGameToFirestore, loadGameFromFirestore, saveGameAndProfile } from '../firebase/gameStateSync';

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, null, () => createInitialState());
  const [loading, setLoading] = useState(true);

  const stateRef = useRef(state);
  stateRef.current = state;

  // Dirty flag: only save when state actually changed (not just TICK with no growth)
  const dirtyRef = useRef(false);
  const lastSavedJsonRef = useRef('');

  const savingRef = useRef(false);
  const saveNow = useCallback(() => {
    if (savingRef.current) return;
    if (!getFarmerIdIfExists()) return;
    // Skip save if state hasn't meaningfully changed
    const snapshot = JSON.stringify(stateRef.current);
    if (snapshot === lastSavedJsonRef.current && !dirtyRef.current) return;
    savingRef.current = true;
    dirtyRef.current = false;
    lastSavedJsonRef.current = snapshot;
    saveGameAndProfile(stateRef.current).catch((err) => {
      console.warn('Firestore save failed:', err);
      dirtyRef.current = true; // retry next interval
    }).finally(() => { savingRef.current = false; });
  }, []);

  // Dispatch wrapper — marks dirty on meaningful actions
  const smartDispatch = useCallback((action: GameAction) => {
    dispatch(action);
    if (action.type !== 'TICK') {
      dirtyRef.current = true;
    }
  }, []);

  // Load from Firestore (single source of truth)
  useEffect(() => {
    let cancelled = false;

    async function initLoad() {
      try {
        // One-time migration: if old localStorage save exists, push to Firestore and delete
        const localSave = loadGame();
        if (localSave) {
          await saveGameToFirestore(localSave);
          clearSave();
          if (!cancelled) {
            dispatch({ type: 'LOAD_SAVE', state: tick(migrateSave(localSave), Date.now()) });
            setLoading(false);
          }
          return;
        }

        // Normal path: load from Firestore
        const firestoreState = await loadGameFromFirestore();
        if (!cancelled) {
          if (firestoreState) {
            dispatch({ type: 'LOAD_SAVE', state: tick(migrateSave(firestoreState), Date.now()) });
          }
          // else: new player — keep initial state
          setLoading(false);
        }
      } catch (err) {
        console.warn('Firestore load failed:', err);
        if (!cancelled) {
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

  // Auto-save to Firestore every 30s + on visibility change + on beforeunload
  useEffect(() => {
    if (loading) return;

    const id = setInterval(saveNow, 30000);

    // Save immediately when user switches tab / minimizes
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        saveNow();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Save on page refresh / close
    const onBeforeUnload = () => {
      saveNow();
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [loading, saveNow]);

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
