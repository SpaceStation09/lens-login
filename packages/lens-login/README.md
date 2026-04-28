# @demo/lens-login

Lens Protocol login SDK for Next.js apps. Provides client-side wallet interaction, account discovery, and server-side session verification via Lens ID tokens.

## Public entrypoints

- `@demo/lens-login` — re-exports everything below
- `@demo/lens-login/client` — browser-side client
- `@demo/lens-login/server` — server-side session handler
- `@demo/lens-login/shared` — shared types

## Client API

```ts
import { createLensLoginClient, LensLoginClientError } from "@demo/lens-login/client"

const client = createLensLoginClient({
  apiBasePath: "/api/auth/lens",  // optional, defaults to /api/auth/lens
  ethereum: window.ethereum,       // optional, auto-detected if omitted
  fetch: globalThis.fetch,        // optional, defaults to native fetch
})

// Prompt the user to connect their EVM wallet
const walletAddress = await client.connectWallet()

// Discover Lens accounts managed by the connected wallet
const { accounts } = await client.discoverAccounts({ walletAddress })

// Verify a Lens ID token to create or link a session
const result = await client.verifySession({
  type: "login",  // or "link" to bind to an existing session
  idToken,
})
```

`connectWallet` and all client methods throw `LensLoginClientError` with `code`, `message`, and `status` fields.

## Server API

```ts
import { createLensLoginServer, LensLoginServerError } from "@demo/lens-login/server"

const server = createLensLoginServer({
  environment: "testnet",  // optional, falls back to NEXT_PUBLIC_LENS_ENV or "testnet"
  origin: "https://...",   // optional, falls back to NEXT_PUBLIC_APP_ORIGIN or localhost:3000
  appAddress: "0x...",     // optional, falls back to NEXT_PUBLIC_LENS_APP_ADDRESS or default per environment
  storage: {
    getIdentityByProviderSubject,
    createLensIdentity,
  },
  setSession,
  findUserById,
  createUser,
})
```

The server exposes three methods:

- `discoverAccounts(input)` — look up Lens accounts for a wallet address
- `verifySession(input)` — verify a Lens ID token, create/link a user, and set the session
- `toErrorResponse(error)` — convert any thrown error into a `{ status, body }` response

All server methods throw `LensLoginServerError` with `code`, `message`, and `status` fields.

## Shared types

Import via `@demo/lens-login/shared`:

| Type | Description |
|------|-------------|
| `LensLoginClientOptions` | Client configuration (apiBasePath, ethereum provider, fetch) |
| `LensLoginClient<TUser>` | Returned client interface |
| `LensLoginServerOptions<TUser>` | Server configuration (environment, storage, session) |
| `LensLoginServer<TUser>` | Returned server interface |
| `LensLoginServerStorage` | Storage adapter interface |
| `LensLoginServerCreateIdentityInput` | Input for creating a Lens identity record |
| `LensLoginServerStoredIdentity` | Stored identity shape returned by storage |
| `LensAccountsRequest` | `{ walletAddress }` |
| `LensAccountsResponse` | `{ walletAddress, accounts }` |
| `LensSessionRequest` | `{ type, idToken }` |
| `LensVerifyResponse<TUser>` | Verified session response |
| `LensAuthIntent` | `"login" \| "link"` |
| `LensDiscoveredAccount` | Account shape with address, username, metadata |
| `LensVerifiedIdentity` | Verified identity with provider subject |
| `LensApiError` | Error response shape |
| `LensApiErrorCode` | Union of error code strings |
