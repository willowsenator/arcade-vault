export const W = 640;
export const H = 480;
export const BALL_SPEED = 240;
export const BALL_RADIUS = 6;
export const PADDLE_WIDTH = 80;
export const PADDLE_HEIGHT = 10;
export const PADDLE_SPEED = 400;
export const ROW_POINTS = [40, 30, 20, 10] as const;
export const BRICK = { rows: 4, cols: 8, width: 68, height: 20, padding: 8, top: 40, left: 20 } as const;

export type Random = () => number;
export type Rect = { x: number; y: number; width: number; height: number };
export type Side = "top" | "bottom" | "left" | "right";
export type Input = { left: boolean; right: boolean };
export type Brick = Rect & { row: number; destroyed: boolean };

export const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export function circleRectHit(c: { x: number; y: number; radius: number }, r: Rect): Side | null {
  const closestX = clamp(c.x, r.x, r.x + r.width);
  const closestY = clamp(c.y, r.y, r.y + r.height);
  if (Math.hypot(c.x - closestX, c.y - closestY) > c.radius) return null;

  const dx = c.x - (r.x + r.width / 2);
  const dy = c.y - (r.y + r.height / 2);
  const overlapX = r.width / 2 + c.radius - Math.abs(dx);
  const overlapY = r.height / 2 + c.radius - Math.abs(dy);
  if (overlapX < overlapY) return dx < 0 ? "left" : "right";
  return dy < 0 ? "top" : "bottom";
}

export function reflect(vx: number, vy: number, side: Side): { vx: number; vy: number } {
  return side === "left" || side === "right" ? { vx: -vx, vy } : { vx, vy: -vy };
}

export function paddleBounce(hitX: number, paddle: Rect, speed: number): { vx: number; vy: number } {
  const offset = clamp((hitX - paddle.x - paddle.width / 2) / (paddle.width / 2), -1, 1);
  const vx = offset * speed * 0.75;
  return { vx, vy: -Math.sqrt(speed * speed - vx * vx) };
}

export class Paddle implements Rect {
  x = (W - PADDLE_WIDTH) / 2;
  y = H - 30;
  width = PADDLE_WIDTH;
  height = PADDLE_HEIGHT;
  broken = false;

  reset() {
    this.setCentre(W / 2);
    this.broken = false;
  }

  setX(x: number) { this.x = clamp(x, 0, W - this.width); }
  setCentre(x: number) { this.setX(x - this.width / 2); }
  moveBy(dx: number) { this.setX(this.x + dx); }
}

export class Ball {
  x = W / 2;
  y = H - 30 - BALL_RADIUS;
  vx = 0;
  vy = -BALL_SPEED;
  readonly radius = BALL_RADIUS;

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  bounceOffWalls() {
    if (this.x < this.radius) {
      this.x = this.radius;
      this.vx = Math.abs(this.vx);
    } else if (this.x > W - this.radius) {
      this.x = W - this.radius;
      this.vx = -Math.abs(this.vx);
    }
    if (this.y < this.radius) {
      this.y = this.radius;
      this.vy = Math.abs(this.vy);
    }
  }

  launchFrom(paddle: Paddle) {
    this.x = paddle.x + paddle.width / 2;
    this.y = paddle.y - this.radius;
    this.vx = 0;
    this.vy = -BALL_SPEED;
  }
}

export function createWall(): Brick[] {
  return Array.from({ length: BRICK.rows * BRICK.cols }, (_, index) => {
    const row = Math.floor(index / BRICK.cols);
    return {
      x: BRICK.left + (index % BRICK.cols) * (BRICK.width + BRICK.padding),
      y: BRICK.top + row * (BRICK.height + BRICK.padding),
      width: BRICK.width,
      height: BRICK.height,
      row,
      destroyed: false,
    };
  });
}
