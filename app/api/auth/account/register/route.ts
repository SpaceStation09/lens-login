import { NextResponse } from "next/server";
import { z } from "zod";

import { hashPassword } from "@/lib/auth/password";
import { toPublicUser } from "@/lib/auth/public-user";
import { createSession, createUser, getUserByUsername } from "@/lib/db/store";
import { setSessionCookie } from "@/lib/auth/session";

const schema = z.object({
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const payload = schema.parse(await request.json());
  const username = payload.username.toLowerCase();

  const existing = await getUserByUsername(username);
  if (existing) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "USERNAME_EXISTS",
          message: "That username is already registered.",
        },
      },
      { status: 409 },
    );
  }

  const user = await createUser({
    username,
    passwordHash: hashPassword(payload.password),
  });
  const session = await createSession(user.id);
  await setSessionCookie(session.id);

  return NextResponse.json({ ok: true, user: toPublicUser(user) });
}
