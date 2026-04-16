import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { clearSessionCookie, getCurrentSessionId } from "@/lib/auth/session";
import { deleteSession } from "@/lib/db/store";

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = await getCurrentSessionId(cookieStore);

  if (sessionId) {
    await deleteSession(sessionId);
  }

  await clearSessionCookie();

  return NextResponse.json({ ok: true });
}
