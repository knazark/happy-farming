import { createContext, useContext, useReducer, useEffect, useRef, useState, type ReactNode, type Dispatch } from 'react';
import type { GameState, GameAction } from '../types';
import { gameReducer, createInitialState, migrateSave } from './gameReducer';
import { loadGame, clearSave } from './storage';
import { tick } from '../engine/gameLoop';
import { ensureProfile, syncProfile, getFarmerIdIfExists } from '../firebase/db';
import { saveGameToFirestore, loadGameFromFirestore } from '../firebase/gameStateSync';

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

  // Auto-save to Firestore every 5s + on visibility change (tab hide / app switch)
  useEffect(() => {
    if (loading) return;

    let saving = false;
    const doSave = () => {
      if (saving) return;
      if (!getFarmerIdIfExists()) return; // ID removed — stop saving
      saving = true;
      Promise.all([
        saveGameToFirestore(stateRef.current),
        syncProfile(stateRef.current),
      ]).catch((err) => {
        console.warn('Firestore save failed:', err);
      }).finally(() => { saving = false; });
    };

    const id = setInterval(doSave, 5000);

    // Save immediately when user switches tab / minimizes / closes app
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        doSave();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loading]);

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
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
