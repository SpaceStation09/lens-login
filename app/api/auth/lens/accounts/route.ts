import { NextResponse } from "next/server";
import { z } from "zod";

import { discoverAccounts, toErrorResponse } from "@/lib/lens/server";

const schema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

export async function POST(request: Request) {
  try {
    const payload = schema.parse(await request.json());
    const result = await discoverAccounts(payload);
    return NextResponse.json(result);
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
