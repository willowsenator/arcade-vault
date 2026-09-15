import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import AboutScreen from "./AboutScreen";

describe("AboutScreen", () => {
  it("shakes the form and does not show success when a required field is empty", () => {
    vi.useFakeTimers();
    render(<AboutScreen />);
    fireEvent.click(screen.getByText("▶ ENVIAR MENSAJE"));
    expect(screen.getByText("▶ ENVIAR MENSAJE").closest("form")).toHaveClass(
      "shake",
    );
    expect(screen.queryByText("VAULT-OS // TERMINAL")).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(
      screen.getByText("▶ ENVIAR MENSAJE").closest("form"),
    ).not.toHaveClass("shake");
    vi.useRealTimers();
  });

  it("shows the terminal success state referencing the submitted name on a valid submit", () => {
    render(<AboutScreen />);
    fireEvent.change(screen.getByPlaceholderText("px_kai"), {
      target: { value: "px_kai" },
    });
    fireEvent.change(screen.getByPlaceholderText("jugador@vault.gg"), {
      target: { value: "px@vault.gg" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Cuéntanos qué tienes en mente…"),
      { target: { value: "Hola!" } },
    );
    fireEvent.click(screen.getByText("▶ ENVIAR MENSAJE"));
    expect(screen.getByText(/GRACIAS, PX_KAI/)).toBeInTheDocument();
  });

  it("resets to a blank form after choosing to send another message", () => {
    render(<AboutScreen />);
    fireEvent.change(screen.getByPlaceholderText("px_kai"), {
      target: { value: "px_kai" },
    });
    fireEvent.change(screen.getByPlaceholderText("jugador@vault.gg"), {
      target: { value: "px@vault.gg" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Cuéntanos qué tienes en mente…"),
      { target: { value: "Hola!" } },
    );
    fireEvent.click(screen.getByText("▶ ENVIAR MENSAJE"));
    fireEvent.click(screen.getByText("ENVIAR OTRO MENSAJE"));
    expect(screen.getByPlaceholderText("px_kai")).toHaveValue("");
  });
});
