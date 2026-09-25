import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import PlayerScreen from "./PlayerScreen";
import { AuthProvider } from "@/components/AuthProvider";
import { GAMES } from "@/lib/data";

const supabase = vi.hoisted(() => ({
  insertScore: vi.fn(),
  createClient: vi.fn(() => ({ __browser: true })),
}));
vi.mock("@/lib/score-queries", () => ({ insertScore: supabase.insertScore }));
vi.mock("@/utils/supabase/client", () => ({ createClient: supabase.createClient }));

const openGameOver = () => {
  render(
    <AuthProvider>
      <PlayerScreen game={GAMES[0]} />
    </AuthProvider>,
  );
  fireEvent.click(screen.getByText("FIN"));
};
const save = async () => {
  await act(async () => {
    fireEvent.click(screen.getByText("GUARDAR PUNTUACIÓN"));
  });
};

describe("PlayerScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    supabase.insertScore.mockReset().mockResolvedValue(undefined);
    supabase.createClient.mockReset().mockReturnValue({ __browser: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  it("increases the score on an interval while not paused", () => {
    render(
      <AuthProvider>
        <PlayerScreen game={GAMES[0]} />
      </AuthProvider>,
    );
    act(() => vi.advanceTimersByTime(220));
    expect(screen.getByTestId("score-value").textContent).not.toBe("0");
  });
  it("stops increasing the score while paused", () => {
    render(
      <AuthProvider>
        <PlayerScreen game={GAMES[0]} />
      </AuthProvider>,
    );
    fireEvent.click(screen.getByText("PAUSA"));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByTestId("score-value").textContent).toBe("0");
  });
  it("shows the game-over modal when FIN is clicked", () => {
    openGameOver();
    expect(screen.getByText("FIN DEL JUEGO")).toBeInTheDocument();
    expect(screen.getByText("VOLVER AL VAULT")).toHaveAttribute(
      "href",
      "/biblioteca",
    );
  });
  it("saves the score through insertScore and confirms it", async () => {
    openGameOver();
    await save();
    expect(supabase.insertScore).toHaveBeenCalledWith(
      { __browser: true },
      { game: GAMES[0].id, name: "INVITADO", score: 0 },
    );
    expect(screen.getByText("▸ PUNTUACIÓN GUARDADA_")).toBeInTheDocument();
    expect(localStorage.getItem("av_scores")).toBeNull();
  });
  it("shows an error, logs the cause and refocuses the name when the save is rejected", async () => {
    const failure = new Error("violates check constraint");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    supabase.insertScore.mockRejectedValue(failure);
    openGameOver();
    await save();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "NO SE PUDO GUARDAR LA PUNTUACIÓN. INTÉNTALO DE NUEVO",
    );
    expect(screen.queryByText("▸ PUNTUACIÓN GUARDADA_")).toBeNull();
    expect(screen.getByText("GUARDAR PUNTUACIÓN")).not.toHaveAttribute("aria-disabled", "true");
    expect(screen.getByPlaceholderText("TUS INICIALES")).toHaveFocus();
    expect(errorSpy).toHaveBeenCalledWith(expect.any(String), { game: GAMES[0].id }, failure);
  });
  it("clears the error and confirms the score when a retry succeeds", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    supabase.insertScore.mockRejectedValueOnce(new Error("offline"));
    openGameOver();
    await save();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await save();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("▸ PUNTUACIÓN GUARDADA_")).toBeInTheDocument();
    expect(supabase.insertScore).toHaveBeenCalledTimes(2);
  });
  it("ignores a second click while a save is pending", async () => {
    let resolveSave: () => void = () => {
      throw new Error("save was never started");
    };
    supabase.insertScore.mockReturnValue(new Promise<void>((resolve) => (resolveSave = resolve)));
    openGameOver();
    await save();
    expect(screen.getByText("GUARDAR PUNTUACIÓN")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByPlaceholderText("TUS INICIALES")).toHaveAttribute("readonly");
    await save();
    expect(supabase.insertScore).toHaveBeenCalledTimes(1);
    await act(async () => resolveSave());
    expect(screen.getByText("▸ PUNTUACIÓN GUARDADA_")).toBeInTheDocument();
  });
  it("does not carry a pending save into the next run when Escape restarts the game", async () => {
    let resolveSave: () => void = () => {
      throw new Error("save was never started");
    };
    supabase.insertScore.mockReturnValueOnce(new Promise<void>((resolve) => (resolveSave = resolve)));
    openGameOver();
    await save();
    fireEvent.keyDown(window, { key: "Escape" });
    await act(async () => resolveSave());
    fireEvent.click(screen.getByText("FIN"));
    expect(screen.queryByText("▸ PUNTUACIÓN GUARDADA_")).toBeNull();
    expect(screen.getByText("GUARDAR PUNTUACIÓN")).not.toHaveAttribute("aria-disabled", "true");
  });
  it("does not show a stale error from a failed save that finishes after a restart", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let rejectSave: (reason: Error) => void = () => {
      throw new Error("save was never started");
    };
    supabase.insertScore.mockReturnValueOnce(
      new Promise<void>((_resolve, reject) => (rejectSave = reject)),
    );
    openGameOver();
    await save();
    fireEvent.keyDown(window, { key: "Escape" });
    await act(async () => rejectSave(new Error("offline")));
    fireEvent.click(screen.getByText("FIN"));
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("clears the error when the player starts a new run", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    supabase.insertScore.mockRejectedValue(new Error("offline"));
    openGameOver();
    await save();
    fireEvent.click(screen.getByText("JUGAR DE NUEVO"));
    fireEvent.click(screen.getByText("FIN"));
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("shows the same error when the Supabase client cannot be created", async () => {
    supabase.createClient.mockImplementation(() => {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
    });
    openGameOver();
    await save();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "NO SE PUDO GUARDAR LA PUNTUACIÓN. INTÉNTALO DE NUEVO",
    );
    expect(supabase.insertScore).not.toHaveBeenCalled();
  });
  it("blocks a blank name before saving", async () => {
    openGameOver();
    fireEvent.change(screen.getByPlaceholderText("TUS INICIALES"), { target: { value: "   " } });
    await save();
    expect(supabase.insertScore).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("ESCRIBE UN NOMBRE PARA GUARDAR");
    fireEvent.change(screen.getByPlaceholderText("TUS INICIALES"), { target: { value: "ANA" } });
    await save();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(supabase.insertScore).toHaveBeenCalledTimes(1);
  });
  it("trims the name before saving it", async () => {
    openGameOver();
    fireEvent.change(screen.getByPlaceholderText("TUS INICIALES"), { target: { value: " ab " } });
    await save();
    expect(supabase.insertScore).toHaveBeenCalledWith(
      { __browser: true },
      expect.objectContaining({ name: "AB" }),
    );
  });
  it("shows the stored player's name after hydration", async () => {
    vi.useRealTimers();
    localStorage.setItem("av_user", JSON.stringify({ name: "PX_KAI" }));
    const markup = renderToString(
      <AuthProvider>
        <PlayerScreen game={GAMES[0]} />
      </AuthProvider>,
    );
    const container = document.createElement("div");
    container.innerHTML = markup;
    document.body.append(container);
    const root = hydrateRoot(
      container,
      <AuthProvider>
        <PlayerScreen game={GAMES[0]} />
      </AuthProvider>,
    );
    await act(async () => {});
    expect(container.querySelector(".hud-stat .v")?.textContent).toBe("PX_KAI");
    root.unmount();
    container.remove();
  });
});
