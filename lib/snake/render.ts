import { CELL, H, W, type Cell } from "./entities";
import type { SnakeGame } from "./game";

const BACKGROUND = "#000";
const HEAD_COLOUR = "#b6ffd9";
const BODY_COLOUR = "#00ff88";
const FOOD_COLOUR = "#ff006e";

function drawCell(ctx: CanvasRenderingContext2D, cell: Cell, colour: string) {
  ctx.fillStyle = colour;
  ctx.fillRect(cell.x * CELL, cell.y * CELL, CELL, CELL);
}

export function drawGame(ctx: CanvasRenderingContext2D, game: SnakeGame): void {
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, W, H);
  drawCell(ctx, game.food, FOOD_COLOUR);
  game.snake.forEach((cell, index) => drawCell(ctx, cell, index === 0 ? HEAD_COLOUR : BODY_COLOUR));
}
