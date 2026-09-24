import { afterEach, describe, expect, it, vi } from "vitest";
import { Asteroid, Bullet, Powerup, SHIELD_RADIUS } from "./entities";
import { AsteroidsGame } from "./game";
import { drawGame } from "./render";
import { seeded, stubContext } from "./testing";

describe("drawGame", () => {
  afterEach(() => vi.restoreAllMocks());

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

  it("draws one outline per rock and one dot per bullet", () => {
    const empty = new AsteroidsGame(seeded(1));
    empty.asteroids = [];
    empty.ship.invincible = 0;
    const base = stubContext();
    drawGame(base.ctx, empty);

    const game = new AsteroidsGame(seeded(1));
    game.asteroids = [
      new Asteroid(seeded(2), 100, 100, 1),
      new Asteroid(seeded(3), 200, 200, 2),
    ];
    game.bullets = [new Bullet(300, 300, 0)];
    game.ship.invincible = 0;
    const drawn = stubContext();
    drawGame(drawn.ctx, game);

    const strokes = (calls: typeof drawn.calls) => calls.filter((call) => call.name === "stroke").length;
    expect(strokes(drawn.calls) - strokes(base.calls)).toBe(2);
    expect(drawn.calls.filter((call) => call.name === "arc" && call.args[2] === 2)).toHaveLength(1);
  });

  it("draws a hull only for a live ship", () => {
    const game = new AsteroidsGame(seeded(1));
    game.asteroids = [];
    game.ship.invincible = 0;
    game.ship.dead = true;
    const dead = stubContext();
    drawGame(dead.ctx, game);
    game.ship.dead = false;
    const live = stubContext();
    drawGame(live.ctx, game);
    const hull = (calls: typeof live.calls) => calls.some((call) => call.name === "moveTo" && call.args[0] === 20 && call.args[1] === 0);
    expect(hull(dead.calls)).toBe(false);
    expect(hull(live.calls)).toBe(true);
  });

  it.each([
    [0.05, false],
    [0.15, true],
    [0, true],
  ])("blinks a ship hull according to invincibility %s", (invincible, visible) => {
    const game = new AsteroidsGame(seeded(1));
    game.asteroids = [];
    game.ship.invincible = invincible;
    const { ctx, calls } = stubContext();
    drawGame(ctx, game);
    expect(calls.some((call) => call.name === "moveTo" && call.args[0] === 20)).toBe(visible);
  });

  it.each([
    [1.05, false],
    [1.2, true],
    [5, true],
  ])("blinks a power-up according to remaining time %s", (ttl, visible) => {
    const game = new AsteroidsGame(seeded(1));
    game.asteroids = [];
    game.ship.invincible = 0;
    const powerup = new Powerup(seeded(2), 100, 100, "triple");
    powerup.ttl = ttl;
    game.powerups = [powerup];
    const { ctx, calls } = stubContext();
    drawGame(ctx, game);
    expect(calls.some((call) => call.name === "arc" && call.args[2] === 11)).toBe(visible);
  });

  it.each([
    [0.05, false],
    [0.15, true],
    [3, true],
  ])("blinks a shield ring according to remaining time %s", (shield, visible) => {
    const game = new AsteroidsGame(seeded(1));
    game.asteroids = [];
    game.ship.invincible = 0;
    game.ship.shield = shield;
    const { ctx, calls } = stubContext();
    drawGame(ctx, game);
    expect(calls.some((call) => call.name === "arc" && call.args[2] === SHIELD_RADIUS)).toBe(visible);
  });

  it.each([
    [true, 0.36, true],
    [true, 0.35, false],
    [false, 0.99, false],
  ])("draws the thruster flame only when thrusting and randomly selected", (thrusting, random, visible) => {
    vi.spyOn(Math, "random").mockReturnValue(random);
    const game = new AsteroidsGame(seeded(1));
    game.asteroids = [];
    game.ship.invincible = 0;
    game.ship.thrusting = thrusting;
    const { ctx, calls } = stubContext();
    drawGame(ctx, game);
    expect(calls.some((call) => call.name === "strokeStyle" && call.args[0] === "rgba(255, 130, 0, 0.85)")).toBe(visible);
  });
});
