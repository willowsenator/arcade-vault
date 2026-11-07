import { describe, expect, it } from "vitest";
import { TetrisGame } from "./game";
import { BOARD_W, BOARD_X, CELL, H, PANEL_W, PANEL_X, W, drawGame } from "./render";
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
  it("draws a 4:3 black background, a dark well and next box, twelve piece cells and no text", () => {
    const { ctx, calls, texts } = stubContext();
    drawGame(ctx, new TetrisGame(seeded(1)));
    expect([CELL, BOARD_W, W, H, BOARD_X, PANEL_X, PANEL_W])
      .toEqual([24, 240, 640, 480, 116, 380, 144]);
    expect(calls[0]).toEqual({ name: "fillStyle", args: ["#000"] });
    const rects = calls.filter((call) => call.name === "fillRect");
    expect(rects[0].args).toEqual([0, 0, 640, 480]);
    expect(rects).toHaveLength(15);
    const painted = paintedRects(calls);
    expect(painted[1]).toEqual({ args: [116, 0, 240, 480], colour: "#0a0a18", alpha: 1 });
    expect(painted[10]).toEqual({ args: [380, 24, 144, 96], colour: "#0a0a18", alpha: 1 });
    expect(texts).toEqual([]);
  });

  it("draws occupied board cells at their coordinates in their type colours", () => {
    const game = new TetrisGame(seeded(1));
    game.board[19][0] = 2;
    game.board[19][9] = 7;
    game.piece = { type: 2, shape: [[2, 2], [2, 2]], x: 4, y: 10 };
    const { ctx, calls } = stubContext();
    drawGame(ctx, game);
    expect(paintedRects(calls).slice(2, 4)).toEqual([
      { args: [116, 456, 23, 23], colour: "#ffd60a", alpha: 1 },
      { args: [332, 456, 23, 23], colour: "#ffae00", alpha: 1 },
    ]);
  });

  it("draws the translucent landing ghost before the opaque current piece", () => {
    const game = new TetrisGame(seeded(1));
    game.piece = { type: 2, shape: [[2, 2], [2, 2]], x: 4, y: 2 };
    expect(game.ghostY()).toBe(18);
    const { ctx, calls } = stubContext();
    drawGame(ctx, game);
    const rects = paintedRects(calls);
    expect(rects.slice(2, 6)).toEqual([
      { args: [212, 432, 23, 23], colour: "#ffd60a", alpha: 0.3 },
      { args: [236, 432, 23, 23], colour: "#ffd60a", alpha: 0.3 },
      { args: [212, 456, 23, 23], colour: "#ffd60a", alpha: 0.3 },
      { args: [236, 456, 23, 23], colour: "#ffd60a", alpha: 0.3 },
    ]);
    expect(rects.slice(6, 10)).toEqual([
      { args: [212, 48, 23, 23], colour: "#ffd60a", alpha: 1 },
      { args: [236, 48, 23, 23], colour: "#ffd60a", alpha: 1 },
      { args: [212, 72, 23, 23], colour: "#ffd60a", alpha: 1 },
      { args: [236, 72, 23, 23], colour: "#ffd60a", alpha: 1 },
    ]);
    game.piece.shape = [[1, 1], [1, 1]];
    const secondDraw = stubContext();
    drawGame(secondDraw.ctx, game);
    expect(paintedRects(secondDraw.calls).slice(2, 10).map((rect) => rect.colour))
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

  it("centres the square next piece in its box and uses its type colour", () => {
    const game = new TetrisGame(seeded(1));
    game.next = { type: 2, shape: [[2, 2], [2, 2]], x: 4, y: 0 };
    const { ctx, calls } = stubContext();
    drawGame(ctx, game);
    expect(paintedRects(calls).slice(-4)).toEqual([
      { args: [428, 48, 23, 23], colour: "#ffd60a", alpha: 1 },
      { args: [452, 48, 23, 23], colour: "#ffd60a", alpha: 1 },
      { args: [428, 72, 23, 23], colour: "#ffd60a", alpha: 1 },
      { args: [452, 72, 23, 23], colour: "#ffd60a", alpha: 1 },
    ]);
    game.next.shape = [[1, 1], [1, 1]];
    const secondDraw = stubContext();
    drawGame(secondDraw.ctx, game);
    expect(paintedRects(secondDraw.calls).slice(-4).map((rect) => rect.colour))
      .toEqual(Array(4).fill("#ffd60a"));
  });

  it("centres the horizontal next piece using its matrix dimensions", () => {
    const game = new TetrisGame(seeded(1));
    game.next = { type: 1, shape: [[2, 2, 2, 2]], x: 4, y: 0 };
    const { ctx, calls } = stubContext();
    drawGame(ctx, game);
    expect(paintedRects(calls).slice(-4)).toEqual([
      { args: [404, 60, 23, 23], colour: "#00f5ff", alpha: 1 },
      { args: [428, 60, 23, 23], colour: "#00f5ff", alpha: 1 },
      { args: [452, 60, 23, 23], colour: "#00f5ff", alpha: 1 },
      { args: [476, 60, 23, 23], colour: "#00f5ff", alpha: 1 },
    ]);
  });

  it("frames the board and next box with the same stroke style and width", () => {
    const { ctx, calls } = stubContext();
    drawGame(ctx, new TetrisGame(seeded(1)));
    let colour: unknown;
    let width: unknown;
    const strokes = calls.flatMap((call) => {
      if (call.name === "strokeStyle") colour = call.args[0];
      if (call.name === "lineWidth") width = call.args[0];
      return call.name === "strokeRect" ? [{ args: call.args, colour, width }] : [];
    });
    expect(strokes).toEqual([
      { args: [116, 0, 240, 480], colour: "#3a3a5c", width: 2 },
      { args: [380, 24, 144, 96], colour: "#3a3a5c", width: 2 },
    ]);
  });

  it("keeps the well, borders and next box on game over without drawing a ghost or current piece", () => {
    const game = new TetrisGame(seeded(1));
    game.state = "gameover";
    game.board[19][0] = 2;
    game.board[19][9] = 7;
    const { ctx, calls, texts } = stubContext();
    drawGame(ctx, game);
    expect(calls.filter((call) => call.name === "globalAlpha")).toEqual([]);
    const rects = calls.filter((call) => call.name === "fillRect");
    expect(rects).toHaveLength(1 + 1 + 2 + 1 + 4);
    expect(rects.slice(2, 4).map((call) => call.args)).toEqual([
      [116, 456, 23, 23], [332, 456, 23, 23],
    ]);
    expect(calls.filter((call) => call.name === "strokeRect").map((call) => call.args)).toEqual([
      [116, 0, 240, 480], [380, 24, 144, 96],
    ]);
    expect(paintedRects(calls)[1]).toEqual({ args: [116, 0, 240, 480], colour: "#0a0a18", alpha: 1 });
    expect(paintedRects(calls)[4]).toEqual({ args: [380, 24, 144, 96], colour: "#0a0a18", alpha: 1 });
    expect(rects.slice(-4).every((call) => Number(call.args[0]) >= 380)).toBe(true);
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
