import { describe, expect, it } from "vitest";
import { COLS, ROWS, PIECES, emptyBoard, rotate } from "./entities";
import { seeded } from "./testing";
import { TetrisGame, START_LIVES, LINE_SCORES, fallIntervalMs, type Input } from "./game";

const idle: Input = { left: false, right: false, rotate: false, softDrop: false, hardDrop: false };
const createGame = () => new TetrisGame(seeded(42));

function prepareClear(count: number, level = 1) {
  const game = createGame();
  game.level = level;
  game.lines = (level - 1) * 10;
  for (let y = ROWS - count; y < ROWS; y++) {
    game.board[y] = Array<number>(COLS).fill(7);
    game.board[y][4] = 0;
  }
  game.piece = { type: 1, shape: [[1], [1], [1], [1]], x: 4, y: ROWS - 4 };
  return game;
}

function finishGame(game: TetrisGame) {
  game.next = { type: 2, shape: [[2, 2], [2, 2]], x: 4, y: 0 };
  game.board[0][4] = 7;
  game.piece = { type: 2, shape: [[2, 2], [2, 2]], x: 0, y: ROWS - 2 };
  game.update(0, { ...idle, softDrop: true });
}

describe("Tetris game rules", () => {
  it("selects the first and last pieces at the random boundaries", () => {
    expect(new TetrisGame(() => 0).piece.type).toBe(1);
    expect(new TetrisGame(() => 0.999999).piece.type).toBe(PIECES.length);
  });

  it("shifts surviving rows down after clearing two adjacent rows", () => {
    const game = prepareClear(2);
    game.board[17][0] = 3;
    game.update(0, { ...idle, softDrop: true });
    expect(game.board[18]).toEqual([0, 0, 0, 0, 1, 0, 0, 0, 0, 0]);
    expect(game.board[19]).toEqual([3, 0, 0, 0, 1, 0, 0, 0, 0, 0]);
    expect(game.board.slice(0, 18)).toEqual(emptyBoard().slice(0, 18));
  });

  it("clears non-adjacent rows while preserving the row between them", () => {
    const game = createGame();
    for (const y of [17, 19]) {
      game.board[y].fill(7);
      game.board[y][4] = 0;
    }
    game.board[18][0] = 5;
    game.piece = { type: 1, shape: [[1], [1], [1], [1]], x: 4, y: 16 };
    game.update(0, { ...idle, softDrop: true });
    expect(game.board[19]).toEqual([5, 0, 0, 0, 1, 0, 0, 0, 0, 0]);
    expect(game.board[18]).toEqual([0, 0, 0, 0, 1, 0, 0, 0, 0, 0]);
    expect(game.score).toBe(300);
    expect(game.events).toEqual(["lock", "lines"]);
  });

  it("ends on spawn collision after a hard drop and clears events on later updates", () => {
    const game = createGame();
    game.next = { type: 2, shape: [[2, 2], [2, 2]], x: 4, y: 0 };
    game.board[0][4] = 7;
    game.piece = { type: 2, shape: [[2, 2], [2, 2]], x: 0, y: ROWS - 2 };
    game.update(0, { ...idle, hardDrop: true });
    expect(game.events).toEqual(["lock", "gameOver"]);
    expect(game.state).toBe("gameover");
    const board = structuredClone(game.board);
    game.update(1, { ...idle, hardDrop: true });
    expect(game.events).toEqual([]);
    expect(game.board).toEqual(board);
    expect(game.state).toBe("gameover");
  });

  it("keeps one life before and after game over and floors the fall interval", () => {
    const game = createGame();
    expect(START_LIVES).toBe(1);
    expect(game.stats).toEqual({ score: 0, lives: 1, level: 1 });
    finishGame(game);
    expect(game.state).toBe("gameover");
    expect(game.stats.lives).toBe(1);
    expect([1, 2, 11, 50].map(fallIntervalMs)).toEqual([1000, 910, 100, 100]);
  });

  it("starts playing with centred independent current and next tetrominoes", () => {
    const game = createGame();
    expect(game.state).toBe("playing");
    expect([game.level, game.score, game.lines]).toEqual([1, 0, 0]);
    expect(game.board).toEqual(emptyBoard());
    for (const piece of [game.piece, game.next]) {
      expect(Number.isInteger(piece.type)).toBe(true);
      expect(piece.type).toBeGreaterThanOrEqual(1);
      expect(piece.type).toBeLessThanOrEqual(7);
      expect(piece.shape).toEqual(PIECES[piece.type - 1]);
      expect(piece.x).toBe(Math.floor(COLS / 2) - Math.floor(piece.shape[0].length / 2));
      expect(piece.y).toBe(0);
      expect(piece.shape).not.toBe(PIECES[piece.type - 1]);
      piece.shape.forEach((row, i) => expect(row).not.toBe(PIECES[piece.type - 1][i]));
    }
    expect(game.piece.shape).not.toBe(game.next.shape);
  });

  it.each(["left", "right"] as const)("moves %s one column", (direction) => {
    const game = createGame();
    const x = game.piece.x;
    game.update(0, { ...idle, [direction]: true });
    expect(game.piece.x).toBe(x + (direction === "left" ? -1 : 1));
  });

  it.each(["left", "right"] as const)("blocks %s movement at the wall", (direction) => {
    const game = createGame();
    const x = direction === "left" ? 0 : COLS - 2;
    game.piece = { type: 2, shape: [[2, 2], [2, 2]], x, y: 2 };
    game.update(0, { ...idle, [direction]: true });
    expect(game.piece.x).toBe(x);
  });

  it.each(["left", "right"] as const)("blocks %s movement into the stack", (direction) => {
    const game = createGame();
    game.piece = { type: 2, shape: [[2, 2], [2, 2]], x: 4, y: 2 };
    game.board[2][direction === "left" ? 3 : 6] = 7;
    game.update(0, { ...idle, [direction]: true });
    expect(game.piece.x).toBe(4);
  });

  it("rotates in place before trying kicks and emits rotate on that frame", () => {
    const game = createGame();
    game.piece = { type: 1, shape: [[1, 1, 1, 1]], x: 4, y: 2 };
    game.update(0, { ...idle, rotate: true });
    expect(game.piece).toEqual({ type: 1, shape: [[1], [1], [1], [1]], x: 4, y: 2 });
    expect(game.events).toEqual(["rotate"]);
    game.update(0, idle);
    expect(game.events).toEqual([]);
  });

  it("rejects a fully obstructed rotation without changing the piece or events", () => {
    const game = createGame();
    game.piece = { type: 1, shape: [[1, 1, 1, 1]], x: 4, y: 2 };
    game.board[3].fill(7);
    const before = structuredClone(game.piece);
    const shape = game.piece.shape;
    const board = structuredClone(game.board);
    game.update(0, { ...idle, rotate: true });
    expect(game.piece).toEqual(before);
    expect(game.piece.shape).toBe(shape);
    expect(game.board).toEqual(board);
    expect(game.score).toBe(0);
    expect(game.events).toEqual([]);
  });

  it.each([-1, 1, -2, 2])("rotates with only kick %i available", (offset) => {
    const game = createGame();
    game.piece = { type: 1, shape: [[1, 1, 1, 1]], x: 4, y: 2 };
    game.board[3].fill(7);
    game.board[3][4 + offset] = 0;
    game.update(0, { ...idle, rotate: true });
    expect(game.piece.x).toBe(4 + offset);
    expect(game.piece.shape).toEqual(rotate([[1, 1, 1, 1]]));
    expect(game.events).toEqual(["rotate"]);
  });

  it("prefers the earlier fitting kick when multiple offsets fit", () => {
    const game = createGame();
    game.piece = { type: 1, shape: [[1, 1, 1, 1]], x: 4, y: 2 };
    game.board[3][4] = 7;
    game.update(0, { ...idle, rotate: true });
    expect(game.piece.x).toBe(3);
  });

  it("awards one point per soft-dropped row", () => {
    const game = createGame();
    game.update(0, { ...idle, softDrop: true });
    game.update(0, { ...idle, softDrop: true });
    expect(game.piece.y).toBe(2);
    expect(game.score).toBe(2);
    expect(game.events).toEqual([]);
  });

  it("locks a landed soft drop without points or gravity on the new piece", () => {
    const game = createGame();
    game.piece = { type: 2, shape: [[2, 2], [2, 2]], x: 0, y: ROWS - 2 };
    const next = game.next;
    game.update(1, { ...idle, softDrop: true });
    expect(game.score).toBe(0);
    expect(game.events).toEqual(["lock"]);
    expect(game.board[ROWS - 1].slice(0, 2)).toEqual([2, 2]);
    expect(game.piece).toBe(next);
    expect(game.next).not.toBe(next);
    expect(game.piece.y).toBe(0);
  });

  it("awards two points per hard-dropped cell and stops the remaining frame", () => {
    const game = createGame();
    game.piece = { type: 2, shape: [[2, 2], [2, 2]], x: 0, y: 3 };
    game.update(1, { ...idle, hardDrop: true, softDrop: true });
    expect(game.score).toBe(2 * (ROWS - 2 - 3));
    expect(game.events).toEqual(["lock"]);
    expect(game.piece.y).toBe(0);
  });

  it("hard drops an already landed piece for zero points and exactly one lock", () => {
    const game = createGame();
    game.piece = { type: 2, shape: [[2, 2], [2, 2]], x: 0, y: ROWS - 2 };
    game.update(0, { ...idle, hardDrop: true });
    expect(game.score).toBe(0);
    expect(game.events).toEqual(["lock"]);
  });

  it.each([
    ["hard drop", { ...idle, hardDrop: true }],
    ["soft-drop lock", { ...idle, softDrop: true }],
  ])("restarts the gravity interval for the next piece after a %s", (_name, input) => {
    const game = createGame();
    game.update(0.9, idle);
    game.piece = { type: 2, shape: [[2, 2], [2, 2]], x: 0, y: ROWS - 2 };
    game.update(0, input);
    expect(game.piece.y).toBe(0);
    game.update(0.2, idle);
    expect(game.piece.y).toBe(0);
    game.update(0.8, idle);
    expect(game.piece.y).toBe(1);
  });

  it("accumulates gravity until the interval and then moves exactly one row", () => {
    const game = createGame();
    game.update(0.5, idle);
    game.update(0.499, idle);
    expect(game.piece.y).toBe(0);
    game.update(0.001, idle);
    expect(game.piece.y).toBe(1);
    expect(game.score).toBe(0);
  });

  it("uses an 820 ms gravity interval at level three and discards excess time", () => {
    const game = createGame();
    game.level = 3;
    expect(fallIntervalMs(3)).toBe(820);
    game.update(0.819, idle);
    expect(game.piece.y).toBe(0);
    game.update(0.001, idle);
    expect(game.piece.y).toBe(1);
    game.update(4, idle);
    expect(game.piece.y).toBe(2);
    game.update(0, idle);
    expect(game.piece.y).toBe(2);
  });

  it("locks a landed piece under gravity without awarding drop points", () => {
    const game = createGame();
    game.piece = { type: 2, shape: [[2, 2], [2, 2]], x: 0, y: ROWS - 2 };
    game.update(1, idle);
    expect(game.events).toEqual(["lock"]);
    expect(game.score).toBe(0);
    expect(game.piece.y).toBe(0);
  });

  it.each([[1, 100], [2, 300], [3, 500], [4, 800]])("scores %i cleared lines as %i at level one", (count, score) => {
    const game = prepareClear(count);
    game.update(0, { ...idle, softDrop: true });
    expect(game.score).toBe(score);
    expect(LINE_SCORES[count]).toBe(score);
    expect(game.lines).toBe(count);
    expect(game.board).toHaveLength(ROWS);
    expect(game.board.slice(0, count)).toEqual(Array.from({ length: count }, () => Array(COLS).fill(0)));
    expect(game.board.filter((row) => row.some(Boolean))).toHaveLength(4 - count);
    expect(game.events).toEqual(["lock", count === 4 ? "tetris" : "lines"]);
  });

  it.each([[1, 200], [2, 600], [3, 1000], [4, 1600]])("doubles the score for %i cleared lines at level two", (count, score) => {
    const game = prepareClear(count, 2);
    game.update(0, { ...idle, softDrop: true });
    expect(game.score).toBe(score);
    expect(game.stats).toEqual({ score, level: 2, lives: 1 });
  });

  it("levels up at ten lines and scores the threshold clear with the old level", () => {
    const game = prepareClear(1);
    game.lines = 9;
    game.update(0, { ...idle, softDrop: true });
    expect([game.lines, game.level, game.score]).toEqual([10, 2, 100]);
    expect(game.events).toEqual(["lock", "lines", "levelUp"]);
  });

  it("stays at level one after nine lines", () => {
    const game = prepareClear(1);
    game.lines = 8;
    game.update(0, { ...idle, softDrop: true });
    expect([game.lines, game.level]).toEqual([9, 1]);
    expect(game.events).toEqual(["lock", "lines"]);
  });

  it("emits lock then tetris then levelUp for a four-line threshold clear", () => {
    const game = prepareClear(4);
    game.lines = 6;
    game.update(0, { ...idle, softDrop: true });
    expect(game.events).toEqual(["lock", "tetris", "levelUp"]);
    expect([game.score, game.level]).toEqual([800, 2]);
  });

  it("ends once on spawn collision and ignores later input and time", () => {
    const game = createGame();
    finishGame(game);
    expect(game.events).toEqual(["lock", "gameOver"]);
    expect(game.state).toBe("gameover");
    const before = structuredClone({ board: game.board, piece: game.piece, next: game.next, stats: game.stats, lines: game.lines });
    for (let frame = 0; frame < 3; frame++) {
      game.update(10, { left: true, right: true, rotate: true, softDrop: true, hardDrop: true });
      expect(game.events).toEqual([]);
      expect({ board: game.board, piece: game.piece, next: game.next, stats: game.stats, lines: game.lines }).toEqual(before);
      expect(game.state).toBe("gameover");
    }
  });

  it.each([false, true])("predicts hard-drop landing without mutation with stack=%s", (stack) => {
    const game = createGame();
    game.piece = { type: 2, shape: [[2, 2], [2, 2]], x: 4, y: 0 };
    if (stack) game.board[15][4] = 7;
    const before = structuredClone(game.piece);
    const landing = game.ghostY();
    expect(landing).toBe(stack ? 13 : 18);
    expect(game.piece).toEqual(before);
    game.update(0, { ...idle, hardDrop: true });
    expect(game.board[landing][4]).toBe(2);
    expect(game.board[landing + 1][5]).toBe(2);
    expect(game.score).toBe(landing * 2);
  });

  it("applies left then right then rotation before hard drop", () => {
    const game = createGame();
    game.piece = { type: 1, shape: [[1, 1, 1, 1]], x: 0, y: 0 };
    game.update(0, { left: true, right: true, rotate: true, hardDrop: true, softDrop: true });
    expect(game.board[ROWS - 1][1]).toBe(1);
    expect(game.board[ROWS - 1][0]).toBe(0);
    expect(game.events).toEqual(["rotate", "lock"]);
    expect(game.score).toBe(32);
  });
});
