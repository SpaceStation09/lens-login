# @demo/lens-login

Lens Protocol login SDK. Provides client-side wallet connection, server-side ID token verification, and Lens account resolution.

The SDK handles only the Lens-specific concerns (wallet, token verification, account lookup). User identity management, session creation, and storage are **your** responsibility.

## Public entrypoints

- `@demo/lens-login` — re-exports everything below
- `@demo/lens-login/client` — browser-side wallet connection helper
- `@demo/lens-login/server` — server-side token verification and account resolution
- `@demo/lens-login/shared` — shared types

## Client API

The client is a lightweight browser helper for wallet connection and Lens login. It does not handle HTTP requests — that is your application's responsibility.

### Typical browser flow

```ts
import { createLensLoginClient, LensLoginClientError } from "@demo/lens-login/client"

const client = createLensLoginClient({
  ethereum: window.ethereum,
})

const walletAddress = await client.connectWallet()

const discovered = await client.listAvailableAccounts({
  walletAddress,
})

const authenticated = await client.login({
  lensAccountAddress: discovered.accounts[0].accountAddress,
  walletAddress,
})

authenticated.sessionClient
authenticated.idToken

const liveAccount = await client.getAccount({
  lensAccountAddress: discovered.accounts[0].accountAddress,
})

liveAccount?.metadata?.name
```

Use `authenticated.sessionClient` for subsequent Lens reads and writes. Send `authenticated.idToken` to your backend to establish your own app session. Query account metadata through `client.getAccount()` whenever you need a fresh profile snapshot.

### `createLensLoginClient(options?)`

Creates a Lens login client instance.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `options.ethereum` | `EIP-1193 provider` | No | An injected EVM wallet provider (e.g. `window.ethereum`). If omitted, auto-detects from the browser environment. |
| `options.environment` | `"mainnet" \| "testnet"` | No | Lens network environment. Defaults to `"testnet"`. |
| `options.origin` | `string` | No | App origin passed to the Lens client when needed. |
| `options.appAddress` | `string` | No | Lens App address used during login. Defaults to the built-in app for the selected environment. |
| `options.storage` | `Storage` | No | Storage backend for the Lens client. Defaults to `window.localStorage` in the browser. |

### `client.connectWallet()`

Prompts the user to connect their EVM wallet via `eth_requestAccounts`. Returns the connected wallet address (lowercase).

Throws `LensLoginClientError` with:
- code `"NO_WALLET"` — no injected wallet found
- code `"NO_WALLET_ACCOUNT"` — wallet returned no account

### `client.listAvailableAccounts(input?)`

Lists the Lens accounts that the connected wallet can use for login.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input.walletAddress` | `string` | No | Wallet address to query. If omitted, the client connects the injected wallet first. |

Returns `LensAccountsResponse`:

| Field | Type | Description |
|-------|------|-------------|
| `walletAddress` | `string` | Queried wallet address in lowercase. |
| `accounts` | `LensDiscoveredAccount[]` | Lens accounts owned or managed by that wallet. |

### `client.login(input)`

Signs in to Lens for a specific account and returns the authenticated `SessionClient` plus the current `idToken`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input.lensAccountAddress` | `string` | Yes | The Lens account address to authenticate as. |
| `input.walletAddress` | `string` | No | Expected connected wallet address. If provided and the injected wallet differs, throws `"WALLET_MISMATCH"`. |

Returns `LensClientLoginResult`:

| Field | Type | Description |
|-------|------|-------------|
| `walletAddress` | `string` | Connected wallet address in lowercase. |
| `sessionClient` | `SessionClient` | Authenticated Lens session client. |
| `idToken` | `string` | Lens ID token captured at login time. Send this to your backend for verification. If you need a fresh token later, call `sessionClient.getCredentials()` again. |

### `client.getAccount(input)`

Fetches the latest Lens account profile for a specific account address.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input.lensAccountAddress` | `string` | Yes | The Lens account address to read. |

Returns `LensDiscoveredAccount | null`.

## Server API

The server verifies Lens ID tokens and resolves Lens account details. It does **not** manage users, sessions, or storage — those are your application's responsibility.

```ts
import { createLensLoginServer, LensLoginServerError } from "@demo/lens-login/server"

const server = createLensLoginServer({
  environment: "testnet",
  origin: "https://...",
  appAddress: "0x...",
})
```

### Typical backend flow

```ts
import { createLensLoginServer } from "@demo/lens-login/server"

const server = createLensLoginServer({
  environment: "testnet",
  origin: "https://my-app.example",
  appAddress: "0x...",
})

export async function verifyLensLogin(idToken: string) {
  const claims = await server.verifyIdToken(idToken)
  const identity = await server.resolveIdentity({
    signerAddress: claims.signerAddress,
    lensAccountAddress: claims.lensAccountAddress,
  })

  // Application-owned logic starts here:
  // 1. Look up identity.providerSubject in your database
  // 2. Create or reuse your local user
  // 3. Persist the Lens identity fields you care about
  // 4. Create your own session/cookie

  return { claims, identity }
}
```

### `createLensLoginServer(options?)`

Creates a Lens login server instance.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `options.environment` | `"mainnet" \| "testnet"` | No | Lens network environment. Defaults to `NEXT_PUBLIC_LENS_ENV` env var, falling back to `"testnet"`. |
| `options.origin` | `string` | No | App origin URL passed to the Lens client. Defaults to `NEXT_PUBLIC_APP_ORIGIN` env var, falling back to `"http://localhost:3000"`. |
| `options.appAddress` | `string` | No | Lens App address used to verify the ID token `aud` claim. Defaults to `NEXT_PUBLIC_LENS_APP_ADDRESS` env var, falling back to a built-in default per environment. |

### Server methods

#### `server.discoverAccounts(input)`

Look up Lens accounts managed by a wallet address via the Lens API.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input.walletAddress` | `string` | Yes | The EVM wallet address to query. |

Returns `{ walletAddress, accounts }` where each account is a `LensDiscoveredAccount`.

#### `server.verifyIdToken(idToken)`

Verify a Lens ID token's signature, issuer, audience, expiration, and role. Returns the decoded claims.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `idToken` | `string` | Yes | Lens ID token obtained from `SessionClient.getCredentials()`. |

Returns `LensIdTokenClaims`:

| Field | Type | Description |
|-------|------|-------------|
| `signerAddress` | `string` | Wallet address that signed the login (from `sub`). |
| `lensAccountAddress` | `string` | Lens account address of the session (from `act.sub`). |
| `authenticationId` | `string` | Lens authentication/session ID (from `sid`). |
| `role` | `string` | Session role: `"ACCOUNT_OWNER"` or `"ACCOUNT_MANAGER"`. |

#### `server.resolveIdentity(input)`

Fetch the full Lens account details from the Lens API and return a verified identity object.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input.signerAddress` | `string` | Yes | The signer wallet address (from token claims). |
| `input.lensAccountAddress` | `string` | Yes | The Lens account address (from token claims). |

Returns `LensVerifiedIdentity`:

| Field | Type | Description |
|-------|------|-------------|
| `providerSubject` | `string` | Unique identity key in the form `lens:<accountAddress>`. |
| `walletAddress` | `string` | Normalized signer wallet address. |
| `lensAccountAddress` | `string` | Normalized Lens account address. |
| `username` | `object \| null` | Username with `fullHandle`, `localName`, `namespace`. |
| `metadata` | `object \| null` | Account metadata with `id`, `name`, `bio`, `picture`, `coverPicture`, and `attributes`. |

#### `server.toErrorResponse(error)`

Convert any caught error into a structured HTTP-friendly response.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `error` | `unknown` | Yes | Any thrown error. `LensLoginServerError` instances produce their own status and code; other errors produce a 500 with code `"INTERNAL_ERROR"`. |

Returns `{ status: number, body: LensApiError }`.

### Identity resolution only

```ts
const tokenClaims = await server.verifyIdToken(idToken)
const identity = await server.resolveIdentity({
  signerAddress: tokenClaims.signerAddress,
  lensAccountAddress: tokenClaims.lensAccountAddress,
})

// Now handle your own user logic:
// 1. Look up identity.providerSubject in your database
// 2. Create or find the local user
// 3. Persist the identity
// 4. Create a session
```

## Error classes

### `LensLoginClientError`

Thrown by client methods. Extends `LensLoginError` (which extends `Error`).

| Field | Type | Description |
|-------|------|-------------|
| `code` | `string` | Machine-readable error code (e.g. `"NO_WALLET"`, `"NO_WALLET_ACCOUNT"`). |
| `message` | `string` | Human-readable error description. |
| `status` | `number` | HTTP status code if applicable, otherwise `0`. |

### `LensLoginServerError`

Thrown by server methods. Extends `LensLoginError` (which extends `Error`). Defaults to status `400`.

| Field | Type | Description |
|-------|------|-------------|
| `code` | `string` | Machine-readable error code. One of `LensApiErrorCode` values. |
| `message` | `string` | Human-readable error description. |
| `status` | `number` | HTTP status code. Defaults to `400`, often `401` for auth errors, `500` for internal errors. |

## Shared types

Import via `@demo/lens-login/shared`:

| Type | Description |
|------|-------------|
| `LensLoginClientOptions` | Client configuration (`{ ethereum?, environment?, origin?, appAddress?, storage? }`) |
| `LensLoginClient` | Returned client interface (`{ connectWallet, listAvailableAccounts, getAccount, login }`) |
| `LensLoginServerOptions` | Server configuration (`{ environment?, origin?, appAddress? }`) |
| `LensLoginServer` | Returned server interface (`discoverAccounts`, `verifyIdToken`, `resolveIdentity`, `toErrorResponse`) |
| `LensIdTokenClaims` | Decoded ID token claims (`signerAddress`, `lensAccountAddress`, `authenticationId`, `role`) |
| `LensAccountMetadata` | Full account metadata shape (`id`, `name`, `bio`, `picture`, `coverPicture`, `attributes`) |
| `LensAccountsRequest` | `{ walletAddress }` |
| `LensAccountsResponse` | `{ walletAddress, accounts }` |
| `LensSessionRequest` | `{ type: LensAuthIntent, idToken }` |
| `LensAuthIntent` | `"login" \| "link"` |
| `LensDiscoveredAccount` | Account shape with `accountAddress`, `username`, `metadata` |
| `LensVerifiedIdentity` | Verified identity with `providerSubject`, `walletAddress`, `lensAccountAddress`, `username`, `metadata` |
| `LensApiError` | Error response shape (`{ ok: false, error: { code, message } }`) |
| `LensApiErrorCode` | Union of error code strings |
