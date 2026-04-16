import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { createSession, getUserByEmail } from "@/lib/db/store";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const payload = schema.parse(await request.json());
  const user = await getUserByEmail(payload.email);

  if (!user || !user.passwordHash || !verifyPassword(payload.password, user.passwordHash)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Email or password is incorrect.",
        },
      },
      { status: 401 },
    );
  }

  const session = await createSession(user.id);
  await setSessionCookie(session.id);

  return NextResponse.json({ ok: true, user });
}
