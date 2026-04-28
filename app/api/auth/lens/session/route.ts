import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { toPublicUser } from "@/lib/auth/public-user";
import { getCurrentUser } from "@/lib/auth/session";
import { createLensLoginServer } from "@/lib/lens/server";

const schema = z.object({
  type: z.enum(["login", "link"]),
  idToken: z.string().min(1),
});

const lensLoginServer = createLensLoginServer();

export async function POST(request: Request) {
  try {
    const payload = schema.parse(await request.json());
    const user = await getCurrentUser(await cookies());
    const result = await lensLoginServer.verifySession({
      ...payload,
      currentUserId: user?.id ?? null,
    });
    return NextResponse.json({
      ...result,
      user: toPublicUser(result.user),
    });
  } catch (error) {
    const response = lensLoginServer.toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
