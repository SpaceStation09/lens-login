import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyPassword } from "@/lib/auth/password";
import { toPublicUser } from "@/lib/auth/public-user";
import { setSessionCookie } from "@/lib/auth/session";
import { createSession, getUserByUsername } from "@/lib/db/store";

const schema = z.object({
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const payload = schema.parse(await request.json());
  const user = await getUserByUsername(payload.username.toLowerCase());

  if (!user || !user.passwordHash || !verifyPassword(payload.password, user.passwordHash)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Username or password is incorrect.",
        },
      },
      { status: 401 },
    );
  }

  const session = await createSession(user.id);
  await setSessionCookie(session.id);

  return NextResponse.json({ ok: true, user: toPublicUser(user) });
}
