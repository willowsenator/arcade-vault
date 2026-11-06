import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import SnakeCanvas from "./SnakeCanvas";
import { sound } from "@/lib/sound";
import { SNAKE_CUES } from "@/lib/sound/cues";
import { SnakeGame, MAX_DT } from "@/lib/snake/game";
import { seeded, stubContext } from "@/lib/snake/testing";

vi.mock("@/lib/sound", () => ({ sound: { play: vi.fn() } }));

let frames: FrameRequestCallback[];
const cancelFrame = vi.fn();
let context: ReturnType<typeof stubContext>;

beforeEach(() => {
  frames = [];
  cancelFrame.mockClear();
  vi.mocked(sound.play).mockClear();
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", cancelFrame);
  context = stubContext();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context.ctx as never);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const step = (ts: number) =>
  act(() => {
    frames.shift()?.(ts);
  });

const press = (code: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent("keydown", { code, cancelable: true, ...init });
  window.dispatchEvent(event);
  return event;
};

const props = () => ({ onStats: vi.fn(), onGameOver: vi.fn() });

describe("SnakeCanvas", () => {
  it("reports the starting stats on the first frame", () => {
    const p = props();
    render(<SnakeCanvas running {...p} />);
    step(0);
    expect(p.onStats).toHaveBeenCalledWith({ score: 0, lives: 1, level: 1 });
  });

  it("has a Spanish accessible name and the board size", () => {
    render(<SnakeCanvas running {...props()} />);
    const canvas = screen.getByRole("img", { name: /Pantalla de SERPENTINA/ });
    expect(canvas).toHaveAttribute("width", "480");
    expect(canvas).toHaveAttribute("height", "480");
  });

  it("maps arrows and WASD to steer and prevents default", () => {
    const game = new SnakeGame(seeded(1));
    const steer = vi.spyOn(game, "steer");
    render(<SnakeCanvas running createGame={() => game} {...props()} />);
    const cases = [
      ["ArrowUp", "up"], ["ArrowDown", "down"], ["ArrowLeft", "left"], ["ArrowRight", "right"],
      ["KeyW", "up"], ["KeyS", "down"], ["KeyA", "left"], ["KeyD", "right"],
    ] as const;
    for (const [code, direction] of cases) {
      expect(press(code).defaultPrevented).toBe(true);
      expect(steer).toHaveBeenLastCalledWith(direction);
    }
  });

  it("leaves modified key chords to the browser", () => {
    const game = new SnakeGame(seeded(1));
    const steer = vi.spyOn(game, "steer");
    render(<SnakeCanvas running createGame={() => game} {...props()} />);
    for (const init of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
      expect(press("KeyS", init).defaultPrevented).toBe(false);
    }
    expect(steer).not.toHaveBeenCalled();
  });

  it("prevents repeated key presses without steering again", () => {
    const game = new SnakeGame(seeded(1));
    const steer = vi.spyOn(game, "steer");
    render(<SnakeCanvas running createGame={() => game} {...props()} />);
    expect(press("ArrowUp", { repeat: true }).defaultPrevented).toBe(true);
    expect(steer).not.toHaveBeenCalled();
  });

  it("ignores P so the player screen owns pause", () => {
    const game = new SnakeGame(seeded(1));
    const steer = vi.spyOn(game, "steer");
    render(<SnakeCanvas running createGame={() => game} {...props()} />);
    expect(press("KeyP").defaultPrevented).toBe(false);
    expect(steer).not.toHaveBeenCalled();
  });

  it("releases the keyboard while not running", () => {
    render(<SnakeCanvas running={false} {...props()} />);
    expect(press("ArrowUp").defaultPrevented).toBe(false);
  });

  it("cancels its frame and detaches key listeners on unmount", () => {
    const { unmount } = render(<SnakeCanvas running {...props()} />);
    unmount();
    expect(cancelFrame).toHaveBeenCalled();
    expect(press("ArrowUp").defaultPrevented).toBe(false);
  });

  it("plays the cue of every reported event in order", () => {
    const game = new SnakeGame(seeded(1));
    vi.spyOn(game, "update").mockImplementation(() => {
      game.events = ["food", "levelUp"];
    });
    render(<SnakeCanvas running createGame={() => game} {...props()} />);
    step(0);
    expect(sound.play).toHaveBeenCalledTimes(2);
    expect(sound.play).toHaveBeenNthCalledWith(1, SNAKE_CUES.food);
    expect(sound.play).toHaveBeenNthCalledWith(2, SNAKE_CUES.levelUp);
  });

  it("reports game over exactly once and stops scheduling frames", () => {
    const p = props();
    const game = new SnakeGame(seeded(1));
    game.snake = [{ x: 19, y: 5 }, { x: 18, y: 5 }, { x: 17, y: 5 }];
    game.food = { x: 0, y: 0 };
    vi.spyOn(game, "update").mockImplementation(() => {
      game.state = "gameover";
      game.events = ["gameOver"];
    });
    render(<SnakeCanvas running createGame={() => game} {...p} />);
    step(0);
    expect(p.onGameOver).toHaveBeenCalledTimes(1);
    expect(sound.play).toHaveBeenCalledWith(SNAKE_CUES.gameOver);
    expect(frames).toHaveLength(0);
  });

  it("uses zero for the first frame, elapsed time after, and caps long gaps", () => {
    const game = new SnakeGame(seeded(1));
    const update = vi.spyOn(game, "update");
    render(<SnakeCanvas running createGame={() => game} {...props()} />);
    step(100);
    step(125);
    step(1000);
    expect(update.mock.calls.map(([dt]) => dt)).toEqual([0, 0.025, MAX_DT]);
  });

  it("gives dt 0 on the first frame after resuming", () => {
    const game = new SnakeGame(seeded(1));
    const update = vi.spyOn(game, "update");
    const p = props();
    const { rerender } = render(<SnakeCanvas running createGame={() => game} {...p} />);
    step(100);
    rerender(<SnakeCanvas running={false} createGame={() => game} {...p} />);
    frames.length = 0; // the stubbed cancelAnimationFrame does not drop queued frames
    rerender(<SnakeCanvas running createGame={() => game} {...p} />);
    step(5000);
    expect(update).toHaveBeenLastCalledWith(0);
  });

  it("publishes stats only when they change", () => {
    const game = new SnakeGame(seeded(1));
    const p = props();
    render(<SnakeCanvas running createGame={() => game} {...p} />);
    step(0);
    step(10);
    expect(p.onStats).toHaveBeenCalledTimes(1);
    game.score = 40;
    step(20);
    expect(p.onStats).toHaveBeenLastCalledWith({ score: 40, lives: 1, level: 1 });
  });

  it("draws a paused frame without scheduling animation", () => {
    render(<SnakeCanvas running={false} {...props()} />);
    expect(context.calls.some((call) => call.name === "fillRect")).toBe(true);
    expect(frames).toHaveLength(0);
  });
});
