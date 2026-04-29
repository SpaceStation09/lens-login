import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { hashPassword } from "@/lib/auth/password";
import { toPublicUser } from "@/lib/auth/public-user";
import { getCurrentUser } from "@/lib/auth/session";
import { completeUserAccount, getUserByUsername } from "@/lib/db/store";

const schema = z.object({
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const user = await getCurrentUser(await cookies());

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "You must be logged in to complete account setup.",
        },
      },
      { status: 401 },
    );
  }

  if (user.username || user.passwordHash) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "ACCOUNT_ALREADY_COMPLETED",
          message: "This account already has username/password credentials.",
        },
      },
      { status: 409 },
    );
  }

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

  const completed = await completeUserAccount(user.id, {
    username,
    passwordHash: hashPassword(payload.password),
  });

  if (!completed) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "ACCOUNT_NOT_COMPLETABLE",
          message: "This account cannot be completed.",
        },
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, user: toPublicUser(completed) });
}
