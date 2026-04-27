# SDK Package Structure

This document describes the current `lens-login` package split after the ID-token based refactor.

## Structure

```txt
packages/
  lens-login/
    src/
      client/
      server/
      shared/

lib/
  lens/
    server.ts
    types.ts
```

`packages/lens-login` contains the reusable SDK-style code. `lib/lens/*` adapts it to this Next.js demo app.

## Client

Entrypoint:

```ts
import { createLensLoginClient } from "@demo/lens-login/client";
```

Responsibilities:

- Connect an EVM wallet when needed.
- Ask the app server to discover Lens accounts for a wallet.
- Submit a Lens ID token to the app server for local login or local account binding.

The client does not create custom login challenges anymore. Lens authentication happens through the official Lens `PublicClient.login()` flow, which returns a browser-side `SessionClient` for future Lens reads and writes.

## Server

Entrypoint:

```ts
import { createLensLoginServer } from "@demo/lens-login/server";
```

Responsibilities:

- Discover accounts through Lens `PublicClient`.
- Verify Lens ID tokens with Lens JWKS.
- Derive the Lens account from verified token claims, specifically `act.sub`.
- Map `lens:<accountAddress>` to a local user.
- Create the app's local HTTP-only session cookie.

The server does not trust client-submitted Lens account addresses for binding. It binds the account derived from the verified ID token.

## Current Auth Flow

1. The browser connects a Privy wallet.
2. The browser discovers Lens accounts controlled by that wallet.
3. The browser calls Lens `PublicClient.login()` for the selected Lens account and obtains a `SessionClient`.
4. The browser reads `idToken` from `sessionClient.getCredentials()`.
5. The browser submits `{ type, idToken }` to `/api/auth/lens/session`.
6. The server verifies the JWT signature, issuer, audience, expiration, role, and account claims.
7. The server maps the verified Lens account to a local user and creates a local session.

## Important Types

- `LensAuthIntent`: `"login" | "link"`
- `LensAccountsRequest`
- `LensAccountsResponse`
- `LensSessionRequest`
- `LensVerifyResponse<TUser>`
- `LensLoginClient<TUser>`
- `LensLoginServer<TUser>`

## Token Claims

For authenticated Lens account sessions, the server expects:

- `sub`: signer wallet address.
- `act.sub`: Lens account address used by the session.
- `aud`: Lens App address.
- `iss`: Lens API origin for the configured environment.
- `sid`: Lens authentication/session ID.
- `tag:lens.dev,2024:role`: `ACCOUNT_OWNER` or `ACCOUNT_MANAGER`.

Local identity subject remains the Lens account, not the wallet:

```txt
lens:<act.sub>
```
