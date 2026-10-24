import { describe, expect, it } from "vitest";
import { BloqueBusterGame } from "./game";
import { drawGame } from "./render";
import { ballAt, seeded, stubContext } from "./testing";

describe("drawGame", () => {
  it("draws no text in a fresh game", () => {
    const { ctx, texts } = stubContext();
    drawGame(ctx, new BloqueBusterGame(seeded(1)));
    expect(texts).toEqual([]);
  });

  it("draws a black background, 32 bricks in row colours, then the paddle and ball", () => {
    const game = new BloqueBusterGame(seeded(1));
    const { ctx, calls } = stubContext();
    drawGame(ctx, game);
    const rects = calls.filter((call) => call.name === "fillRect");
    expect(rects).toHaveLength(34);
    expect(rects[0].args).toEqual([0, 0, 640, 480]);
    expect(calls[0]).toEqual({ name: "fillStyle", args: ["#000"] });
    for (const [index, brick] of game.bricks.entries()) {
      expect(rects[index + 1].args).toEqual([brick.x, brick.y, brick.width, brick.height]);
    }
    expect(rects[33].args).toEqual([280, 450, 80, 10]);
    let colour: unknown;
    const brickColours: unknown[] = [];
    for (const call of calls) {
      if (call.name === "fillStyle") colour = call.args[0];
      if (call.name === "fillRect" && call.args[2] === 68) brickColours.push(colour);
    }
    expect(brickColours).toEqual(["#ff006e", "#ffae00", "#00f5ff", "#00ff88"].flatMap((c) => Array(8).fill(c)));
    expect(calls.findIndex((call) => call.name === "arc")).toBeGreaterThan(calls.lastIndexOf(rects[33]));
  });

  it("omits five destroyed bricks", () => {
    const game = new BloqueBusterGame(seeded(1));
    game.bricks.slice(0, 5).forEach((brick) => { brick.destroyed = true; });
    const { ctx, calls } = stubContext();
    drawGame(ctx, game);
    expect(calls.filter((call) => call.name === "fillRect" && call.args[2] === 68)).toHaveLength(27);
    expect(calls.filter((call) => call.name === "fillRect")).toHaveLength(29);
  });

  it("draws four fragments instead of the broken paddle", () => {
    const game = new BloqueBusterGame(seeded(1));
    game.lives = 1;
    game.ball = ballAt(100, 461, 0, 240);
    game.update(0, { left: false, right: false });
    const { ctx, calls } = stubContext();
    drawGame(ctx, game);
    const rects = calls.filter((call) => call.name === "fillRect");
    expect(rects).toHaveLength(37);
    expect(rects.some((call) => call.args[2] === 80)).toBe(false);
    expect(rects.slice(-4).map((call) => call.args)).toEqual(game.fragments.map((f) => [f.x, f.y, f.width, f.height]));
  });

  it("draws the ball at its position with radius six", () => {
    const game = new BloqueBusterGame(seeded(1));
    const { ctx, calls } = stubContext();
    drawGame(ctx, game);
    expect(calls.filter((call) => call.name === "arc")).toEqual([
      { name: "arc", args: [320, 444, 6, 0, Math.PI * 2] },
    ]);
    expect(calls.at(-1)?.name).toBe("fill");
  });
});
