import { describe, expect, it } from "vitest";
import { clampDt as asteroidsClampDt, MAX_DT as ASTEROIDS_MAX_DT } from "@/lib/asteroids/game";
import { paddleBounce } from "./entities";
import { BloqueBusterGame, BREAK_TIME, START_LIVES, clampDt, MAX_DT } from "./game";
import { ballAt, seeded } from "./testing";

const idle = { left: false, right: false };
const right = { left: false, right: true };

describe("BloqueBusterGame events", () => {
  it("reports a brick hit and clears it on the next quiet update", () => {
    const game = new BloqueBusterGame(seeded(1));
    const brick = game.bricks[0];
    game.ball = ballAt(brick.x + 34, brick.y + 25, 0, -240);
    game.update(0, idle);
    expect(game.events).toEqual(["brick"]);
    game.ball = ballAt(320, 300, 0, -240);
    game.update(0, idle);
    expect(game.events).toEqual([]);
  });

  it("reports a paddle bounce", () => {
    const game = new BloqueBusterGame(seeded(1));
    game.ball = ballAt(game.paddle.x + 40, 450, 0, 240);
    game.update(0, idle);
    expect(game.events).toEqual(["paddle"]);
  });

  it.each([2, 1])("reports life loss with %i lives remaining before loss", (lives) => {
    const game = new BloqueBusterGame(seeded(1));
    game.lives = lives;
    loseLife(game);
    expect(game.events).toEqual([lives === 1 ? "lastLife" : "lifeLost"]);
  });

  it("clears the last-life event during breaking and gameover", () => {
    const game = new BloqueBusterGame(seeded(1));
    game.lives = 1;
    loseLife(game);
    expect(game.events).toEqual(["lastLife"]);
    game.update(0, idle);
    expect(game.events).toEqual([]);
    game.update(BREAK_TIME, idle);
    game.events = ["lastLife"];
    game.update(0, idle);
    expect(game.events).toEqual([]);
  });

  it("reports the final brick before the level clear", () => {
    const game = new BloqueBusterGame(seeded(1));
    game.bricks.forEach((brick, i) => { brick.destroyed = i !== 31; });
    game.ball = ballAt(586, 149, 0, -240);
    game.update(0, idle);
    expect(game.events).toEqual(["brick", "levelUp"]);
  });
});

function loseLife(game: BloqueBusterGame) {
  game.ball = ballAt(100, 461, 0, 240);
  game.update(0, idle);
}

describe("BloqueBusterGame", () => {
  it("starts with three lives and a full wall and shares frame helpers", () => {
    const game = new BloqueBusterGame(seeded(1));
    expect(game.stats).toEqual({ score: 0, lives: 3, level: 1 });
    expect(game.state).toBe("playing");
    expect(game.bricks).toHaveLength(32);
    expect(START_LIVES).toBe(3);
    expect(BREAK_TIME).toBe(0.6);
    expect(clampDt).toBe(asteroidsClampDt);
    expect(MAX_DT).toBe(ASTEROIDS_MAX_DT);
  });

  it("moves by 20 units in 0.05 seconds and centres on the pointer", () => {
    const game = new BloqueBusterGame(seeded(1));
    game.update(0.05, right);
    expect(game.paddle.x).toBe(300);
    game.pointerTo(100);
    expect(game.paddle.x).toBe(60);
    game.update(0.05, { left: true, right: true });
    expect(game.paddle.x).toBe(60);
  });

  it.each([[0, 40], [3, 10]])("scores row %s and reflects a hit from below", (row, points) => {
    const game = new BloqueBusterGame(seeded(1));
    const brick = game.bricks[row * 8];
    game.ball = ballAt(brick.x + 34, brick.y + 25, 0, -240);
    game.update(0, idle);
    expect(brick.destroyed).toBe(true);
    expect(game.bricks.filter((b) => b.destroyed)).toHaveLength(1);
    expect(game.score).toBe(points);
    expect(game.ball.vy).toBe(240);
  });

  it("destroys only the first brick when two corners overlap the ball", () => {
    const game = new BloqueBusterGame(seeded(1));
    game.ball = ballAt(92, 62, 0, -240);
    game.update(0, idle);
    expect(game.bricks.filter((b) => b.destroyed)).toHaveLength(1);
    expect(game.bricks[0].destroyed).toBe(true);
    expect(game.bricks[1].destroyed).toBe(false);
    expect(game.score).toBe(40);
  });

  it("pushes a side contact above the paddle without bouncing again", () => {
    const game = new BloqueBusterGame(seeded(1));
    game.ball = ballAt(game.paddle.x + 85, 453, 0, 240);
    game.update(0, idle);
    expect(game.ball.vy).toBeLessThan(0);
    expect(game.ball.y).toBe(444);
    const velocity = { vx: game.ball.vx, vy: game.ball.vy };
    game.ball.x = game.paddle.x + game.paddle.width / 2;
    game.ball.y = game.paddle.y - 6;
    game.update(0, idle);
    expect({ vx: game.ball.vx, vy: game.ball.vy }).toEqual(velocity);
    expect(game.ball.y).toBe(444);
  });

  it.each([0, -20])("catches a ball moving vertically at %s when the paddle sweeps into its side", (vy) => {
    const game = new BloqueBusterGame(seeded(1));
    game.ball = ballAt(375, 453, 0, vy);
    game.update(0.05, right);
    expect(game.ball.y).toBe(444);
    expect(game.ball.vy).toBeLessThan(0);
  });

  it("preserves speed through 20 bounces, including offsets beyond the edge", () => {
    const game = new BloqueBusterGame(seeded(1));
    for (let i = 0; i < 20; i++) {
      const offset = -1.5 + i * 3 / 19;
      const hitX = game.paddle.x + 40 + offset * 40;
      const bounce = paddleBounce(hitX, game.paddle, 240);
      expect(Math.abs(Math.hypot(bounce.vx, bounce.vy) - 240)).toBeLessThanOrEqual(1e-9);
      // The circle can contact up to its radius past either paddle edge.
      const contactX = game.paddle.x + 40 + Math.max(-1.1, Math.min(1.1, offset)) * 40;
      game.ball = ballAt(contactX, 450, bounce.vx, -bounce.vy);
      game.update(0, idle);
      expect(game.ball.vy).toBeLessThan(0);
      expect(Math.abs(Math.hypot(game.ball.vx, game.ball.vy) - 240)).toBeLessThanOrEqual(1e-9);
    }
  });

  it("increases the minimum life penalty with each loss and relaunches", () => {
    const game = new BloqueBusterGame(() => 0);
    game.score = 100;
    loseLife(game);
    expect(game.stats).toEqual({ score: 90, lives: 2, level: 1 });
    expect([game.ball.x, game.ball.y, game.ball.vx, game.ball.vy]).toEqual([320, 444, 0, -240]);
    loseLife(game);
    expect(game.score).toBe(70);
    expect(game.livesLost).toBe(2);
  });

  it("uses the inclusive maximum penalty without going below zero", () => {
    const game = new BloqueBusterGame(() => 0.999999);
    game.score = 100;
    loseLife(game);
    expect(game.score).toBe(70);
    game.score = 5;
    loseLife(game);
    expect(game.score).toBe(0);
  });

  it("breaks into four moving fragments for 0.6 seconds and then freezes", () => {
    const game = new BloqueBusterGame(seeded(1));
    game.lives = 1;
    loseLife(game);
    expect(game.state).toBe("breaking");
    expect(game.paddle.broken).toBe(true);
    expect(game.fragments).toHaveLength(4);
    expect(game.fragments.map((f) => f.vx)).toEqual([-90, -30, 30, 90]);
    expect(game.fragments.every((f) => f.vy === -100 && f.width === 20 && f.height === 10)).toBe(true);
    const paddleX = game.paddle.x;
    const ball = { ...game.ball };
    game.pointerTo(0);
    game.update(0.3, right);
    expect(game.state).toBe("breaking");
    expect(game.fragments[0].y).toBe(420);
    game.update(0.3, right);
    expect(game.state).toBe("gameover");
    expect(game.fragments[0].y).toBe(390);
    const fragments = game.fragments.map((f) => ({ ...f }));
    game.pointerTo(640);
    game.update(1, right);
    expect(game.paddle.x).toBe(paddleX);
    expect({ ...game.ball }).toEqual(ball);
    expect(game.fragments).toEqual(fragments);
  });

  it("rebuilds a cleared wall while carrying score and lives and relaunching", () => {
    const game = new BloqueBusterGame(seeded(1));
    game.score = 120;
    game.lives = 2;
    game.bricks.forEach((b) => { b.destroyed = true; });
    game.update(0, idle);
    expect(game.stats).toEqual({ score: 120, lives: 2, level: 2 });
    expect(game.bricks).toHaveLength(32);
    expect(game.bricks.every((b) => !b.destroyed)).toBe(true);
    expect([game.ball.x, game.ball.y, game.ball.vx, game.ball.vy]).toEqual([320, 444, 0, -240]);
  });

  it("awards the final brick's points before advancing the level", () => {
    const game = new BloqueBusterGame(seeded(1));
    game.bricks.forEach((b, i) => { b.destroyed = i !== 31; });
    game.ball = ballAt(586, 149, 0, -240);
    game.update(0, idle);
    expect(game.stats).toEqual({ score: 10, lives: 3, level: 2 });
    expect(game.bricks.filter((b) => !b.destroyed)).toHaveLength(32);
    expect([game.ball.x, game.ball.y, game.ball.vx, game.ball.vy]).toEqual([320, 444, 0, -240]);
  });
});
