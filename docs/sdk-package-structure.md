# SDK Package Structure

This document describes the `lens-login` package structure and how it integrates with the demo app.

## Structure

```txt
packages/
  lens-login/
    src/
      client/        — wallet connection helper
      server/        — ID token verification + account resolution
      shared/        — shared types and utilities

lib/
  lens/
    api.ts           — demo app's HTTP calls to its own API routes
    browser.ts       — browser-side Lens client + wallet helpers
    server.ts        — demo app's login/link logic (user management, session, DB)
```

`packages/lens-login` is the reusable SDK. `lib/lens/*` is demo app glue code.

## Design principles

1. **Transport is not our concern.** The SDK does not dictate how your frontend communicates with your backend. The client only handles wallet connection. The server only handles verification logic. How you send data between them (REST, tRPC, GraphQL, etc.) is up to you.

2. **Identity management is not our concern.** The SDK does not manage users, sessions, or storage. It verifies tokens and resolves Lens identities. How you map those identities to your own user system is up to you.

## Client

Entrypoint:

```ts
import { createLensLoginClient } from "@demo/lens-login/client";
```

Responsibilities:

- Connect an EVM wallet via injected provider (e.g. MetaMask).

The client does **not** make HTTP requests. It does not handle Lens login, account discovery, or session verification.

## Server

Entrypoint:

```ts
import { createLensLoginServer } from "@demo/lens-login/server";
```

Responsibilities:

- `discoverAccounts(walletAddress)` — query the Lens API for accounts managed by a wallet.
- `verifyIdToken(idToken)` — verify the JWT signature, issuer, audience, expiration, and role; return the decoded claims.
- `resolveIdentity({ signerAddress, lensAccountAddress })` — fetch the full Lens account profile and return a verified identity object.
- `toErrorResponse(error)` — convert errors into HTTP-friendly responses.

The server does **not** manage users, sessions, or database storage. After calling `verifyIdToken` and `resolveIdentity`, you handle your own user lookup/creation, identity persistence, and session management.

## Auth Flow

1. The browser connects MetaMask or another injected EVM wallet.
2. The browser calls its own backend to discover Lens accounts for that wallet.
3. The browser calls Lens `PublicClient.login()` for the selected account and obtains a `SessionClient`.
4. The browser reads `idToken` from `sessionClient.getCredentials()`.
5. The browser submits `{ type, idToken }` to its own backend.
6. The backend calls `server.verifyIdToken(idToken)` — verifies the JWT.
7. The backend calls `server.resolveIdentity(claims)` — resolves the Lens account profile.
8. The backend handles its own user management: look up/create user, persist identity, create session.

Steps 2, 5, and 8 are the application's responsibility. The SDK provides only the Lens-specific logic (steps 6-7).

## Important Types

- `LensAuthIntent`: `"login" | "link"`
- `LensIdTokenClaims`: decoded token claims (signerAddress, lensAccountAddress, authenticationId, role)
- `LensAccountsRequest` / `LensAccountsResponse`
- `LensVerifiedIdentity`: resolved identity with providerSubject, addresses, username, metadata
- `LensLoginClient`
- `LensLoginServer`

## Token Claims

For authenticated Lens account sessions, the server expects:

- `sub`: signer wallet address.
- `act.sub`: Lens account address used by the session.
- `aud`: Lens App address.
- `iss`: Lens API origin for the configured environment.
- `sid`: Lens authentication/session ID.
- `tag:lens.dev,2024:role`: `ACCOUNT_OWNER` or `ACCOUNT_MANAGER`.

Local identity subject is the Lens account, not the wallet:

```txt
lens:<act.sub>
```
