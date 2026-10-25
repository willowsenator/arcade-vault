import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import BloqueBusterCanvas from "./BloqueBusterCanvas";
import { sound } from "@/lib/sound";
import { BLOQUE_BUSTER_CUES } from "@/lib/sound/cues";

vi.mock("@/lib/sound", () => ({ sound: { play: vi.fn() } }));
import { BloqueBusterGame, MAX_DT } from "@/lib/bloque-buster/game";
import { seeded, stubContext } from "@/lib/bloque-buster/testing";

let frames: FrameRequestCallback[];
const cancelFrame = vi.fn();

beforeEach(() => {
  frames = [];
  cancelFrame.mockClear();
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", cancelFrame);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(stubContext().ctx as never);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const step = (ts: number) => act(() => { frames.shift()?.(ts); });
const press = (type: "keydown" | "keyup", code: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent(type, { code, cancelable: true, ...init });
  window.dispatchEvent(event);
  return event;
};
const pointer = (canvas: HTMLElement, clientX: number) =>
  canvas.dispatchEvent(new MouseEvent("pointermove", { clientX }));
const props = () => ({ onStats: vi.fn(), onGameOver: vi.fn() });

describe("BloqueBusterCanvas", () => {
  describe("sound cues", () => {
    beforeEach(() => { vi.mocked(sound.play).mockClear(); });

    it("plays every reported event in order", () => {
      const game = new BloqueBusterGame(seeded(1));
      vi.spyOn(game, "update").mockImplementation(() => {
        game.events = ["brick", "paddle"];
      });
      render(<BloqueBusterCanvas running createGame={() => game} {...props()} />);
      step(0);
      expect(sound.play).toHaveBeenCalledTimes(2);
      expect(sound.play).toHaveBeenNthCalledWith(1, BLOQUE_BUSTER_CUES.brick);
      expect(sound.play).toHaveBeenNthCalledWith(2, BLOQUE_BUSTER_CUES.paddle);
    });

    it("plays nothing when the update reports no events", () => {
      const game = new BloqueBusterGame(seeded(1));
      vi.spyOn(game, "update").mockImplementation(() => { game.events = []; });
      render(<BloqueBusterCanvas running createGame={() => game} {...props()} />);
      step(0);
      expect(sound.play).not.toHaveBeenCalled();
    });

    it("plays nothing while paused even with events from the previous frame", () => {
      const game = new BloqueBusterGame(seeded(1));
      game.events = ["brick", "paddle"];
      const update = vi.spyOn(game, "update");
      render(<BloqueBusterCanvas running={false} createGame={() => game} {...props()} />);
      step(0);
      expect(update).not.toHaveBeenCalled();
      expect(sound.play).not.toHaveBeenCalled();
    });
  });

  it("reports starting stats on the first frame and exposes the Spanish label", () => {
    const p = props();
    render(<BloqueBusterCanvas running {...p} />);
    step(0);
    expect(p.onStats).toHaveBeenCalledWith({ score: 0, lives: 3, level: 1 });
    expect(screen.getByRole("img", { name: "Pantalla de BLOQUE BUSTER: una paleta rebota una pelota contra un muro de bloques" })).toHaveAttribute("width", "640");
    expect(screen.getByRole("img")).toHaveAttribute("height", "480");
  });

  it("schedules no frames while stopped and ignores keyboard and pointer input after pausing", () => {
    const game = new BloqueBusterGame(seeded(1));
    const p = props();
    const { rerender } = render(<BloqueBusterCanvas running={false} createGame={() => game} {...p} />);
    expect(frames).toHaveLength(0);
    rerender(<BloqueBusterCanvas running createGame={() => game} {...p} />);
    step(0);
    rerender(<BloqueBusterCanvas running={false} createGame={() => game} {...p} />);
    expect(cancelFrame).toHaveBeenCalled();
    const x = game.paddle.x;
    expect(press("keydown", "KeyD").defaultPrevented).toBe(false);
    pointer(screen.getByRole("img"), 500);
    expect(game.paddle.x).toBe(x);
  });

  it("moves by 20 in a 50 ms frame with D and reverses with A", () => {
    const game = new BloqueBusterGame(seeded(1));
    render(<BloqueBusterCanvas running createGame={() => game} {...props()} />);
    const x = game.paddle.x;
    step(0);
    press("keydown", "KeyD");
    step(50);
    expect(game.paddle.x).toBe(x + 20);
    press("keyup", "KeyD");
    press("keydown", "KeyA");
    step(100);
    expect(game.paddle.x).toBe(x);
  });

  it("scales pointer coordinates from the displayed canvas width", () => {
    const game = new BloqueBusterGame(seeded(1));
    game.paddle.setCentre(100);
    render(<BloqueBusterCanvas running createGame={() => game} {...props()} />);
    const canvas = screen.getByRole("img");
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({ left: 100, width: 320 } as DOMRect);
    pointer(canvas, 260);
    expect(game.paddle.x + game.paddle.width / 2).toBe(320);
  });

  it("ignores pointer movement when the displayed canvas width is zero", () => {
    const game = new BloqueBusterGame(seeded(1));
    render(<BloqueBusterCanvas running createGame={() => game} {...props()} />);
    const canvas = screen.getByRole("img");
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({ left: 100, width: 0 } as DOMRect);
    const x = game.paddle.x;
    pointer(canvas, 100);
    step(0);
    expect(game.paddle.x).not.toBeNaN();
    expect(game.paddle.x).toBe(x);
  });

  it.each([
    ["KeyA", { ctrlKey: true }],
    ["ArrowLeft", { altKey: true }],
    ["KeyD", { metaKey: true }],
  ])("ignores modified %s keydown and releases on modified keyup without preventing default", (code, modifier) => {
    const game = new BloqueBusterGame(seeded(1));
    render(<BloqueBusterCanvas running createGame={() => game} {...props()} />);
    const x = game.paddle.x;
    step(0);
    const down = press("keydown", code, modifier);
    step(50);
    expect(game.paddle.x).toBe(x);
    expect(down.defaultPrevented).toBe(false);
    expect(press("keyup", code, modifier).defaultPrevented).toBe(false);

    press("keydown", code);
    expect(press("keyup", code, modifier).defaultPrevented).toBe(false);
    step(100);
    expect(game.paddle.x).toBe(x);
    press("keyup", code);
    step(150);
    expect(game.paddle.x).toBe(x);
  });

  it("reports game over once after stats and schedules no further frame", () => {
    const game = new BloqueBusterGame(seeded(1));
    game.state = "gameover";
    const p = props();
    render(<BloqueBusterCanvas running createGame={() => game} {...p} />);
    step(0);
    step(50);
    expect(p.onGameOver).toHaveBeenCalledTimes(1);
    expect(frames).toHaveLength(0);
    expect(p.onStats.mock.invocationCallOrder[0]).toBeLessThan(p.onGameOver.mock.invocationCallOrder[0]);
  });

  it("cancels animation and removes keyboard and pointer listeners on unmount", () => {
    const game = new BloqueBusterGame(seeded(1));
    const { unmount } = render(<BloqueBusterCanvas running createGame={() => game} {...props()} />);
    const canvas = screen.getByRole("img");
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({ left: 0, width: 640 } as DOMRect);
    const x = game.paddle.x;
    unmount();
    expect(cancelFrame).toHaveBeenCalled();
    expect(press("keydown", "KeyD").defaultPrevented).toBe(false);
    pointer(canvas, 500);
    expect(game.paddle.x).toBe(x);
  });

  it("captures all game keys, skips repeats and releases held keys", () => {
    const game = new BloqueBusterGame(seeded(1));
    const update = vi.spyOn(game, "update");
    render(<BloqueBusterCanvas running createGame={() => game} {...props()} />);
    for (const [code, field] of [["ArrowLeft", "left"], ["ArrowRight", "right"], ["KeyA", "left"], ["KeyD", "right"]] as const) {
      expect(press("keydown", code, { repeat: true }).defaultPrevented).toBe(true);
      step(0);
      expect(update).toHaveBeenLastCalledWith(0, { left: false, right: false });
      expect(press("keydown", code).defaultPrevented).toBe(true);
      step(0);
      expect(update).toHaveBeenLastCalledWith(0, { left: false, right: false, [field]: true });
      expect(press("keyup", code).defaultPrevented).toBe(true);
    }
    expect(press("keydown", "Space").defaultPrevented).toBe(false);
  });

  it("clamps elapsed time, deduplicates stats and uses the latest callbacks", () => {
    const game = new BloqueBusterGame(seeded(1));
    const update = vi.spyOn(game, "update");
    const first = props();
    const { rerender } = render(<BloqueBusterCanvas running createGame={() => game} {...first} />);
    step(100);
    step(125);
    step(1000);
    expect(update.mock.calls.map(([dt]) => dt)).toEqual([0, 0.025, MAX_DT]);
    expect(first.onStats).toHaveBeenCalledTimes(1);
    const latest = props();
    rerender(<BloqueBusterCanvas running createGame={() => game} {...latest} />);
    expect(cancelFrame).not.toHaveBeenCalled();
    game.score = 7;
    step(1010);
    expect(latest.onStats).toHaveBeenCalledWith({ score: 7, lives: 3, level: 1 });
    game.state = "gameover";
    step(1020);
    expect(latest.onGameOver).toHaveBeenCalledTimes(1);
    expect(first.onGameOver).not.toHaveBeenCalled();
  });
});
