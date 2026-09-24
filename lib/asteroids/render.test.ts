import { describe, expect, it } from "vitest";
import { AsteroidsGame } from "./game";
import { drawGame } from "./render";
import { seeded, stubContext } from "./testing";

describe("drawGame", () => {
  it("draws a fresh game without drawing any text", () => {
    const { ctx, texts } = stubContext();
    drawGame(ctx, new AsteroidsGame(seeded(1)));
    expect(texts).toEqual([]);
  });

  it("labels active power-ups in Spanish with their remaining seconds", () => {
    const { ctx, texts } = stubContext();
    const game = new AsteroidsGame(seeded(1));
    game.ship.tripleShot = 3.24;
    game.ship.shield = 4.06;
    drawGame(ctx, game);
    expect(texts).toEqual(["TRIPLE 3.2", "ESCUDO 4.1"]);
  });

  it("never draws the English strings of the original game", () => {
    const { ctx, texts } = stubContext();
    const game = new AsteroidsGame(seeded(1));
    game.state = "gameover";
    game.ship.shield = 2;
    drawGame(ctx, game);
    expect(texts.join(" ")).not.toMatch(/SCORE|LEVEL|GAME OVER|SPACE|SHIELD/);
  });
});
