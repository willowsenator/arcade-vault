import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function() {
    return {
      emails: { send: sendMock },
    };
  }),
}));

const { sendContactEmail } = await import("./resend");

describe("sendContactEmail", () => {
  beforeEach(() => {
    sendMock.mockReset();
    vi.stubEnv("RESEND_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns ok:false without calling Resend when RESEND_API_KEY is unset", async () => {
    vi.stubEnv("RESEND_API_KEY", "");

    const result = await sendContactEmail({
      name: "Kai",
      email: "kai@vault.gg",
      msg: "Hola",
    });

    expect(result).toEqual({
      ok: false,
      error: "RESEND_API_KEY is not configured",
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("sends to the site owner with reply-to set to the submitter and returns ok:true on success", async () => {
    sendMock.mockResolvedValue({ data: { id: "abc" }, error: null });

    const result = await sendContactEmail({
      name: "Kai",
      email: "kai@vault.gg",
      msg: "Hola",
    });

    expect(result).toEqual({ ok: true });
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Arcade Vault <onboarding@resend.dev>",
        to: ["willownsenator@gmail.com"],
        replyTo: "kai@vault.gg",
        subject: "Nuevo mensaje de contacto de Kai",
      }),
    );
  });

  it("escapes HTML in submitted fields before building the email body", async () => {
    sendMock.mockResolvedValue({ data: { id: "abc" }, error: null });

    await sendContactEmail({
      name: "<b>Kai</b>",
      email: "kai@vault.gg",
      msg: "<script>alert(1)</script>",
    });

    const call = sendMock.mock.calls[0][0];
    expect(call.html).not.toContain("<script>");
    expect(call.html).toContain("&lt;script&gt;");
  });

  it("returns ok:false with the Resend error message when the send fails", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "invalid domain" },
    });

    const result = await sendContactEmail({
      name: "Kai",
      email: "kai@vault.gg",
      msg: "Hola",
    });

    expect(result).toEqual({ ok: false, error: "invalid domain" });
  });
});
