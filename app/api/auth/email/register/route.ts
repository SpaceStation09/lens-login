import { NextResponse } from "next/server";
import { z } from "zod";

import { hashPassword } from "@/lib/auth/password";
import { createSession, createUser, getUserByEmail } from "@/lib/db/store";
import { setSessionCookie } from "@/lib/auth/session";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const payload = schema.parse(await request.json());

  const existing = await getUserByEmail(payload.email);
  if (existing) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "EMAIL_EXISTS",
          message: "That email is already registered.",
        },
      },
      { status: 409 },
    );
  }

  const user = await createUser({
    email: payload.email.toLowerCase(),
    passwordHash: hashPassword(payload.password),
  });
  const session = await createSession(user.id);
  await setSessionCookie(session.id);

  return NextResponse.json({ ok: true, user });
}
