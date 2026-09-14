import { beforeEach, describe, expect, it, vi } from "vitest";
import GameDetailPage from "./page";
import PlayerPage from "./play/page";

const { notFound } = vi.hoisted(() => ({
  notFound: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound }));

describe("game routes", () => {
  beforeEach(() => notFound.mockClear());

  it("calls notFound for an unknown detail game id", async () => {
    await GameDetailPage({ params: Promise.resolve({ id: "does-not-exist" }) });
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("calls notFound for an unknown player game id", async () => {
    await PlayerPage({ params: Promise.resolve({ id: "does-not-exist" }) });
    expect(notFound).toHaveBeenCalledOnce();
  });
});
