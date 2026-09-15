import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import Nav, { isActive } from "./Nav";
import { AuthProvider } from "./AuthProvider";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

describe("isActive", () => {
  it("marks inicio active only on the root route", () => {
    expect(isActive("/", "inicio")).toBe(true);
    expect(isActive("/biblioteca", "inicio")).toBe(false);
  });
  it("marks biblioteca active on /biblioteca and /games/*", () => {
    expect(isActive("/biblioteca", "biblioteca")).toBe(true);
    expect(isActive("/games/caida", "biblioteca")).toBe(true);
    expect(isActive("/games/caida/play", "biblioteca")).toBe(true);
    expect(isActive("/", "biblioteca")).toBe(false);
    expect(isActive("/leaderboard", "biblioteca")).toBe(false);
  });
  it("marks salon active only on /leaderboard", () => {
    expect(isActive("/leaderboard", "salon")).toBe(true);
    expect(isActive("/", "salon")).toBe(false);
  });
  it("marks about active only on /about", () => {
    expect(isActive("/about", "about")).toBe(true);
    expect(isActive("/", "about")).toBe(false);
  });
  it("marks auth active only on /auth", () => {
    expect(isActive("/auth", "auth")).toBe(true);
    expect(isActive("/", "auth")).toBe(false);
  });
});

describe("Nav", () => {
  it("marks Inicio link active on the home route", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(
      <AuthProvider>
        <Nav />
      </AuthProvider>,
    );
    expect(screen.getAllByText("Inicio")[0]).toHaveClass("active");
  });
  it("marks Biblioteca link active on the library route", () => {
    vi.mocked(usePathname).mockReturnValue("/biblioteca");
    render(
      <AuthProvider>
        <Nav />
      </AuthProvider>,
    );
    expect(screen.getAllByText("Biblioteca")[0]).toHaveClass("active");
  });
  it("opens the mobile panel on hamburger click", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(
      <AuthProvider>
        <Nav />
      </AuthProvider>,
    );
    fireEvent.click(screen.getByLabelText("Menú"));
    expect(screen.getByText("MENÚ").closest("aside")).toHaveClass("open");
  });
});
