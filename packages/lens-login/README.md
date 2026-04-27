# @demo/lens-login

POC package layout for a Lens login SDK.

## Public entrypoints

- `@demo/lens-login/client`
- `@demo/lens-login/server`
- `@demo/lens-login/shared`

## Client API

```ts
import { createLensLoginClient } from "@demo/lens-login/client"

const client = createLensLoginClient({
  apiBasePath: "/api/auth/lens",
})

const walletAddress = await client.connectWallet()
const accounts = await client.discoverAccounts({ walletAddress })

// After completing Lens native login in the browser, submit the Lens ID token
// to the app server so it can verify the session and create a local session.
const result = await client.verifySession({
  type: "login",
  idToken,
})
```

## Server API

```ts
import { createLensLoginServer } from "@demo/lens-login/server"

const server = createLensLoginServer({
  storage,
  setSession,
  findUserById,
  createUser,
})
```

Required server dependencies:

- `storage.getIdentityByProviderSubject`
- `storage.createLensIdentity`
- `setSession`
- `findUserById`
- `createUser`

## Public types

Use `@demo/lens-login/shared` for request, response, and adapter types.

Important public types:

- `LensLoginClientOptions`
- `LensLoginClient<TUser>`
- `LensLoginServerOptions<TUser>`
- `LensLoginServer<TUser>`
- `LensAccountsRequest`
- `LensSessionRequest`
- `LensVerifyResponse<TUser>`
