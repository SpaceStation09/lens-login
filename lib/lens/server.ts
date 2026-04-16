import { setSessionCookie } from "@/lib/auth/session";
import {
  createChallenge,
  createLensIdentity,
  createSession,
  createUser,
  getChallengeById,
  getIdentityByProviderSubject,
  getUserById,
  markChallengeUsed,
} from "@/lib/db/store";
import { createLensLoginServer as createSdkLensLoginServer, LensLoginServerError } from "@demo/lens-login/server";

export { LensLoginServerError };

export function createLensLoginServer() {
  return createSdkLensLoginServer({
    storage: {
      createChallenge,
      getChallengeById,
      markChallengeUsed,
      getIdentityByProviderSubject,
      async createLensIdentity(input) {
        return createLensIdentity({
          userId: input.userId,
          provider: "lens",
          providerSubject: input.providerSubject,
          walletAddress: input.walletAddress,
          lensAccountAddress: input.lensAccountAddress,
          lensUsernameFull: input.lensUsernameFull,
          lensUsernameLocalName: input.lensUsernameLocalName,
          lensUsernameNamespace: input.lensUsernameNamespace,
          lensDisplayName: input.lensDisplayName,
          lensPictureUrl: input.lensPictureUrl,
        });
      },
    },
    async setSession(user) {
      const session = await createSession(user.id);
      await setSessionCookie(session.id);
    },
    findUserById: getUserById,
    async createUser() {
      return createUser({
        email: null,
        passwordHash: null,
      });
    },
  });
}
