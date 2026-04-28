# Lens Login Demo

POC demo for a `Login with Lens` flow that can coexist with a classic username/password account system.

## What it covers

- Username/password registration and login
- Lens account discovery from a wallet
- Lens native authentication with client-side `SessionClient`
- Server-side Lens ID token verification through JWKS
- Automatic local user creation for Lens-first login
- Binding a Lens identity to an existing username/password user

## Run locally

1. Install dependencies

```bash
npm install
```

2. Start the app

```bash
npm run dev
```

3. Open `http://localhost:3000`

## Environment

Optional environment variables:

```bash
NEXT_PUBLIC_LENS_ENV=testnet
NEXT_PUBLIC_LENS_APP_ADDRESS=your-lens-app-address
NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000
SESSION_SECRET=replace-me
```

## Notes

- The demo stores data in `data/demo.sqlite` for simplicity.
- Strict mode is enabled: the wallet must already control a Lens account.
- The browser wallet flow uses MetaMask or another injected EVM wallet.
- The login subject is the Lens account, not the wallet address.
- The server trusts verified Lens ID token claims, not client-submitted account addresses.
