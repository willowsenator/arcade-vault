import { COLS, ROWS, type Matrix } from "./entities";
import type { TetrisGame } from "./game";

export const CELL = 24;
export const BOARD_W = COLS * CELL;
export const W = 640;
export const H = ROWS * CELL;
export const BOARD_X = 116;
export const PANEL_W = 144;
export const PANEL_X = BOARD_X + BOARD_W + 24;

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
  ctx.fillStyle = "#0a0a18";
  ctx.fillRect(BOARD_X, 0, BOARD_W, H);
  drawCells(ctx, game.board, { x: BOARD_X, y: 0 });

  if (game.state === "playing") {
    const { piece } = game;
    ctx.globalAlpha = 0.3;
    drawCells(ctx, piece.shape, { x: BOARD_X + piece.x * CELL, y: game.ghostY() * CELL }, piece.type);
    ctx.globalAlpha = 1;
    drawCells(ctx, piece.shape, { x: BOARD_X + piece.x * CELL, y: piece.y * CELL }, piece.type);
  }

  ctx.strokeStyle = "#3a3a5c";
  ctx.lineWidth = 2;
  ctx.strokeRect(BOARD_X, 0, BOARD_W, H);

  ctx.fillStyle = "#0a0a18";
  ctx.fillRect(PANEL_X, 24, PANEL_W, 96);
  ctx.strokeRect(PANEL_X, 24, PANEL_W, 96);

  const { shape, type } = game.next;
  drawCells(ctx, shape, {
    x: PANEL_X + (PANEL_W - shape[0].length * CELL) / 2,
    y: 24 + (96 - shape.length * CELL) / 2,
  }, type);
}
