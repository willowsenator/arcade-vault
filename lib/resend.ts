import { Resend } from "resend";

export type ContactPayload = { name: string; email: string; msg: string };
export type SendResult = { ok: true } | { ok: false; error: string };

const CONTACT_RECIPIENT = "willownsenator@gmail.com";
const CONTACT_FROM = "Arcade Vault <onboarding@resend.dev>";

export async function sendContactEmail(
  payload: ContactPayload,
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY is not configured" };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: CONTACT_FROM,
    to: [CONTACT_RECIPIENT],
    replyTo: payload.email,
    subject: `Nuevo mensaje de contacto de ${payload.name}`,
    html: `<p><strong>Nombre:</strong> ${escapeHtml(payload.name)}</p><p><strong>Correo:</strong> ${escapeHtml(payload.email)}</p><p><strong>Mensaje:</strong></p><p>${escapeHtml(payload.msg)}</p>`,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
