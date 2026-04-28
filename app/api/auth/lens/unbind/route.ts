import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { deleteLensIdentitiesForUser } from "@/lib/db/store";

export async function POST() {
  const user = await getCurrentUser(await cookies());

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "You must be logged in to clear Lens bindings.",
        },
      },
      { status: 401 },
    );
  }

  const deleted = await deleteLensIdentitiesForUser(user.id);
  return NextResponse.json({ ok: true, deleted });
}
