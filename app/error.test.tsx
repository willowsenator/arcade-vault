import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ErrorBoundary from "./error";
import { PAGE_ERROR } from "@/lib/messages";

describe("app error boundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the neutral page error in an alert without the error's own message", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorBoundary error={new Error("distinctive-secret-detail")} retry={() => {}} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(PAGE_ERROR);
    expect(alert).not.toHaveTextContent("distinctive-secret-detail");
  });

  it("retries the segment when REINTENTAR is clicked", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const retry = vi.fn();
    render(<ErrorBoundary error={new Error("boom")} retry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: "REINTENTAR" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("logs the error client-side", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("boom");
    render(<ErrorBoundary error={error} retry={() => {}} />);
    expect(errorSpy).toHaveBeenCalledWith(error);
  });
});
