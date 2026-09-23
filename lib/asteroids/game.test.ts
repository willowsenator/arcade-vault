import { describe, expect, it } from "vitest";
import {
  Asteroid,
  Bullet,
  H,
  POINTS,
  Powerup,
  SHIELD_TIME,
  TRIPLE_TIME,
  W,
  type AsteroidSize,
  type Input,
} from "./entities";
import { AsteroidsGame, MAX_DT, START_LIVES, clampDt } from "./game";
import { seeded } from "./testing";

const idle: Input = { left: false, right: false, thrust: false, shoot: false };
const TICK = 0.001;

// A far-away bystander keeps the level from clearing when the test rock dies.
function gameWith(...rocks: Asteroid[]) {
  const game = new AsteroidsGame(seeded(7));
  game.asteroids = [...rocks, new Asteroid(seeded(9), 700, 500, 3)];
  game.ship.invincible = 0;
  return game;
}

const rockOnShip = (size: AsteroidSize = 3) =>
  new Asteroid(seeded(4), W / 2, H / 2, size);

describe("clampDt", () => {
  it("caps long stalls and rejects negative time", () => {
    expect(clampDt(5)).toBe(MAX_DT);
    expect(clampDt(-1)).toBe(0);
    expect(clampDt(0.01)).toBe(0.01);
  });
});

describe("AsteroidsGame", () => {
  it("starts a fresh game with full lives at level 1", () => {
    const game = new AsteroidsGame(seeded(1));
    expect(game.stats).toEqual({ score: 0, lives: START_LIVES, level: 1 });
    expect(game.state).toBe("playing");
    expect(game.asteroids.length).toBeGreaterThan(0);
  });

  it.each([3, 2, 1] as AsteroidSize[])("scores a size-%i rock on a bullet hit", (size) => {
    const game = gameWith(new Asteroid(seeded(5), 100, 100, size));
    game.bullets = [new Bullet(100, 100, 0)];
    game.update(TICK, idle);
    expect(game.score).toBe(POINTS[size]);
  });

  it("splits a large rock into two medium rocks when shot", () => {
    const game = gameWith(new Asteroid(seeded(5), 100, 100, 3));
    game.bullets = [new Bullet(100, 100, 0)];
    game.update(TICK, idle);
    expect(game.asteroids.filter((a) => a.size === 2)).toHaveLength(2);
  });

  it("fires a bullet when shoot is pressed", () => {
    const game = gameWith();
    game.update(TICK, { ...idle, shoot: true });
    expect(game.bullets).toHaveLength(1);
  });

  it("loses a life on collision, then respawns after the death timer", () => {
    const game = gameWith(rockOnShip());
    game.update(TICK, idle);
    expect(game.lives).toBe(START_LIVES - 1);
    expect(game.state).toBe("dead");

    game.update(2.1, idle);
    expect(game.state).toBe("playing");
    expect(game.ship.dead).toBe(false);
    expect(game.ship.invincible).toBeGreaterThan(0);
  });

  it("ends the game on the last life and never restarts by itself", () => {
    const game = gameWith(rockOnShip());
    game.lives = 1;
    game.update(TICK, idle);
    expect(game.state).toBe("gameover");

    game.update(1, { ...idle, shoot: true });
    expect(game.state).toBe("gameover");
    expect(game.lives).toBe(0);
  });

  it("does not carry a power-up into the respawned life", () => {
    const game = gameWith(rockOnShip());
    game.ship.tripleShot = TRIPLE_TIME;
    game.update(TICK, idle);
    game.update(2.1, idle);
    expect(game.ship.tripleShot).toBe(0);
  });

  it("alternates power-up types on every drop", () => {
    const game = new AsteroidsGame(seeded(2));
    const first = game.nextPowerupType();
    const second = game.nextPowerupType();
    expect(second).not.toBe(first);
    expect(game.nextPowerupType()).toBe(first);
  });

  it("lets a shield absorb an asteroid instead of killing the ship", () => {
    const game = gameWith(rockOnShip());
    game.ship.shield = SHIELD_TIME;
    game.update(TICK, idle);

    expect(game.lives).toBe(START_LIVES);
    expect(game.state).toBe("playing");
    expect(game.score).toBe(POINTS[3]);
    expect(game.ship.shield).toBeGreaterThan(0);
    // fragments born this frame are not re-evaluated against the shield
    expect(game.asteroids.filter((a) => a.size === 2)).toHaveLength(2);
  });

  it.each([
    ["shield", "shield"],
    ["triple", "tripleShot"],
  ] as const)("picks up a %s power-up on contact", (type, field) => {
    const game = gameWith();
    game.powerups = [new Powerup(seeded(6), W / 2, H / 2, type)];
    game.update(TICK, idle);
    expect(game.powerups).toHaveLength(0);
    expect(game.ship[field]).toBeGreaterThan(0);
  });

  it("advances to the next level with a fresh field when the last rock dies", () => {
    const game = new AsteroidsGame(seeded(8));
    game.asteroids = [new Asteroid(seeded(5), 100, 100, 1)];
    game.bullets = [new Bullet(100, 100, 0)];
    game.update(TICK, idle);
    expect(game.level).toBe(2);
    expect(game.asteroids.length).toBeGreaterThan(0);
    expect(game.bullets).toHaveLength(0);
  });

  it("keeps a spawn-invincible ship alive when a rock touches it", () => {
    const game = gameWith(rockOnShip());
    game.ship.invincible = 3;
    game.update(TICK, idle);
    expect(game.lives).toBe(START_LIVES);
    expect(game.state).toBe("playing");
  });

  it("makes the ship vulnerable as soon as spawn invincibility runs out", () => {
    const game = gameWith(rockOnShip());
    game.ship.invincible = TICK; // decrements to exactly 0, the boundary case
    game.update(TICK, idle);
    expect(game.lives).toBe(START_LIVES - 1);
    expect(game.state).toBe("dead");
  });

  it("picks up a power-up while spawn-invincible", () => {
    const game = gameWith();
    game.ship.invincible = 3;
    game.powerups = [new Powerup(seeded(6), W / 2, H / 2, "shield")];
    game.update(TICK, idle);
    expect(game.ship.shield).toBeGreaterThan(0);
  });

  it("stays dead until the death timer runs out", () => {
    const game = gameWith(rockOnShip());
    game.update(TICK, idle);
    game.update(1.9, idle);
    expect(game.state).toBe("dead");
    game.update(0.2, idle);
    expect(game.state).toBe("playing");
  });
});
