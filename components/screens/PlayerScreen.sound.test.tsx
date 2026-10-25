import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import PlayerScreen from "./PlayerScreen";
import { AuthProvider } from "@/components/AuthProvider";
import { GAMES } from "@/lib/data";
import { sound, setSoundEnabled } from "@/lib/sound";
import { ASTEROIDS_MUSIC, BLOQUE_BUSTER_MUSIC } from "@/lib/sound/cues";
import type { EngineCanvasProps } from "@/components/games/engines";

const { unlockCleanup } = vi.hoisted(() => ({ unlockCleanup: vi.fn() }));

vi.mock("@/lib/sound", async () => {
  const { useSyncExternalStore } = await import("react");
  let enabled = true;
  const listeners = new Set<() => void>();
  const soundEnabled = () => enabled;
  const subscribeSound = (listener: () => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  };
  return {
    sound: {
      startMusic: vi.fn(), stopMusic: vi.fn(), cancelPending: vi.fn(), play: vi.fn(),
      armGestureUnlock: vi.fn(() => unlockCleanup),
    },
    soundEnabled,
    subscribeSound,
    useSoundEnabled: () => useSyncExternalStore(subscribeSound, soundEnabled, () => true),
    setSoundEnabled: vi.fn((value: boolean) => {
      enabled = value;
      listeners.forEach((listener) => listener());
    }),
  };
});
vi.mock("@/lib/score-queries", () => ({ insertScore: vi.fn() }));
vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/components/games/AsteroidsCanvas", () => ({
  default: (props: EngineCanvasProps) => (
    <div data-testid="asteroids-canvas" data-running={String(props.running)}>
      <button onClick={() => props.onStats({ score: 340, lives: 2, level: 3 })}>emit-stats</button>
      <button onClick={props.onGameOver}>emit-over</button>
    </div>
  ),
}));
vi.mock("@/components/games/BloqueBusterCanvas", () => ({
  default: (props: EngineCanvasProps) => (
    <div data-testid="bloque-buster-canvas" data-running={String(props.running)}>
      <button onClick={() => props.onStats({ score: 340, lives: 2, level: 3 })}>emit-stats</button>
      <button onClick={props.onGameOver}>emit-over</button>
    </div>
  ),
}));

const renderPlayer = (id = "bloque-buster") => render(
  <AuthProvider>
    <PlayerScreen game={GAMES.find((game) => game.id === id)!} />
  </AuthProvider>,
);

beforeEach(() => {
  localStorage.clear();
  setSoundEnabled(true);
  vi.clearAllMocks();
});

describe("PlayerScreen sound lifecycle", () => {
  it.each([
    ["bloque-buster", BLOQUE_BUSTER_MUSIC],
    ["rocas", ASTEROIDS_MUSIC],
  ] as const)("starts the registry music and arms gesture unlock for %s", (id, music) => {
    renderPlayer(id);
    expect(sound.startMusic).toHaveBeenCalledExactlyOnceWith(music);
    expect(sound.armGestureUnlock).toHaveBeenCalledOnce();
  });

  it.each(["button", "KeyP"])("stops on pause and restarts on resume using %s", (control) => {
    renderPlayer();
    const togglePause = () => control === "KeyP"
      ? fireEvent.keyDown(window, { code: "KeyP" })
      : fireEvent.click(screen.getByRole("button", { name: /^(PAUSA|REANUDAR)$/ }));
    vi.mocked(sound.stopMusic).mockClear();
    togglePause();
    expect(sound.stopMusic).toHaveBeenCalled();
    expect(sound.startMusic).toHaveBeenCalledTimes(1);
    togglePause();
    expect(sound.startMusic).toHaveBeenCalledTimes(2);
    expect(sound.startMusic).toHaveBeenLastCalledWith(BLOQUE_BUSTER_MUSIC);
  });

  it("stops music when the engine opens the game-over window", () => {
    renderPlayer();
    vi.mocked(sound.stopMusic).mockClear();
    fireEvent.click(screen.getByText("emit-over"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(sound.stopMusic).toHaveBeenCalled();
    expect(sound.startMusic).toHaveBeenCalledTimes(1);
  });

  it("cancels pending cues before restarting and keeps one loop across five cycles", () => {
    renderPlayer();
    for (let cycle = 0; cycle < 5; cycle++) {
      fireEvent.click(screen.getByRole("button", { name: "PAUSA" }));
      fireEvent.click(screen.getByRole("button", { name: "REANUDAR" }));
      fireEvent.click(screen.getByText("emit-over"));
      fireEvent.click(screen.getByRole("button", { name: "JUGAR DE NUEVO" }));
      expect(sound.cancelPending).toHaveBeenCalledTimes(cycle + 1);
      expect(sound.startMusic).toHaveBeenCalledTimes(1 + (cycle + 1) * 2);
      expect(vi.mocked(sound.cancelPending).mock.invocationCallOrder.at(-1))
        .toBeLessThan(vi.mocked(sound.startMusic).mock.invocationCallOrder.at(-1)!);
    }
    const calls = [
      ...vi.mocked(sound.startMusic).mock.invocationCallOrder.map((order) => ({ order, start: true })),
      ...vi.mocked(sound.stopMusic).mock.invocationCallOrder.map((order) => ({ order, start: false })),
    ].sort((a, b) => a.order - b.order);
    let playing = false;
    for (const call of calls) {
      if (call.start) expect(playing).toBe(false);
      playing = call.start;
    }
    expect(playing).toBe(true);
  });

  it("stops music, cancels pending cues and removes gesture listeners on unmount", () => {
    const { unmount } = renderPlayer();
    vi.mocked(sound.stopMusic).mockClear();
    vi.mocked(sound.cancelPending).mockClear();
    unmount();
    expect(sound.stopMusic).toHaveBeenCalledOnce();
    expect(sound.cancelPending).toHaveBeenCalledOnce();
    expect(unlockCleanup).toHaveBeenCalledOnce();
  });

  it("renders the sound switch after SALIR and updates its enabled state", () => {
    renderPlayer();
    const button = screen.getByRole("button", { name: "SONIDO: SÍ" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveClass("btn", "ghost");
    expect(screen.getByRole("link", { name: "SALIR" }).nextElementSibling).toBe(button);
    expect(button.parentElement).toHaveClass("hud-actions");
    fireEvent.click(button);
    expect(setSoundEnabled).toHaveBeenCalledExactlyOnceWith(false);
    expect(screen.getByRole("button", { name: "SONIDO: NO" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button);
    expect(setSoundEnabled).toHaveBeenLastCalledWith(true);
    expect(button).toHaveTextContent("SONIDO: SÍ");
  });

  it("shows no switch and starts no music for a game without an engine", () => {
    renderPlayer("caida");
    expect(screen.queryByRole("button", { name: /SONIDO:/ })).toBeNull();
    expect(sound.startMusic).not.toHaveBeenCalled();
  });
});
