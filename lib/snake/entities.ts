export const COLS = 20;
export const ROWS = 20;
export const CELL = 24;
export const W = COLS * CELL;
export const H = ROWS * CELL;

export const BASE_STEP = 0.15;
export const STEP_FACTOR = 0.92;
export const FOODS_PER_LEVEL = 5;
export const FOOD_POINTS = 10;

export type Random = () => number;
export type Cell = { x: number; y: number };
export type Direction = "up" | "down" | "left" | "right";

export const DELTAS: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function isOpposite(a: Direction, b: Direction): boolean {
  return DELTAS[a].x + DELTAS[b].x === 0 && DELTAS[a].y + DELTAS[b].y === 0;
}

export function stepInterval(level: number): number {
  return BASE_STEP * STEP_FACTOR ** (level - 1);
}

export function levelFor(foodEaten: number): number {
  return 1 + Math.floor(foodEaten / FOODS_PER_LEVEL);
}
