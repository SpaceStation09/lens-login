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

This starts a single Next.js app that includes both the browser UI and the demo backend routes. You do not need to run a separate API server.

## Environment

Optional environment variables:

```bash
NEXT_PUBLIC_LENS_ENV=testnet
NEXT_PUBLIC_LENS_APP_ADDRESS=your-lens-app-address
NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000
SESSION_SECRET=replace-me
```

Notes:

- `NEXT_PUBLIC_LENS_ENV` defaults to `testnet` if omitted.
- `NEXT_PUBLIC_APP_ORIGIN` should match the URL where the app is running.
- `NEXT_PUBLIC_LENS_APP_ADDRESS` must be a Lens App address valid for the selected environment if you want to override the built-in default.

## Demo Architecture

- The browser uses the SDK client in `packages/lens-login` for wallet connection, Lens account discovery, and Lens login.
- The browser sends the returned `idToken` to the demo backend at `/api/auth/lens/session`.
- The backend verifies the token, resolves the Lens identity, creates or finds the local user, and issues the demo session cookie.
- Local demo data is stored in `data/demo.sqlite`.

## How To Test

### 1. Test classic account flow

1. Open `/register`.
2. Create a username/password account.
3. Confirm you land on `/dashboard`.
4. Click logout.
5. Open `/login` and sign back in with the same credentials.

### 2. Test Lens-first login flow

Prerequisites:

- Use MetaMask or another injected EVM wallet.
- The wallet must already control at least one Lens account on the configured network.

Steps:

1. Open `/login`.
2. In the Lens card, click `Connect MetaMask`.
3. Approve wallet access.
4. Confirm the demo shows one or more available Lens accounts.
5. Choose a Lens account if multiple are shown.
6. Click `Continue with Lens`.
7. Sign the Lens login challenge in your wallet.
8. Confirm one of these outcomes:
   - Existing local account with username/password: you land on `/dashboard`.
   - New Lens-first user: you land on `/complete-account` to set local credentials.

If you land on `/complete-account`:

1. Set a username and password.
2. Submit the form.
3. Confirm you land on `/dashboard`.
4. Log out and verify you can now log in with either Lens or the local username/password.

### 3. Test binding Lens to an existing local account

1. Register or log in with a username/password account.
2. Open `/settings`.
3. In the bind section, click `Connect MetaMask`.
4. Select a wallet-controlled Lens account.
5. Click `Bind Lens account`.
6. Sign the Lens login challenge.
7. Confirm the settings page now shows the Lens identity as bound.

### 4. Test unbinding

1. While logged in to a classic account with a bound Lens identity, open `/settings`.
2. Click `Clear Lens binding`.
3. Confirm the bound identity notice disappears after refresh.

### 5. Sanity-check persistence

1. Stop and restart `npm run dev`.
2. Re-open the app.
3. Confirm previously created demo users still exist, since the data is stored in `data/demo.sqlite`.

## Troubleshooting

- If wallet discovery shows no Lens accounts, verify the wallet actually controls a Lens account on the configured network.
- If Lens login fails, confirm the configured Lens App address matches the selected environment.
- If cookies behave unexpectedly in local development, verify `NEXT_PUBLIC_APP_ORIGIN` matches the URL you opened in the browser.
- If you want a clean demo state, remove `data/demo.sqlite` and restart the app.

## Notes

- The demo stores data in `data/demo.sqlite` for simplicity.
- Strict mode is enabled: the wallet must already control a Lens account.
- The browser wallet flow uses MetaMask or another injected EVM wallet.
- The browser now uses the SDK client for wallet connection, Lens account discovery, and Lens login.
- The login subject is the Lens account, not the wallet address.
- The server trusts verified Lens ID token claims, not client-submitted account addresses.
- The SDK (`packages/lens-login`) does not dictate transport or local auth persistence — the demo app still owns the `/api/auth/lens/session` route, local user records, and session cookies.

## Documentation

- [`packages/lens-login/README.md`](packages/lens-login/README.md) — SDK API reference
