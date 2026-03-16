import { GRID_COLS, GRID_ROWS, CELL_SIZE, GRID_PADDING, GRID_Y_START } from '../constants/grid';

export function pixelToPlotIndex(canvasX: number, canvasY: number): number | null {
  const col = Math.floor((canvasX - GRID_PADDING) / CELL_SIZE);
  const row = Math.floor((canvasY - GRID_Y_START) / CELL_SIZE);

  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;

  return row * GRID_COLS + col;
}

export function plotIndexToPixel(index: number): { x: number; y: number } {
  const col = index % GRID_COLS;
  const row = Math.floor(index / GRID_COLS);
  return {
    x: GRID_PADDING + col * CELL_SIZE,
    y: GRID_Y_START + row * CELL_SIZE,
  };
}
