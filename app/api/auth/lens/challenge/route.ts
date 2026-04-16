import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { createLensLoginServer } from "@/lib/lens/server";

const schema = z.object({
  type: z.enum(["login", "link"]),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  lensAccountAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const lensLoginServer = createLensLoginServer();

export async function POST(request: Request) {
  try {
    const payload = schema.parse(await request.json());
    const user = await getCurrentUser(await cookies());
    const challenge = await lensLoginServer.createChallenge({
      ...payload,
      currentUserId: user?.id ?? null,
    });
    return NextResponse.json(challenge);
  } catch (error) {
    const response = lensLoginServer.toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
