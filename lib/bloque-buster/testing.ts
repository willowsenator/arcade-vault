import { Ball } from "./entities";

export { seeded, stubContext } from "@/lib/asteroids/testing";

export function ballAt(x: number, y: number, vx: number, vy: number): Ball {
  const ball = new Ball();
  Object.assign(ball, { x, y, vx, vy });
  return ball;
}
