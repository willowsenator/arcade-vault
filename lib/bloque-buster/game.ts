import {
  BALL_SPEED, Ball, Paddle, PADDLE_SPEED, ROW_POINTS,
  circleRectHit, createWall, paddleBounce, reflect,
  type Input, type Random, type Rect,
} from "./entities";

export { clampDt, MAX_DT } from "@/lib/asteroids/game";

export const START_LIVES = 3;
export const BREAK_TIME = 0.6;
const LIFE_PENALTY_FLOOR = 10;
const LIFE_PENALTY_RANGE = 20;
const LIFE_PENALTY_GROWTH = 10;
const FRAGMENT_SPREAD_FACTOR = 3;
const FRAGMENT_RISE_VELOCITY = -100;
const FRAGMENT_COUNT = 4;

export type GameState = "playing" | "breaking" | "gameover";
export type Stats = { score: number; lives: number; level: number };
export type Fragment = Rect & { vx: number; vy: number };

export class BloqueBusterGame {
  paddle = new Paddle();
  ball = new Ball();
  bricks = createWall();
  fragments: Fragment[] = [];
  score = 0;
  lives = START_LIVES;
  level = 1;
  livesLost = 0;
  state: GameState = "playing";

  private breakTimer = 0;
  private readonly random: Random;

  constructor(random: Random = Math.random) {
    this.random = random;
    this.ball.launchFrom(this.paddle);
  }

  get stats(): Stats {
    return { score: this.score, lives: this.lives, level: this.level };
  }

  pointerTo(x: number) {
    if (this.state === "playing") this.paddle.setCentre(x);
  }

  update(dt: number, input: Input) {
    if (this.state === "gameover") return;
    if (this.state === "breaking") {
      this.updateBreaking(dt);
      return;
    }

    this.paddle.moveBy((Number(input.right) - Number(input.left)) * PADDLE_SPEED * dt);
    this.ball.update(dt);
    this.ball.bounceOffWalls();
    if (this.ball.y > this.paddle.y + this.paddle.height) {
      this.loseLife();
      return;
    }

    // Bounce downward motion or side contact swept into by the paddle, but not a ball already leaving upward.
    const entersPaddle = this.ball.vy >= 0 || this.ball.y > this.paddle.y - this.ball.radius;
    if (entersPaddle && circleRectHit(this.ball, this.paddle)) {
      Object.assign(this.ball, paddleBounce(this.ball.x, this.paddle, BALL_SPEED));
      this.ball.y = this.paddle.y - this.ball.radius;
    }

    this.hitBrick();
    if (this.bricks.every((brick) => brick.destroyed)) {
      this.level++;
      this.bricks = createWall();
      this.ball.launchFrom(this.paddle);
    }
  }

  private hitBrick() {
    for (const brick of this.bricks) {
      if (brick.destroyed) continue;
      const side = circleRectHit(this.ball, brick);
      if (!side) continue;
      brick.destroyed = true;
      this.score += ROW_POINTS[brick.row];
      Object.assign(this.ball, reflect(this.ball.vx, this.ball.vy, side));
      break;
    }
  }

  private loseLife() {
    this.score = Math.max(0, this.score - this.lifePenalty());
    this.livesLost++;
    this.lives--;
    if (this.lives > 0) {
      this.ball.launchFrom(this.paddle);
    } else {
      this.breakPaddle();
    }
  }

  private lifePenalty(): number {
    const min = LIFE_PENALTY_FLOOR + LIFE_PENALTY_GROWTH * this.livesLost;
    return min + Math.floor(this.random() * (LIFE_PENALTY_RANGE + 1));
  }

  private breakPaddle() {
    this.state = "breaking";
    this.breakTimer = BREAK_TIME;
    this.paddle.broken = true;
    const width = this.paddle.width / FRAGMENT_COUNT;
    this.fragments = Array.from({ length: FRAGMENT_COUNT }, (_, index) => {
      const x = this.paddle.x + index * width;
      return {
        x, y: this.paddle.y, width, height: this.paddle.height,
        vx: FRAGMENT_SPREAD_FACTOR * (x + width / 2 - this.paddle.x - this.paddle.width / 2),
        vy: FRAGMENT_RISE_VELOCITY,
      };
    });
  }

  private updateBreaking(dt: number) {
    for (const fragment of this.fragments) {
      fragment.x += fragment.vx * dt;
      fragment.y += fragment.vy * dt;
    }
    this.breakTimer -= dt;
    if (this.breakTimer <= 0) this.state = "gameover";
  }
}
