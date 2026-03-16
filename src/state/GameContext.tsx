import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode, type Dispatch } from 'react';
import type { GameState, GameAction } from '../types';
import { gameReducer, createInitialState, migrateSave } from './gameReducer';
import { loadGame, saveGame } from './storage';
import { tick } from '../engine/gameLoop';

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, null, () => {
    const saved = loadGame();
    if (saved) {
      return tick(migrateSave(saved), Date.now());
    }
    return createInitialState();
  });

  // Game loop: tick every second
  useEffect(() => {
    const id = setInterval(() => {
      dispatch({ type: 'TICK', now: Date.now() });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-save: use ref to always save latest state
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const id = setInterval(() => saveGame(stateRef.current), 5000);
    const onUnload = () => saveGame(stateRef.current);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      clearInterval(id);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);

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
