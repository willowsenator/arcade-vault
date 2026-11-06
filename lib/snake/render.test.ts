import { describe, expect, it } from "vitest";
import { CELL, H, W } from "./entities";
import { SnakeGame } from "./game";
import { drawGame } from "./render";
import { seeded, stubContext } from "./testing";

function fillStyleBefore(calls: { name: string; args: unknown[] }[], x: number, y: number) {
  const index = calls.findIndex(
    (call) => call.name === "fillRect" && call.args[0] === x * CELL && call.args[1] === y * CELL,
  );
  const styles = calls.slice(0, index).filter((call) => call.name === "fillStyle");
  return styles[styles.length - 1].args[0];
}

describe("drawGame", () => {
  it("clears the board, then fills one rect per snake cell and one for the food", () => {
    const { ctx, calls } = stubContext();
    const game = new SnakeGame(seeded(1));
    drawGame(ctx, game);
    const rects = calls.filter((call) => call.name === "fillRect");
    expect(rects[0].args).toEqual([0, 0, W, H]);
    expect(rects).toHaveLength(1 + game.snake.length + 1);
  });

  it("fills the head with a different colour than the body", () => {
    const { ctx, calls } = stubContext();
    const game = new SnakeGame(seeded(1));
    drawGame(ctx, game);
    const [head, body] = game.snake;
    expect(fillStyleBefore(calls, head.x, head.y)).not.toBe(fillStyleBefore(calls, body.x, body.y));
  });

  it("draws the food in magenta", () => {
    const { ctx, calls } = stubContext();
    const game = new SnakeGame(seeded(1));
    drawGame(ctx, game);
    expect(fillStyleBefore(calls, game.food.x, game.food.y)).toBe("#ff006e");
  });

  it("draws no text while playing or after game over, like the sibling renderers", () => {
    const playing = stubContext();
    const game = new SnakeGame(seeded(1));
    drawGame(playing.ctx, game);
    game.state = "gameover";
    const over = stubContext();
    drawGame(over.ctx, game);
    expect(playing.texts).toEqual([]);
    expect(over.texts).toEqual([]);
  });
});
