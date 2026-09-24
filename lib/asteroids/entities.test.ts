import { describe, expect, it } from "vitest";
import {
  Asteroid,
  Bullet,
  POINTS,
  RADII,
  Ship,
  W,
  type Input,
  wrap,
} from "./entities";
import { seeded } from "./testing";

const idle: Input = { left: false, right: false, thrust: false, shoot: false };

describe("wrap", () => {
  it("maps values back into [0, max)", () => {
    expect(wrap(-1, W)).toBe(W - 1);
    expect(wrap(W + 1, W)).toBe(1);
    expect(wrap(0, W)).toBe(0);
  });
});

describe("Asteroid", () => {
  it("splits a large rock into two medium rocks at its position", () => {
    const parts = new Asteroid(seeded(1), 100, 120, 3).split(seeded(2));
    expect(parts).toHaveLength(2);
    for (const part of parts) {
      expect(part.size).toBe(2);
      expect(part.x).toBe(100);
      expect(part.y).toBe(120);
      expect(part.radius).toBe(RADII[2]);
    }
  });

  it("does not split the smallest rock", () => {
    expect(new Asteroid(seeded(1), 10, 10, 1).split(seeded(2))).toEqual([]);
  });

  it("awards more points for smaller rocks", () => {
    expect(POINTS[1]).toBeGreaterThan(POINTS[2]);
    expect(POINTS[2]).toBeGreaterThan(POINTS[3]);
  });

  it("reappears on the opposite edge after crossing one", () => {
    const rock = new Asteroid(seeded(3), W - 0.1, 10, 1);
    rock.vx = 100;
    rock.vy = 0;
    rock.update(0.01);
    expect(rock.x).toBeGreaterThanOrEqual(0);
    expect(rock.x).toBeLessThan(5);
  });
});

describe("Bullet", () => {
  it("wraps across the edge and expires after its time to live", () => {
    const bullet = new Bullet(W - 1, 10, 0);
    bullet.update(0.01);
    expect(bullet.x).toBeLessThan(10);
    bullet.update(1.2);
    expect(bullet.dead).toBe(true);
  });

  it("remains alive just before its lifetime ends, then expires", () => {
    const bullet = new Bullet(10, 10, 0);
    bullet.update(1);
    expect(bullet.dead).toBe(false);
    bullet.update(0.101);
    expect(bullet.dead).toBe(true);
  });
});

describe("Ship", () => {
  it("fires one bullet, then none while the cooldown runs", () => {
    const ship = new Ship();
    expect(ship.tryShoot()).toHaveLength(1);
    expect(ship.tryShoot()).toHaveLength(0);
  });

  it("fires again when its cooldown expires, but not just before", () => {
    const ship = new Ship();
    ship.tryShoot();
    ship.update(0.199, idle);
    expect(ship.tryShoot()).toHaveLength(0);
    ship.update(0.002, idle);
    expect(ship.tryShoot()).toHaveLength(1);
  });

  it("fires three bullets while triple shot is active", () => {
    const ship = new Ship();
    ship.tripleShot = 5;
    expect(ship.tryShoot()).toHaveLength(3);
  });

  it("reverts from triple shot after its timer expires", () => {
    const ship = new Ship();
    ship.tripleShot = 0.001;
    expect(ship.tryShoot()).toHaveLength(3);
    ship.shootCooldown = 0;
    ship.update(0.001, idle);
    expect(ship.tryShoot()).toHaveLength(1);
  });

  it("does not fire once dead", () => {
    const ship = new Ship();
    ship.dead = true;
    expect(ship.tryShoot()).toHaveLength(0);
  });

  it("rotates left when the left input is held", () => {
    const ship = new Ship();
    const before = ship.angle;
    ship.update(0.1, { ...idle, left: true });
    expect(ship.angle).toBeLessThan(before);
  });

  it("clears power-ups and grants spawn invincibility on reset", () => {
    const ship = new Ship();
    ship.tripleShot = 5;
    ship.shield = 5;
    ship.invincible = 0;
    ship.reset();
    expect(ship.tripleShot).toBe(0);
    expect(ship.shield).toBe(0);
    expect(ship.invincible).toBeGreaterThan(0);
  });
});
