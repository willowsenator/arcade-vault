import { COLS, ROWS, type Matrix } from "./entities";
import type { TetrisGame } from "./game";

export const CELL = 24;
export const BOARD_W = COLS * CELL;
export const W = BOARD_W + 120;
export const H = ROWS * CELL;

const COLOURS = ["#00f5ff", "#ffd60a", "#bf5af2", "#00ff88", "#ff006e", "#3a86ff", "#ffae00"];

function drawCells(ctx: CanvasRenderingContext2D, shape: Matrix, position: { x: number; y: number }, type?: number) {
  shape.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell === 0) return;
      ctx.fillStyle = COLOURS[(type ?? cell) - 1];
      ctx.fillRect(position.x + c * CELL, position.y + r * CELL, CELL - 1, CELL - 1);
    });
  });
}

export function drawGame(ctx: CanvasRenderingContext2D, game: TetrisGame): void {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  drawCells(ctx, game.board, { x: 0, y: 0 });

  if (game.state === "playing") {
    const { piece } = game;
    ctx.globalAlpha = 0.3;
    drawCells(ctx, piece.shape, { x: piece.x * CELL, y: game.ghostY() * CELL }, piece.type);
    ctx.globalAlpha = 1;
    drawCells(ctx, piece.shape, { x: piece.x * CELL, y: piece.y * CELL }, piece.type);
  }

  drawCells(ctx, game.next.shape, { x: BOARD_W + 24, y: 48 }, game.next.type);
}
