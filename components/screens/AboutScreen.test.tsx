import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AboutScreen from "./AboutScreen";

function fillValidForm() {
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
}

describe("AboutScreen", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true } as Response),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shakes the form and does not show success when a required field is empty", () => {
    vi.useFakeTimers();
    render(<AboutScreen />);
    fireEvent.click(screen.getByText("▶ ENVIAR MENSAJE"));
    expect(screen.getByText("▶ ENVIAR MENSAJE").closest("form")).toHaveClass(
      "shake",
    );
    expect(screen.queryByText("VAULT-OS // TERMINAL")).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(
      screen.getByText("▶ ENVIAR MENSAJE").closest("form"),
    ).not.toHaveClass("shake");
    vi.useRealTimers();
  });

  it("shows an accessible error message and marks empty fields invalid when a required field is missing", () => {
    render(<AboutScreen />);
    fireEvent.change(screen.getByPlaceholderText("px_kai"), {
      target: { value: "px_kai" },
    });
    fireEvent.change(screen.getByPlaceholderText("jugador@vault.gg"), {
      target: { value: "px@vault.gg" },
    });
    // msg left empty
    fireEvent.click(screen.getByText("▶ ENVIAR MENSAJE"));

    expect(
      screen.getByRole("alert"),
    ).toHaveTextContent("Completa todos los campos antes de enviar.");
    expect(screen.getByPlaceholderText("px_kai")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
    expect(screen.getByPlaceholderText("jugador@vault.gg")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
    expect(
      screen.getByPlaceholderText("Cuéntanos qué tienes en mente…"),
    ).toHaveAttribute("aria-invalid", "true");
  });

  it("disables the submit button while the request is in flight", async () => {
    let resolveFetch: (value: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
      ),
    );
    render(<AboutScreen />);
    fillValidForm();
    fireEvent.click(screen.getByText("▶ ENVIAR MENSAJE"));

    expect(screen.getByRole("button", { name: /ENVIANDO/ })).toBeDisabled();

    await act(async () => {
      resolveFetch({ ok: true } as Response);
    });
  });

  it("posts the form to /api/contact and shows the terminal success state on a valid submit", async () => {
    render(<AboutScreen />);
    fillValidForm();
    fireEvent.click(screen.getByText("▶ ENVIAR MENSAJE"));

    await waitFor(() => {
      expect(screen.getByText(/GRACIAS, PX_KAI/)).toBeInTheDocument();
    });
    expect(
      screen.getByText(/GRACIAS, PX_KAI/).closest('[role="status"]'),
    ).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/contact",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows a send-failure message and does not show success when the API call fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false } as Response),
    );
    render(<AboutScreen />);
    fillValidForm();
    fireEvent.click(screen.getByText("▶ ENVIAR MENSAJE"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "No se pudo enviar el mensaje. Intenta de nuevo.",
      );
    });
    expect(screen.queryByText("VAULT-OS // TERMINAL")).not.toBeInTheDocument();
  });

  it("clears a stale send-failure message when a subsequent submit fails validation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false } as Response),
    );
    render(<AboutScreen />);
    fillValidForm();
    fireEvent.click(screen.getByText("▶ ENVIAR MENSAJE"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "No se pudo enviar el mensaje. Intenta de nuevo.",
      );
    });

    // blank a required field, then resubmit — no send is attempted this time
    vi.useFakeTimers();
    fireEvent.change(
      screen.getByPlaceholderText("Cuéntanos qué tienes en mente…"),
      { target: { value: "" } },
    );
    fireEvent.click(screen.getByText("▶ ENVIAR MENSAJE"));

    // let the 400ms validation-error window elapse — the stale send-failure
    // message must not reappear afterward
    act(() => {
      vi.advanceTimersByTime(400);
    });
    vi.useRealTimers();

    expect(
      screen.queryByText("No se pudo enviar el mensaje. Intenta de nuevo."),
    ).not.toBeInTheDocument();
  });

  it("resets to a blank form after choosing to send another message", async () => {
    render(<AboutScreen />);
    fillValidForm();
    fireEvent.click(screen.getByText("▶ ENVIAR MENSAJE"));
    await waitFor(() => {
      expect(screen.getByText("ENVIAR OTRO MENSAJE")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("ENVIAR OTRO MENSAJE"));
    expect(screen.getByPlaceholderText("px_kai")).toHaveValue("");
    expect(screen.getByPlaceholderText("jugador@vault.gg")).toHaveValue("");
    expect(
      screen.getByPlaceholderText("Cuéntanos qué tienes en mente…"),
    ).toHaveValue("");
  });
});
