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

  const { name, email, msg } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof msg !== "string" ||
    !msg.trim()
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
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
