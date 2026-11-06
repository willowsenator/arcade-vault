import { describe, expect, it } from "vitest";
import { TetrisGame } from "./game";
import { BOARD_W, CELL, H, W, drawGame } from "./render";
import { seeded, stubContext } from "./testing";

function paintedRects(calls: ReturnType<typeof stubContext>["calls"]) {
  let colour: unknown;
  let alpha: unknown = 1;
  return calls.flatMap((call) => {
    if (call.name === "fillStyle") colour = call.args[0];
    if (call.name === "globalAlpha") alpha = call.args[0];
    return call.name === "fillRect" ? [{ args: call.args, colour, alpha }] : [];
  });
}

describe("drawGame", () => {
  it("draws a black background first, twelve piece cells and no text in a fresh game", () => {
    const { ctx, calls, texts } = stubContext();
    drawGame(ctx, new TetrisGame(seeded(1)));
    expect([CELL, BOARD_W, W, H]).toEqual([24, 240, 360, 480]);
    expect(calls[0]).toEqual({ name: "fillStyle", args: ["#000"] });
    const rects = calls.filter((call) => call.name === "fillRect");
    expect(rects[0].args).toEqual([0, 0, 360, 480]);
    expect(rects).toHaveLength(13);
    expect(texts).toEqual([]);
  });

  it("draws occupied board cells at their coordinates in their type colours", () => {
    const game = new TetrisGame(seeded(1));
    game.board[19][0] = 2;
    game.board[19][9] = 7;
    game.piece = { type: 2, shape: [[2, 2], [2, 2]], x: 4, y: 10 };
    const { ctx, calls } = stubContext();
    drawGame(ctx, game);
    expect(paintedRects(calls).slice(1, 3)).toEqual([
      { args: [0, 456, 23, 23], colour: "#ffd60a", alpha: 1 },
      { args: [216, 456, 23, 23], colour: "#ffae00", alpha: 1 },
    ]);
  });

  it("draws the translucent landing ghost before the opaque current piece", () => {
    const game = new TetrisGame(seeded(1));
    game.piece = { type: 2, shape: [[2, 2], [2, 2]], x: 4, y: 2 };
    expect(game.ghostY()).toBe(18);
    const { ctx, calls } = stubContext();
    drawGame(ctx, game);
    const rects = paintedRects(calls);
    expect(rects.slice(1, 5)).toEqual([
      { args: [96, 432, 23, 23], colour: "#ffd60a", alpha: 0.3 },
      { args: [120, 432, 23, 23], colour: "#ffd60a", alpha: 0.3 },
      { args: [96, 456, 23, 23], colour: "#ffd60a", alpha: 0.3 },
      { args: [120, 456, 23, 23], colour: "#ffd60a", alpha: 0.3 },
    ]);
    expect(rects.slice(5, 9)).toEqual([
      { args: [96, 48, 23, 23], colour: "#ffd60a", alpha: 1 },
      { args: [120, 48, 23, 23], colour: "#ffd60a", alpha: 1 },
      { args: [96, 72, 23, 23], colour: "#ffd60a", alpha: 1 },
      { args: [120, 72, 23, 23], colour: "#ffd60a", alpha: 1 },
    ]);
    game.piece.shape = [[1, 1], [1, 1]];
    const secondDraw = stubContext();
    drawGame(secondDraw.ctx, game);
    expect(paintedRects(secondDraw.calls).slice(1, 9).map((rect) => rect.colour))
      .toEqual(Array(8).fill("#ffd60a"));
  });

  it("restores global alpha to one after every translucent assignment", () => {
    const { ctx, calls } = stubContext();
    drawGame(ctx, new TetrisGame(seeded(1)));
    const alphas = calls.filter((call) => call.name === "globalAlpha");
    expect(alphas.some((call) => call.args[0] === 0.3)).toBe(true);
    expect(alphas.at(-1)?.args).toEqual([1]);
    alphas.forEach((call, index) => {
      if (call.args[0] === 0.3) {
        expect(alphas.slice(index + 1).some((later) => later.args[0] === 1)).toBe(true);
      }
    });
  });

  it("draws the next piece in the right panel independently of its board position", () => {
    const game = new TetrisGame(seeded(1));
    game.next = { type: 2, shape: [[2, 2], [2, 2]], x: 4, y: 0 };
    const { ctx, calls } = stubContext();
    drawGame(ctx, game);
    expect(paintedRects(calls).slice(-4)).toEqual([
      { args: [264, 48, 23, 23], colour: "#ffd60a", alpha: 1 },
      { args: [288, 48, 23, 23], colour: "#ffd60a", alpha: 1 },
      { args: [264, 72, 23, 23], colour: "#ffd60a", alpha: 1 },
      { args: [288, 72, 23, 23], colour: "#ffd60a", alpha: 1 },
    ]);
    game.next.shape = [[1, 1], [1, 1]];
    const secondDraw = stubContext();
    drawGame(secondDraw.ctx, game);
    expect(paintedRects(secondDraw.calls).slice(-4).map((rect) => rect.colour))
      .toEqual(Array(4).fill("#ffd60a"));
  });

  it("draws only background, board and next piece on game over without changing alpha", () => {
    const game = new TetrisGame(seeded(1));
    game.state = "gameover";
    game.board[19][0] = 2;
    game.board[19][9] = 7;
    const { ctx, calls, texts } = stubContext();
    drawGame(ctx, game);
    expect(calls.filter((call) => call.name === "globalAlpha")).toEqual([]);
    const rects = calls.filter((call) => call.name === "fillRect");
    expect(rects).toHaveLength(1 + 2 + 4);
    expect(rects.slice(1, 3).map((call) => call.args)).toEqual([
      [0, 456, 23, 23], [216, 456, 23, 23],
    ]);
    expect(rects.slice(-4).every((call) => Number(call.args[0]) >= 264)).toBe(true);
    expect(texts).toEqual([]);
  });

  it("does not mutate the game when drawing", () => {
    const game = new TetrisGame(seeded(1));
    game.board[19][0] = 2;
    const before = JSON.stringify(game);
    drawGame(stubContext().ctx, game);
    expect(JSON.stringify(game)).toBe(before);
  });
});
