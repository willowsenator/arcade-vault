import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import TetrisCanvas from "./TetrisCanvas";
import { TetrisGame, MAX_DT, type Input } from "@/lib/tetris/game";
import { H, W } from "@/lib/tetris/render";
import { seeded, stubContext } from "@/lib/tetris/testing";
import { sound } from "@/lib/sound";
import { TETRIS_CUES } from "@/lib/sound/cues";

vi.mock("@/lib/sound", () => ({ sound: { play: vi.fn() } }));

let frames: Map<number, FrameRequestCallback>;
let nextFrameId: number;
const cancelFrame = vi.fn();
let context: ReturnType<typeof stubContext>;

beforeEach(() => {
  frames = new Map();
  nextFrameId = 0;
  cancelFrame.mockReset().mockImplementation((id: number) => frames.delete(id));
  vi.mocked(sound.play).mockClear();
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    frames.set(++nextFrameId, cb);
    return nextFrameId;
  });
  vi.stubGlobal("cancelAnimationFrame", cancelFrame);
  context = stubContext();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context.ctx as never);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const step = (ts: number) => act(() => {
  const entry = frames.entries().next().value;
  if (!entry) return;
  const [id, callback] = entry;
  frames.delete(id);
  callback(ts);
});

const press = (type: "keydown" | "keyup", code: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent(type, { code, cancelable: true, ...init });
  window.dispatchEvent(event);
  return event;
};

const props = () => ({ onStats: vi.fn(), onGameOver: vi.fn() });
const createGame = () => new TetrisGame(seeded(1));
const emptyInput: Input = { left: false, right: false, rotate: false, softDrop: false, hardDrop: false };
const mappings = [
  ["ArrowLeft", "left"], ["ArrowRight", "right"], ["ArrowDown", "softDrop"],
  ["ArrowUp", "rotate"], ["KeyX", "rotate"], ["Space", "hardDrop"],
] as const;

describe("TetrisCanvas", () => {
  it("reports starting stats on the first frame", () => {
    const p = props();
    render(<TetrisCanvas running createGame={createGame} {...p} />);
    step(0);
    expect(p.onStats).toHaveBeenCalledExactlyOnceWith({ score: 0, lives: 1, level: 1 });
  });

  it("releases the keyboard and schedules no frames while paused, then resumes", () => {
    const p = props();
    const { rerender } = render(<TetrisCanvas running={false} createGame={createGame} {...p} />);
    expect(frames.size).toBe(0);
    expect(press("keydown", "Space").defaultPrevented).toBe(false);
    rerender(<TetrisCanvas running createGame={createGame} {...p} />);
    expect(frames.size).toBe(1);
  });

  it("captures only mapped keys on keydown and keyup while running", () => {
    render(<TetrisCanvas running createGame={createGame} {...props()} />);
    for (const [code] of mappings) {
      expect(press("keydown", code).defaultPrevented).toBe(true);
      expect(press("keyup", code).defaultPrevented).toBe(true);
    }
    for (const code of ["KeyP", "KeyA"]) {
      expect(press("keydown", code).defaultPrevented).toBe(false);
      expect(press("keyup", code).defaultPrevented).toBe(false);
    }
  });

  it.each(mappings)("maps %s to a one-shot %s action", (code, field) => {
    const game = createGame();
    const update = vi.spyOn(game, "update");
    render(<TetrisCanvas running createGame={() => game} {...props()} />);
    press("keydown", code);
    step(0);
    expect(update).toHaveBeenLastCalledWith(0, { ...emptyInput, [field]: true });
    step(10);
    expect(update).toHaveBeenLastCalledWith(0.01, emptyInput);
  });

  it.each(mappings)("handles repeats of %s for %s", (code, field) => {
    const game = createGame();
    const update = vi.spyOn(game, "update");
    render(<TetrisCanvas running createGame={() => game} {...props()} />);
    expect(press("keydown", code, { repeat: true }).defaultPrevented).toBe(true);
    step(0);
    const accepted = ["ArrowLeft", "ArrowRight", "ArrowDown"].includes(code);
    expect(update).toHaveBeenLastCalledWith(0, { ...emptyInput, [field]: accepted });
    step(10);
    expect(update).toHaveBeenLastCalledWith(0.01, emptyInput);
  });

  it("combines different keys and coalesces duplicate presses within one frame", () => {
    const game = createGame();
    const update = vi.spyOn(game, "update");
    render(<TetrisCanvas running createGame={() => game} {...props()} />);
    press("keydown", "ArrowLeft");
    press("keydown", "ArrowLeft");
    press("keydown", "ArrowUp");
    step(0);
    expect(update).toHaveBeenCalledExactlyOnceWith(0, { ...emptyInput, left: true, rotate: true });
    step(10);
    expect(update).toHaveBeenLastCalledWith(0.01, emptyInput);
  });

  it("caps elapsed time and resets timing and pending input after pause", () => {
    const game = createGame();
    const update = vi.spyOn(game, "update");
    const p = props();
    const { rerender } = render(<TetrisCanvas running createGame={() => game} {...p} />);
    step(100);
    step(125);
    step(1000);
    expect(update.mock.calls.map(([dt]) => dt)).toEqual([0, 0.025, MAX_DT]);
    press("keydown", "ArrowLeft");
    rerender(<TetrisCanvas running={false} createGame={() => game} {...p} />);
    expect(frames.size).toBe(0);
    expect(press("keydown", "Space").defaultPrevented).toBe(false);
    rerender(<TetrisCanvas running createGame={() => game} {...p} />);
    step(10000);
    expect(update).toHaveBeenLastCalledWith(0, emptyInput);
  });

  it("plays every reported event in order", () => {
    const game = createGame();
    vi.spyOn(game, "update").mockImplementation(() => {
      game.events = ["rotate", "lock", "lines", "levelUp"];
    });
    render(<TetrisCanvas running createGame={() => game} {...props()} />);
    step(0);
    expect(sound.play).toHaveBeenCalledTimes(4);
    for (const [index, event] of game.events.entries()) {
      expect(sound.play).toHaveBeenNthCalledWith(index + 1, TETRIS_CUES[event]);
    }
  });

  it("plays no sounds when an update has no events", () => {
    const game = createGame();
    vi.spyOn(game, "update").mockImplementation(() => { game.events = []; });
    render(<TetrisCanvas running createGame={() => game} {...props()} />);
    step(0);
    expect(sound.play).not.toHaveBeenCalled();
  });

  it("plays no sounds or updates while paused even with previous events", () => {
    const game = createGame();
    game.events = ["rotate", "lock"];
    const update = vi.spyOn(game, "update");
    render(<TetrisCanvas running={false} createGame={() => game} {...props()} />);
    step(0);
    expect(update).not.toHaveBeenCalled();
    expect(sound.play).not.toHaveBeenCalled();
  });

  it("reports changed stats without repeating unchanged stats", () => {
    const game = createGame();
    const p = props();
    render(<TetrisCanvas running createGame={() => game} {...p} />);
    step(0);
    step(10);
    expect(p.onStats).toHaveBeenCalledTimes(1);
    game.score = 99;
    step(20);
    expect(p.onStats).toHaveBeenCalledTimes(2);
    expect(p.onStats).toHaveBeenLastCalledWith({ score: 99, lives: 1, level: 1 });
  });

  it("uses the latest callbacks without restarting the loop", () => {
    const game = createGame();
    const first = props();
    const { rerender } = render(<TetrisCanvas running createGame={() => game} {...first} />);
    step(0);
    const latest = props();
    rerender(<TetrisCanvas running createGame={() => game} {...latest} />);
    expect(cancelFrame).not.toHaveBeenCalled();
    expect(frames.size).toBe(1);
    game.score = 7;
    step(10);
    expect(latest.onStats).toHaveBeenCalledWith({ score: 7, lives: 1, level: 1 });
    expect(first.onStats).toHaveBeenCalledTimes(1);
    game.state = "gameover";
    step(20);
    expect(latest.onGameOver).toHaveBeenCalledTimes(1);
    expect(first.onGameOver).not.toHaveBeenCalled();
  });

  it("reports stats before game over exactly once and stops scheduling", () => {
    const game = createGame();
    const p = props();
    render(<TetrisCanvas running createGame={() => game} {...p} />);
    game.state = "gameover";
    step(0);
    expect(p.onStats).toHaveBeenCalledExactlyOnceWith({ score: 0, lives: 1, level: 1 });
    expect(p.onGameOver).toHaveBeenCalledTimes(1);
    expect(p.onStats.mock.invocationCallOrder[0]).toBeLessThan(p.onGameOver.mock.invocationCallOrder[0]);
    expect(frames.size).toBe(0);
    step(10);
    expect(p.onGameOver).toHaveBeenCalledTimes(1);
  });

  it("cancels the pending frame and removes both listeners on unmount", () => {
    const { unmount } = render(<TetrisCanvas running createGame={createGame} {...props()} />);
    step(0);
    const pendingId = [...frames.keys()][0];
    unmount();
    expect(cancelFrame).toHaveBeenCalledExactlyOnceWith(pendingId);
    expect(frames.size).toBe(0);
    expect(press("keydown", "Space").defaultPrevented).toBe(false);
    expect(press("keyup", "Space").defaultPrevented).toBe(false);
  });

  it("draws a paused frame with the canvas dimensions and accessible label", () => {
    const { getByRole } = render(<TetrisCanvas running={false} createGame={createGame} {...props()} />);
    const canvas = getByRole("img", { name: "Pantalla de CAÍDA: piezas que caen y se apilan para completar líneas" });
    expect(canvas).toHaveAttribute("width", String(W));
    expect(canvas).toHaveAttribute("height", String(H));
    expect(canvas).toHaveClass("game-canvas");
    expect(context.calls.some((call) => call.name === "fillRect")).toBe(true);
    expect(frames.size).toBe(0);
  });
});
