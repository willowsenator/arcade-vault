import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Nav, { isActive } from "./Nav";
import { AuthProvider } from "./AuthProvider";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("isActive", () => {
  it("marks biblioteca active on / and /games/*", () => {
    expect(isActive("/", "biblioteca")).toBe(true);
    expect(isActive("/games/caida", "biblioteca")).toBe(true);
    expect(isActive("/games/caida/play", "biblioteca")).toBe(true);
    expect(isActive("/leaderboard", "biblioteca")).toBe(false);
  });
  it("marks salon active only on /leaderboard", () => {
    expect(isActive("/leaderboard", "salon")).toBe(true);
    expect(isActive("/", "salon")).toBe(false);
  });
  it("marks auth active only on /auth", () => {
    expect(isActive("/auth", "auth")).toBe(true);
    expect(isActive("/", "auth")).toBe(false);
  });
});

describe("Nav", () => {
  it("marks Biblioteca link active on the home route", () => {
    render(<AuthProvider><Nav /></AuthProvider>);
    expect(screen.getAllByText("Biblioteca")[0]).toHaveClass("active");
  });
  it("opens the mobile panel on hamburger click", () => {
    render(<AuthProvider><Nav /></AuthProvider>);
    fireEvent.click(screen.getByLabelText("Menú"));
    expect(screen.getByText("MENÚ").closest("aside")).toHaveClass("open");
  });
});
