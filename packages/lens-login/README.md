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
const result = await client.authenticate({
  type: "login",
  walletAddress,
  lensAccountAddress: accounts.accounts[0].accountAddress,
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

- `storage.createChallenge`
- `storage.getChallengeById`
- `storage.markChallengeUsed`
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
- `LensChallengeRequest`
- `LensVerifyRequest`
- `LensVerifyResponse<TUser>`
