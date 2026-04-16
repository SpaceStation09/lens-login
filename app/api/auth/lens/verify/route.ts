import { NextResponse } from "next/server";
import { z } from "zod";

import { createLensLoginServer } from "@/lib/lens/server";

const schema = z.object({
  challengeId: z.string().min(1),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

const lensLoginServer = createLensLoginServer();

export async function POST(request: Request) {
  try {
    const payload = schema.parse(await request.json());
    const result = await lensLoginServer.verifyChallenge({
      challengeId: payload.challengeId,
      signature: payload.signature as `0x${string}`,
    });
    return NextResponse.json(result);
  } catch (error) {
    const response = lensLoginServer.toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
