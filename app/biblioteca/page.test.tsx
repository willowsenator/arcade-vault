import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const loader = vi.hoisted(() => ({ withScores: vi.fn() }));
vi.mock("@/lib/load-scores", () => loader);

const { default: BibliotecaPage } = await import("./page");
const { fetchGameStats } = await import("@/lib/score-queries");

describe("BibliotecaPage", () => {
  beforeEach(() => {
    loader.withScores.mockReset();
  });

  it("loads the game stats through withScores and shows the best scores", async () => {
    loader.withScores.mockResolvedValue({ rocas: { best: 42000, plays: 5 } });
    render(await BibliotecaPage());
    expect(loader.withScores).toHaveBeenCalledWith(fetchGameStats);
    expect(screen.getByText("42.000")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("rejects when the scores cannot be loaded", async () => {
    const failure = new Error("scores down");
    loader.withScores.mockRejectedValue(failure);
    await expect(BibliotecaPage()).rejects.toBe(failure);
  });
});
