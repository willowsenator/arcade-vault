import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthProvider";

function Probe() {
  const { user, login, signOut } = useAuth();
  return <div><div data-testid="user">{user ? user.name : "none"}</div><button onClick={() => login({ name: "PX_KAI" })}>login</button><button onClick={() => login(null)}>guest</button><button onClick={signOut}>signout</button></div>;
}

describe("AuthProvider", () => {
  beforeEach(() => localStorage.clear());
  it("login sets user and persists to localStorage", () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    fireEvent.click(screen.getByText("login"));
    expect(screen.getByTestId("user")).toHaveTextContent("PX_KAI");
    expect(localStorage.getItem("av_user")).toBe(JSON.stringify({ name: "PX_KAI" }));
  });
  it("guest sets user to null", () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    fireEvent.click(screen.getByText("login"));
    fireEvent.click(screen.getByText("guest"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });
  it("signOut clears user and localStorage", () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    fireEvent.click(screen.getByText("login"));
    fireEvent.click(screen.getByText("signout"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(localStorage.getItem("av_user")).toBeNull();
  });
  it("loads a previously stored user on mount", () => {
    localStorage.setItem("av_user", JSON.stringify({ name: "NEONFOX" }));
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByTestId("user")).toHaveTextContent("NEONFOX");
  });
});
