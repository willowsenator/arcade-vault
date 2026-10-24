import { H, W, type Ball, type Brick, type Rect } from "./entities";
import type { BloqueBusterGame } from "./game";

const ROW_COLOURS = ["#ff006e", "#ffae00", "#00f5ff", "#00ff88"] as const;

function drawBrick(ctx: CanvasRenderingContext2D, brick: Brick) {
  if (brick.destroyed) return;
  ctx.fillStyle = ROW_COLOURS[brick.row];
  drawRect(ctx, brick);
}

function drawRect(ctx: CanvasRenderingContext2D, rect: Rect) {
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
}

function drawBall(ctx: CanvasRenderingContext2D, ball: Ball) {
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
}

export function drawGame(ctx: CanvasRenderingContext2D, game: BloqueBusterGame): void {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  game.bricks.forEach((brick) => drawBrick(ctx, brick));
  ctx.fillStyle = "#fff";
  if (game.paddle.broken) {
    game.fragments.forEach((fragment) => drawRect(ctx, fragment));
  } else {
    drawRect(ctx, game.paddle);
  }
  drawBall(ctx, game.ball);
}
