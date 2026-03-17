import { createContext, useContext, useReducer, useEffect, useRef, useState, type ReactNode, type Dispatch } from 'react';
import type { GameState, GameAction } from '../types';
import { gameReducer, createInitialState, migrateSave } from './gameReducer';
import { loadGame, saveGame } from './storage';
import { tick } from '../engine/gameLoop';
import { ensureProfile, syncProfile } from '../firebase/db';
import { saveGameToFirestore, loadGameFromFirestore, migrateFromLocalStorage } from '../firebase/gameStateSync';

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

  // Async load: migrate localStorage → Firestore, or load from Firestore
  useEffect(() => {
    let cancelled = false;

    async function initLoad() {
      try {
        // Step 1: Try migrating localStorage data to Firestore
        const migrated = await migrateFromLocalStorage();
        if (migrated) {
          if (!cancelled) {
            dispatch({ type: 'LOAD_SAVE', state: tick(migrateSave(migrated), Date.now()) });
            setLoading(false);
          }
          return;
        }

        // Step 2: No localStorage — check if there's a beforeunload backup
        const localBackup = loadGame();

        // Step 3: Load from Firestore
        const firestoreState = await loadGameFromFirestore();

        if (!cancelled) {
          if (localBackup && firestoreState) {
            // Compare timestamps — use whichever is newer
            const useLocal = (localBackup.lastTickAt ?? 0) > (firestoreState.lastTickAt ?? 0);
            const chosen = useLocal ? localBackup : firestoreState;
            dispatch({ type: 'LOAD_SAVE', state: tick(migrateSave(chosen), Date.now()) });
            if (useLocal) {
              saveGameToFirestore(chosen).catch(() => {});
            }
          } else if (firestoreState) {
            dispatch({ type: 'LOAD_SAVE', state: tick(migrateSave(firestoreState), Date.now()) });
          } else if (localBackup) {
            dispatch({ type: 'LOAD_SAVE', state: tick(migrateSave(localBackup), Date.now()) });
            saveGameToFirestore(localBackup).catch(() => {});
          }
          // else: new player — keep initial state
          setLoading(false);
        }
      } catch (err) {
        console.warn('Firestore load failed, falling back to localStorage:', err);
        if (!cancelled) {
          const local = loadGame();
          if (local) {
            dispatch({ type: 'LOAD_SAVE', state: tick(migrateSave(local), Date.now()) });
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

  // Save to localStorage on every state change (cheap, synchronous)
  useEffect(() => {
    if (loading) return;
    saveGame(state);
  }, [state, loading]);

  // Auto-save to Firestore every 5s + on visibility change (tab hide / app switch)
  useEffect(() => {
    if (loading) return;

    let saving = false;
    const doSave = () => {
      if (saving) return;
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
        // Also sync localStorage as a backup
        saveGame(stateRef.current);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // beforeunload: synchronous localStorage backup
    const onUnload = () => saveGame(stateRef.current);
    window.addEventListener('beforeunload', onUnload);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onUnload);
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
