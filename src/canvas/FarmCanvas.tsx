// @ts-nocheck — Legacy canvas renderer, replaced by FarmView (DOM)
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useGame } from '../state/GameContext';
import { GRID_COLS, GRID_ROWS, CELL_SIZE, GRID_PADDING, GRID_Y_START } from '../constants/grid';
import { ANIMAL_CELL_H, ANIMAL_PEN_COLS } from '../constants/game';
import { drawFrame, groupAnimals, getAnimalPenLayout } from './renderer';
import { ANIMALS } from '../constants/animals';
import { pixelToPlotIndex } from './interaction';
import { getPerPlotUnlockInfo } from '../engine/economy';

// Logical (CSS) size
const CANVAS_WIDTH = GRID_PADDING * 2 + GRID_COLS * CELL_SIZE;

function calcCanvasHeight(animalGroupCount: number) {
  const gridBottom = GRID_Y_START + GRID_ROWS * CELL_SIZE;
  if (animalGroupCount === 0) return gridBottom + 40;
  const rows = Math.max(2, Math.ceil(animalGroupCount / ANIMAL_PEN_COLS));
  const penHeight = 24 + rows * ANIMAL_CELL_H + 18;
  return gridBottom + 12 + penHeight + 20;
}

interface FarmCanvasProps {
  onPlotClick: (plotIndex: number) => void;
  onAnimalClick: (animalIndex: number, cardCenterX?: number, cardCenterY?: number) => void;
}

export function FarmCanvas({ onPlotClick, onAnimalClick }: FarmCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state } = useGame();
  const [hoveredPlot, setHoveredPlot] = useState<number | null>(null);

  // Calculate dynamic canvas height based on animal groups
  const groups = useMemo(
    () => groupAnimals(state.animals, Date.now(), state.feedActiveUntil),
    [state.animals, state.feedActiveUntil],
  );
  const canvasHeight = useMemo(() => calcCanvasHeight(groups.length), [groups.length]);

  // Setup HiDPI canvas + draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale for Retina / HiDPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${canvasHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const unlockMap = getPerPlotUnlockInfo(state.plots, state.level, state.coins);

    let animId: number;
    const draw = () => {
      drawFrame(ctx, state.plots, state.animals, hoveredPlot, Date.now(), unlockMap, undefined, state.season, state.feedActiveUntil, state.hasGreenhouse);
      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [state.plots, state.animals, state.level, state.season, state.feedActiveUntil, hoveredPlot, state.hasGreenhouse, canvasHeight]);

  // Convert mouse event to logical canvas coordinates
  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width),
        y: (e.clientY - rect.top) * (canvasHeight / rect.height),
      };
    },
    [canvasHeight],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getCanvasCoords(e);
      if (!coords) return;

      // Check plot click
      const plotIndex = pixelToPlotIndex(coords.x, coords.y);
      if (plotIndex !== null) {
        onPlotClick(plotIndex);
        return;
      }

      // Check animal pen click (cell-sized layout)
      const now = Date.now();
      const clickGroups = groupAnimals(state.animals, now, state.feedActiveUntil);
      if (clickGroups.length > 0) {
        const { startY, cols, cellW, cellH } = getAnimalPenLayout(state.animals.length);
        const startX = GRID_PADDING;

        if (
          coords.y >= startY &&
          coords.x >= startX &&
          coords.x < startX + cols * cellW
        ) {
          const col = Math.floor((coords.x - startX) / cellW);
          const row = Math.floor((coords.y - startY) / cellH);
          const groupIndex = row * cols + col;
          if (groupIndex >= 0 && groupIndex < clickGroups.length && col < cols) {
            const group = clickGroups[groupIndex];
            const animal = ANIMALS[group.animalId];
            const isFeedActive = now < state.feedActiveUntil;
            const effectiveTime = isFeedActive ? animal.productionTime * 0.5 : animal.productionTime;
            const readySlotIdx = state.animals.findIndex(
              (s) => s.animalId === group.animalId &&
                (now - s.lastCollectedAt) / 1000 >= effectiveTime,
            );
            if (readySlotIdx !== -1) {
              const cardCenterX = startX + col * cellW + cellW / 2;
              const cardCenterY = startY + row * cellH + cellH / 2;
              onAnimalClick(readySlotIdx, cardCenterX, cardCenterY);
            }
          }
        }
      }
    },
    [getCanvasCoords, onPlotClick, onAnimalClick, state.animals],
  );

  // Check if coords are over a clickable animal card
  const isOverAnimalCard = useCallback(
    (coords: { x: number; y: number }): boolean => {
      const now = Date.now();
      const hoverGroups = groupAnimals(state.animals, now, state.feedActiveUntil);
      if (hoverGroups.length === 0) return false;
      const { startY, cols, cellW, cellH } = getAnimalPenLayout(state.animals.length);
      const startX = GRID_PADDING;

      if (
        coords.y >= startY &&
        coords.x >= startX &&
        coords.x < startX + cols * cellW
      ) {
        const col = Math.floor((coords.x - startX) / cellW);
        const row = Math.floor((coords.y - startY) / cellH);
        const groupIndex = row * cols + col;
        if (groupIndex >= 0 && groupIndex < hoverGroups.length && col < cols) {
          return hoverGroups[groupIndex].readyCount > 0;
        }
      }
      return false;
    },
    [state.animals],
  );

  const [hoverAnimal, setHoverAnimal] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getCanvasCoords(e);
      if (!coords) return;
      setHoveredPlot(pixelToPlotIndex(coords.x, coords.y));
      setHoverAnimal(isOverAnimalCard(coords));
    },
    [getCanvasCoords, isOverAnimalCard],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredPlot(null);
    setHoverAnimal(false);
  }, []);

  // Dynamic cursor based on hovered element
  let cursor = 'default';
  if (hoveredPlot !== null && hoveredPlot >= 0 && hoveredPlot < state.plots.length) {
    const plot = state.plots[hoveredPlot];
    switch (plot.status) {
      case 'ready': cursor = 'pointer'; break;
      case 'empty': cursor = 'pointer'; break;
      case 'locked': cursor = 'pointer'; break;
      case 'growing': break;
    }
  } else if (hoverAnimal) {
    cursor = 'pointer';
  }

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ cursor, borderRadius: 12 }}
    />
  );
}
