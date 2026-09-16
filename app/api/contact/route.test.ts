import { beforeEach, describe, expect, it, vi } from "vitest";

const sendContactEmailMock = vi.fn();

vi.mock("@/lib/resend", () => ({
  sendContactEmail: sendContactEmailMock,
}));

const { POST } = await import("./route");

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/contact", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/contact", () => {
  beforeEach(() => {
    sendContactEmailMock.mockReset();
  });

  it("returns 400 and does not call sendContactEmail when email is missing", async () => {
    const response = await POST(
      makeRequest({ name: "Kai", email: "", msg: "Hola" }),
    );

    expect(response.status).toBe(400);
    expect(sendContactEmailMock).not.toHaveBeenCalled();
  });

  it("returns 400 when name is missing", async () => {
    const response = await POST(
      makeRequest({ name: "", email: "kai@vault.gg", msg: "Hola" }),
    );

    expect(response.status).toBe(400);
    expect(sendContactEmailMock).not.toHaveBeenCalled();
  });

  it("returns 400 when msg is missing", async () => {
    const response = await POST(
      makeRequest({ name: "Kai", email: "kai@vault.gg", msg: "" }),
    );

    expect(response.status).toBe(400);
    expect(sendContactEmailMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the request body is not valid JSON", async () => {
    const request = new Request("http://localhost/api/contact", {
      method: "POST",
      body: "not json",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("trims fields and returns 200 with ok:true when the email sends successfully", async () => {
    sendContactEmailMock.mockResolvedValue({ ok: true });

    const response = await POST(
      makeRequest({ name: " Kai ", email: " kai@vault.gg ", msg: " Hola " }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(sendContactEmailMock).toHaveBeenCalledWith({
      name: "Kai",
      email: "kai@vault.gg",
      msg: "Hola",
    });
  });

  it("returns 502 with generic error message when sending fails", async () => {
    sendContactEmailMock.mockResolvedValue({ ok: false, error: "boom" });

    const response = await POST(
      makeRequest({ name: "Kai", email: "kai@vault.gg", msg: "Hola" }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Failed to send message",
    });
  });
});
