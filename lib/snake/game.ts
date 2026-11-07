import {
  COLS, DELTAS, FOOD_POINTS, ROWS, isOpposite, levelFor, stepInterval,
  type Cell, type Direction, type Random,
} from "./entities";

export { clampDt, MAX_DT } from "@/lib/asteroids/game";

export const START_LIVES = 1;
const START_LENGTH = 3;
const MAX_QUEUED_TURNS = 2;

export type GameState = "playing" | "gameover";
export type SnakeEvent = "food" | "levelUp" | "gameOver";
export type Stats = { score: number; lives: number; level: number };

const sameCell = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
const insideBoard = ({ x, y }: Cell) => x >= 0 && x < COLS && y >= 0 && y < ROWS;

export class SnakeGame {
  events: SnakeEvent[] = [];
  state: GameState = "playing";
  snake: Cell[];
  food: Cell;
  direction: Direction = "right";
  score = 0;
  level = 1;
  foodEaten = 0;

  private queuedTurns: Direction[] = [];
  private elapsed = 0;
  private readonly random: Random;

  constructor(random: Random = Math.random) {
    this.random = random;
    const head = { x: COLS / 2, y: ROWS / 2 };
    this.snake = Array.from({ length: START_LENGTH }, (_, i) => ({ x: head.x - i, y: head.y }));
    this.food = this.pickFood(this.freeCells());
  }

  get stats(): Stats {
    return { score: this.score, lives: START_LIVES, level: this.level };
  }

  steer(direction: Direction) {
    if (this.state === "gameover" || this.queuedTurns.length >= MAX_QUEUED_TURNS) return;
    const last = this.queuedTurns.at(-1) ?? this.direction;
    if (direction === last || isOpposite(direction, last)) return;
    this.queuedTurns.push(direction);
  }

  update(dt: number) {
    this.events = [];
    if (this.state === "gameover") return;
    this.elapsed += dt;
    while (this.state === "playing" && this.elapsed >= stepInterval(this.level)) {
      this.elapsed -= stepInterval(this.level);
      this.advance();
    }
  }

  private advance() {
    this.direction = this.queuedTurns.shift() ?? this.direction;
    const delta = DELTAS[this.direction];
    const head = { x: this.snake[0].x + delta.x, y: this.snake[0].y + delta.y };
    const grows = sameCell(head, this.food);
    const body = grows ? this.snake : this.snake.slice(0, -1);
    if (!insideBoard(head) || body.some((cell) => sameCell(cell, head))) {
      this.endGame();
      return;
    }
    this.snake.unshift(head);
    if (grows) this.eat();
    else this.snake.pop();
  }

  private eat() {
    this.score += FOOD_POINTS * this.level;
    this.foodEaten++;
    this.events.push("food");
    const level = levelFor(this.foodEaten);
    if (level > this.level) {
      this.level = level;
      this.events.push("levelUp");
    }
    const free = this.freeCells();
    if (free.length === 0) this.endGame();
    else this.food = this.pickFood(free);
  }

  private endGame() {
    this.state = "gameover";
    this.events.push("gameOver");
  }

  private freeCells(): Cell[] {
    const cells: Cell[] = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!this.snake.some((cell) => sameCell(cell, { x, y }))) cells.push({ x, y });
      }
    }
    return cells;
  }

  private pickFood(free: Cell[]): Cell {
    return free[Math.floor(this.random() * free.length)];
  }
}
