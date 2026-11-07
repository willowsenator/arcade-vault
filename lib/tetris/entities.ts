export const COLS = 10;
export const ROWS = 20;

export type Random = () => number;
export type Matrix = number[][];

export const PIECES: readonly Matrix[] = [
  [[1, 1, 1, 1]],
  [[2, 2], [2, 2]],
  [[0, 3, 0], [3, 3, 3]],
  [[0, 4, 4], [4, 4, 0]],
  [[5, 5, 0], [0, 5, 5]],
  [[6, 0, 0], [6, 6, 6]],
  [[0, 0, 7], [7, 7, 7]],
];

export function rotate(shape: Matrix): Matrix {
  return shape[0].map((_, column) => shape.map((row) => row[column]).reverse());
}

export function collides(board: Matrix, shape: Matrix, x: number, y: number): boolean {
  return shape.some((row, rowIndex) => row.some((cell, columnIndex) => {
    if (cell === 0) return false;
    const column = x + columnIndex;
    const boardRow = y + rowIndex;
    return column < 0 || column >= COLS || boardRow >= ROWS ||
      (boardRow >= 0 && board[boardRow][column] !== 0);
  }));
}

export function emptyBoard(): Matrix {
  return Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0));
}
