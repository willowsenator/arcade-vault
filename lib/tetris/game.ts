import { COLS, PIECES, collides, emptyBoard, rotate, type Matrix, type Random } from "./entities";

export { clampDt, MAX_DT } from "@/lib/asteroids/game";

export const START_LIVES = 1;
export const LINE_SCORES = [0, 100, 300, 500, 800] as const;

export function fallIntervalMs(level: number): number {
  return Math.max(100, 1000 - 90 * (level - 1));
}

export type TetrisEvent = "rotate" | "lock" | "lines" | "tetris" | "levelUp" | "gameOver";
export type GameState = "playing" | "gameover";
export type Stats = { score: number; lives: number; level: number };
export type Input = { left: boolean; right: boolean; rotate: boolean; softDrop: boolean; hardDrop: boolean };
export type ActivePiece = { type: number; shape: Matrix; x: number; y: number };

export class TetrisGame {
  events: TetrisEvent[] = [];
  state: GameState = "playing";
  board: Matrix = emptyBoard();
  piece: ActivePiece;
  next: ActivePiece;
  score = 0;
  level = 1;
  lines = 0;

  private fallElapsedMs = 0;

  constructor(private readonly random: Random = Math.random) {
    this.piece = this.createPiece();
    this.next = this.createPiece();
  }

  get stats(): Stats {
    return { score: this.score, lives: START_LIVES, level: this.level };
  }

  ghostY(): number {
    let y = this.piece.y;
    while (!collides(this.board, this.piece.shape, this.piece.x, y + 1)) y++;
    return y;
  }

  update(dt: number, input: Input): void {
    this.events = [];
    if (this.state === "gameover") return;

    if (input.left) this.moveSideways(-1);
    if (input.right) this.moveSideways(1);
    if (input.rotate) this.rotatePiece();
    if (input.hardDrop) {
      const y = this.ghostY();
      this.score += 2 * (y - this.piece.y);
      this.piece.y = y;
      this.lockPiece();
      return;
    }
    if (input.softDrop) {
      if (this.moveDown() === "locked") return;
      this.score++;
    }

    this.fallElapsedMs += dt * 1000;
    if (this.fallElapsedMs >= fallIntervalMs(this.level)) {
      this.fallElapsedMs = 0;
      this.moveDown();
    }
  }

  private createPiece(): ActivePiece {
    const type = Math.floor(this.random() * PIECES.length) + 1;
    const shape = PIECES[type - 1].map((row) => [...row]);
    return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
  }

  private moveSideways(offset: number): void {
    if (!collides(this.board, this.piece.shape, this.piece.x + offset, this.piece.y)) {
      this.piece.x += offset;
    }
  }

  private rotatePiece(): void {
    const shape = rotate(this.piece.shape);
    for (const offset of [0, -1, 1, -2, 2]) {
      if (!collides(this.board, shape, this.piece.x + offset, this.piece.y)) {
        this.piece.shape = shape;
        this.piece.x += offset;
        this.events.push("rotate");
        return;
      }
    }
  }

  /** Drops the piece one row, or locks it where it rests when the row below is blocked. */
  private moveDown(): "moved" | "locked" {
    if (collides(this.board, this.piece.shape, this.piece.x, this.piece.y + 1)) {
      this.lockPiece();
      return "locked";
    }
    this.piece.y++;
    return "moved";
  }

  private lockPiece(): void {
    this.piece.shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell !== 0) this.board[this.piece.y + y][this.piece.x + x] = this.piece.type;
      });
    });
    this.events.push("lock");
    this.fallElapsedMs = 0;

    const remaining = this.board.filter((row) => row.some((cell) => cell === 0));
    const cleared = this.board.length - remaining.length;
    this.board = [
      ...Array.from({ length: cleared }, () => Array<number>(COLS).fill(0)),
      ...remaining,
    ];
    if (cleared > 0) {
      this.lines += cleared;
      this.score += LINE_SCORES[cleared] * this.level;
      this.events.push(cleared === 4 ? "tetris" : "lines");
      const level = 1 + Math.floor(this.lines / 10);
      if (level > this.level) this.events.push("levelUp");
      this.level = level;
    }

    this.piece = this.next;
    this.next = this.createPiece();
    if (collides(this.board, this.piece.shape, this.piece.x, this.piece.y)) {
      this.state = "gameover";
      this.events.push("gameOver");
    }
  }
}
