import { describe, expect, it } from "vitest";
import { Ball, Paddle, circleRectHit, createWall, paddleBounce, reflect } from "./entities";
import { ballAt } from "./testing";

describe("brick breaker geometry", () => {
  it("builds the 4 by 8 wall", () => {
    const wall = createWall();
    expect(wall).toHaveLength(32);
    expect(wall[0]).toEqual({ x: 20, y: 40, width: 68, height: 20, row: 0, destroyed: false });
    expect(wall[31]).toEqual({ x: 552, y: 124, width: 68, height: 20, row: 3, destroyed: false });
  });

  it("centres, moves, clamps and resets the paddle", () => {
    const paddle = new Paddle();
    expect([paddle.x, paddle.y, paddle.width, paddle.height, paddle.broken]).toEqual([280, 450, 80, 10, false]);
    paddle.setX(-50);
    expect(paddle.x).toBe(0);
    paddle.setX(9999);
    expect(paddle.x).toBe(560);
    paddle.setCentre(320);
    expect(paddle.x).toBe(280);
    paddle.moveBy(20);
    expect(paddle.x).toBe(300);
    paddle.broken = true;
    paddle.reset();
    expect(paddle.x).toBe(280);
    expect(paddle.broken).toBe(false);
  });

  it("reflects and corrects wall penetration", () => {
    const left = ballAt(3, 100, -240, 0);
    left.bounceOffWalls();
    expect([left.x, left.vx]).toEqual([6, 240]);
    const right = ballAt(637, 100, 240, 0);
    right.bounceOffWalls();
    expect([right.x, right.vx]).toEqual([634, -240]);
    const top = ballAt(100, 3, 0, -240);
    top.bounceOffWalls();
    expect(top.y).toBe(6);
    expect(top.vy).toBeGreaterThan(0);
    left.bounceOffWalls();
    expect(left.vx).toBe(240);
  });

  it("keeps paddle bounce speed constant even beyond its edge", () => {
    const paddle = new Paddle();
    expect(paddleBounce(320, paddle, 240)).toEqual({ vx: 0, vy: -240 });
    for (const [x, vx] of [[360, 180], [400, 180], [280, -180], [240, -180]]) {
      const velocity = paddleBounce(x, paddle, 240);
      expect(velocity.vx).toBe(vx);
      expect(Math.abs(Math.hypot(velocity.vx, velocity.vy) - 240)).toBeLessThanOrEqual(1e-9);
    }
  });

  it("detects contact sides and rejects clear circles and corners", () => {
    const rect = { x: 20, y: 40, width: 68, height: 20 };
    expect(circleRectHit({ x: 40, y: 35, radius: 6 }, rect)).toBe("top");
    expect(circleRectHit({ x: 15, y: 50, radius: 6 }, rect)).toBe("left");
    expect(circleRectHit({ x: 40, y: 65, radius: 6 }, rect)).toBe("bottom");
    expect(circleRectHit({ x: 93, y: 50, radius: 6 }, rect)).toBe("right");
    expect(circleRectHit({ x: 100, y: 100, radius: 6 }, rect)).toBeNull();
    expect(circleRectHit({ x: 15, y: 35, radius: 6 }, rect)).toBeNull();
    expect(reflect(10, 20, "top")).toEqual({ vx: 10, vy: -20 });
    expect(reflect(10, 20, "left")).toEqual({ vx: -10, vy: 20 });
  });

  it("launches from the paddle and integrates velocity", () => {
    const paddle = new Paddle();
    paddle.setX(100);
    const ball = new Ball();
    ball.launchFrom(paddle);
    expect([ball.x, ball.y, ball.vx, ball.vy, ball.radius]).toEqual([140, 444, 0, -240, 6]);
    ball.update(0.05);
    expect(ball.y).toBe(432);
  });
});
