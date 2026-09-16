import { NextResponse } from "next/server";
import { sendContactEmail } from "@/lib/resend";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body" },
      { status: 400 },
    );
  }

  const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const NAME_MAX_LENGTH = 100;
  const EMAIL_MAX_LENGTH = 200;
  const MSG_MAX_LENGTH = 5000;

  const { name, email, msg } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > NAME_MAX_LENGTH ||
    typeof email !== "string" ||
    !email.trim() ||
    email.trim().length > EMAIL_MAX_LENGTH ||
    !EMAIL_FORMAT.test(email.trim()) ||
    typeof msg !== "string" ||
    !msg.trim() ||
    msg.trim().length > MSG_MAX_LENGTH
  ) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 },
    );
  }

  const result = await sendContactEmail({
    name: name.trim(),
    email: email.trim(),
    msg: msg.trim(),
  });

  if (!result.ok) {
    console.error("Contact form email send failed:", result.error);
    return NextResponse.json(
      { ok: false, error: "Failed to send message" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
