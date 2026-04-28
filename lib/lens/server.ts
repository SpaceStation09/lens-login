import { setSessionCookie } from "@/lib/auth/session";
import {
  createLensIdentity,
  createSession,
  createUser,
  getIdentityByProviderSubject,
  getUserById,
} from "@/lib/db/store";
import { createLensLoginServer as createSdkServer, LensLoginServerError } from "@demo/lens-login/server";
import type { LensVerifiedIdentity } from "@demo/lens-login/shared";

export { LensLoginServerError };

const server = createSdkServer();

export const discoverAccounts = server.discoverAccounts;

async function persistIdentity(userId: string, identity: LensVerifiedIdentity) {
  await createLensIdentity({
    userId,
    provider: "lens",
    providerSubject: identity.providerSubject,
    walletAddress: identity.walletAddress,
    lensAccountAddress: identity.lensAccountAddress,
    lensUsernameFull: identity.username?.fullHandle ?? null,
    lensUsernameLocalName: identity.username?.localName ?? null,
    lensUsernameNamespace: identity.username?.namespace ?? null,
    lensDisplayName: identity.metadata?.displayName ?? null,
    lensPictureUrl: identity.metadata?.picture ?? null,
  });
}

export async function verifySession(input: { type: "login" | "link"; idToken: string; currentUserId: string | null }) {
  const tokenClaims = await server.verifyIdToken(input.idToken);
  const identity = await server.resolveIdentity({
    signerAddress: tokenClaims.signerAddress,
    lensAccountAddress: tokenClaims.lensAccountAddress,
  });

  if (input.type === "link") {
    if (!input.currentUserId) {
      throw new LensLoginServerError("UNAUTHORIZED", "You must be logged in to bind a Lens account.", 401);
    }

    const existing = await getIdentityByProviderSubject(identity.providerSubject);
    if (existing && existing.userId !== input.currentUserId) {
      throw new LensLoginServerError("IDENTITY_ALREADY_LINKED", "That Lens identity is already linked to another user.");
    }

    if (!existing) {
      await persistIdentity(input.currentUserId, identity);
    }

    const user = await getUserById(input.currentUserId);
    if (!user) {
      throw new LensLoginServerError("UNAUTHORIZED", "User session no longer exists.", 401);
    }

    return { ok: true as const, action: "link" as const, user, identity, isNewUser: false };
  }

  const existing = await getIdentityByProviderSubject(identity.providerSubject);
  let user = existing ? await getUserById(existing.userId) : null;
  let isNewUser = false;

  if (!user) {
    user = await createUser({ username: null, passwordHash: null });
    await persistIdentity(user.id, identity);
    isNewUser = true;
  }

  const session = await createSession(user.id);
  await setSessionCookie(session.id);

  return { ok: true as const, action: "login" as const, user, identity, isNewUser };
}

export const toErrorResponse = server.toErrorResponse;
