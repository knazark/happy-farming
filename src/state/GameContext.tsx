import { createContext, useContext, useReducer, useEffect, useRef, useState, useCallback, type ReactNode, type Dispatch } from 'react';
import type { GameState, GameAction } from '../types';
import { gameReducer, createInitialState, migrateSave } from './gameReducer';
import { loadGame, clearSave } from './storage';
import { tick } from '../engine/gameLoop';
import { ensureProfile, syncProfile, getFarmerIdIfExists } from '../firebase/db';
import { saveGameToFirestore, loadGameFromFirestore } from '../firebase/gameStateSync';

// Actions that should trigger an immediate Firestore save
const IMMEDIATE_SAVE_ACTIONS = new Set([
  'PLANT_CROP', 'HARVEST', 'BUY_ANIMAL', 'SELL_ITEM', 'CRAFT_ITEM',
  'UNLOCK_PLOT', 'UPGRADE_SOIL', 'GATHER_WOOD', 'COLLECT_WOOD',
  'BUY_TRACTOR', 'BUY_CALEB', 'BUY_AUTO_PLANTER', 'SET_AUTO_CROP',
  'CLEAR_AUTO_CROP', 'ACCEPT_ORDER', 'COMPLETE_ORDER', 'FERTILIZE_PLOT',
  'UPDATE_PROFILE', 'LOAD_SAVE',
]);

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

  const savingRef = useRef(false);
  const saveNow = useCallback(() => {
    if (savingRef.current) return;
    if (!getFarmerIdIfExists()) return;
    savingRef.current = true;
    Promise.all([
      saveGameToFirestore(stateRef.current),
      syncProfile(stateRef.current),
    ]).catch((err) => {
      console.warn('Firestore save failed:', err);
    }).finally(() => { savingRef.current = false; });
  }, []);

  // Debounced save: coalesces rapid actions into one save after 1s
  const debouncedSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSave = useCallback(() => {
    if (debouncedSaveRef.current) clearTimeout(debouncedSaveRef.current);
    debouncedSaveRef.current = setTimeout(() => {
      debouncedSaveRef.current = null;
      saveNow();
    }, 2000);
  }, [saveNow]);

  // Wrapped dispatch that triggers debounced save for important actions
  const smartDispatch = useCallback((action: GameAction) => {
    dispatch(action);
    if (!loading && IMMEDIATE_SAVE_ACTIONS.has(action.type)) {
      debouncedSave();
    }
  }, [loading, debouncedSave]);

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

  // Auto-save to Firestore every 5s + on visibility change + on beforeunload
  useEffect(() => {
    if (loading) return;

    const id = setInterval(saveNow, 5000);

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
