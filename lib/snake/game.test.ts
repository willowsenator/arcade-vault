import { describe, expect, it } from "vitest";
import { COLS, ROWS, FOOD_POINTS, stepInterval, type Cell, type Direction } from "./entities";
import { SnakeGame, START_LIVES } from "./game";
import { seeded } from "./testing";

function newGame(): SnakeGame {
  return new SnakeGame(seeded(1));
}

function step(game: SnakeGame) {
  game.update(stepInterval(game.level));
}

function place(game: SnakeGame, snake: Cell[], direction: Direction, food: Cell) {
  game.snake = snake;
  game.direction = direction;
  game.food = food;
}

function straight(head: Cell, direction: Direction, length = 3): Cell[] {
  const dx = direction === "left" ? 1 : direction === "right" ? -1 : 0;
  const dy = direction === "up" ? 1 : direction === "down" ? -1 : 0;
  return Array.from({ length }, (_, i) => ({ x: head.x + dx * i, y: head.y + dy * i }));
}

/** Deep copy of every own field, private ones included; functions are kept by reference. */
function snapshot(game: SnakeGame): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(game).map(([key, value]) => [
      key,
      typeof value === "function" ? value : structuredClone(value),
    ]),
  );
}

const FAR_FOOD: Cell = { x: 0, y: 0 };

describe("SnakeGame start", () => {
  it("starts with a length-3 snake heading right from the centre", () => {
    const game = newGame();
    expect(game.snake).toEqual([
      { x: COLS / 2, y: ROWS / 2 },
      { x: COLS / 2 - 1, y: ROWS / 2 },
      { x: COLS / 2 - 2, y: ROWS / 2 },
    ]);
    expect(game.direction).toBe("right");
    expect(game.state).toBe("playing");
    expect(game.stats).toEqual({ score: 0, lives: START_LIVES, level: 1 });
    expect(game.snake.some((c) => c.x === game.food.x && c.y === game.food.y)).toBe(false);
  });
});

describe("SnakeGame eating", () => {
  it("grows by one and places new food off the snake", () => {
    const game = newGame();
    place(game, straight({ x: 5, y: 5 }, "right"), "right", { x: 6, y: 5 });
    step(game);
    expect(game.snake).toHaveLength(4);
    expect(game.snake[0]).toEqual({ x: 6, y: 5 });
    expect(game.snake.some((c) => c.x === game.food.x && c.y === game.food.y)).toBe(false);
    expect(game.events).toEqual(["food"]);
  });

  it("scores 10 times the level at eating", () => {
    const game = newGame();
    game.level = 2;
    game.foodEaten = 5;
    place(game, straight({ x: 5, y: 5 }, "right"), "right", { x: 6, y: 5 });
    step(game);
    expect(game.score).toBe(FOOD_POINTS * 2);
  });

  it("scores the fifth food at level 1 and then raises the level, emitting food then levelUp", () => {
    const game = newGame();
    game.foodEaten = 4;
    place(game, straight({ x: 5, y: 5 }, "right"), "right", { x: 6, y: 5 });
    step(game);
    expect(game.score).toBe(FOOD_POINTS);
    expect(game.level).toBe(2);
    expect(game.events).toEqual(["food", "levelUp"]);
  });

  it("ends the run once when the last free cell is eaten, without placing food", () => {
    const game = newGame();
    const path: Cell[] = [];
    for (let y = 0; y < ROWS; y++) {
      for (let i = 0; i < COLS; i++) path.push({ x: y % 2 === 0 ? i : COLS - 1 - i, y });
    }
    const food = path[path.length - 1];
    place(game, path.slice(0, -1).reverse(), "left", food);
    step(game);
    expect(game.state).toBe("gameover");
    expect(game.events.filter((e) => e === "gameOver")).toHaveLength(1);
    expect(game.events).toEqual(["food", "gameOver"]);
  });
});

describe("SnakeGame collisions", () => {
  const walls: [string, Cell, Direction][] = [
    ["left", { x: 0, y: 5 }, "left"],
    ["right", { x: COLS - 1, y: 5 }, "right"],
    ["top", { x: 5, y: 0 }, "up"],
    ["bottom", { x: 5, y: ROWS - 1 }, "down"],
  ];

  it.each(walls)("ends the run on the %s wall", (_name, head, direction) => {
    const game = newGame();
    place(game, straight(head, direction), direction, { x: 10, y: 10 });
    step(game);
    expect(game.state).toBe("gameover");
    expect(game.events).toEqual(["gameOver"]);
  });

  it("ends the run when the head hits the body", () => {
    const game = newGame();
    const snake = [
      { x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 7, y: 6 },
      { x: 7, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 4 },
    ];
    place(game, snake, "right", FAR_FOOD);
    step(game);
    expect(game.state).toBe("gameover");
  });

  const loop = (): Cell[] => [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 5 }];

  it("lets the head enter the cell the tail vacates when not growing", () => {
    const game = newGame();
    place(game, loop(), "right", FAR_FOOD);
    step(game);
    expect(game.state).toBe("playing");
    expect(game.snake[0]).toEqual({ x: 6, y: 5 });
  });

  it("is fatal to enter the tail cell when the snake grows on that step", () => {
    const game = newGame();
    place(game, loop(), "right", { x: 6, y: 5 });
    step(game);
    expect(game.state).toBe("gameover");
  });
});

describe("SnakeGame steering", () => {
  it("ignores a direct reversal", () => {
    const game = newGame();
    game.steer("left");
    step(game);
    expect(game.snake[0]).toEqual({ x: COLS / 2 + 1, y: ROWS / 2 });
  });

  it("does not reverse into the body with two quick turns", () => {
    const game = newGame();
    game.steer("up");
    game.steer("left");
    step(game);
    step(game);
    expect(game.state).toBe("playing");
    expect(game.snake[0]).toEqual({ x: COLS / 2 - 1, y: ROWS / 2 - 1 });
    expect(game.direction).toBe("left");
  });

  it("ignores a turn that reverses the last queued direction", () => {
    const game = newGame();
    game.steer("up");
    game.steer("down");
    step(game);
    step(game);
    expect(game.direction).toBe("up");
    expect(game.state).toBe("playing");
  });

  it("queues at most two turns", () => {
    const game = newGame();
    game.steer("up");
    game.steer("left");
    game.steer("down");
    step(game);
    step(game);
    step(game);
    expect(game.direction).toBe("left");
  });

  it("ignores steering after game over", () => {
    const game = newGame();
    place(game, straight({ x: COLS - 1, y: 5 }, "right"), "right", FAR_FOOD);
    step(game);
    game.steer("up");
    expect(game.direction).toBe("right");
    expect(game.events).toEqual(["gameOver"]);
  });
});

describe("SnakeGame update", () => {
  it("advances once per step interval and not on a smaller dt", () => {
    const game = newGame();
    const interval = stepInterval(1);
    game.update(interval * 0.5);
    expect(game.snake[0]).toEqual({ x: COLS / 2, y: ROWS / 2 });
    game.update(interval * 0.5);
    expect(game.snake[0]).toEqual({ x: COLS / 2 + 1, y: ROWS / 2 });
  });

  it("advances as many steps as dt covers", () => {
    const game = newGame();
    game.update(stepInterval(1) * 2.5);
    expect(game.snake[0]).toEqual({ x: COLS / 2 + 2, y: ROWS / 2 });
  });

  it("stops stepping at game over inside a multi-step update", () => {
    const game = newGame();
    place(game, straight({ x: COLS - 1, y: 5 }, "right"), "right", FAR_FOOD);
    const snake = game.snake.map((c) => ({ ...c }));
    game.update(stepInterval(1) * 5);
    expect(game.events).toEqual(["gameOver"]);
    expect(game.snake).toEqual(snake);
  });

  it("leaves every field untouched by steer and update after game over", () => {
    const game = newGame();
    place(game, straight({ x: COLS - 1, y: 5 }, "right"), "right", FAR_FOOD);
    step(game);
    game.update(0);
    const before = snapshot(game);
    game.steer("up");
    game.update(1);
    expect(game).toEqual(before);
  });

  it("clears events first", () => {
    const game = newGame();
    place(game, straight({ x: 5, y: 5 }, "right"), "right", { x: 6, y: 5 });
    step(game);
    expect(game.events).toEqual(["food"]);
    game.update(0);
    expect(game.events).toEqual([]);
  });

  it("changes nothing and emits nothing after game over", () => {
    const game = newGame();
    place(game, straight({ x: COLS - 1, y: 5 }, "right"), "right", FAR_FOOD);
    step(game);
    const snake = game.snake.map((c) => ({ ...c }));
    step(game);
    expect(game.snake).toEqual(snake);
    expect(game.events).toEqual([]);
  });
});
