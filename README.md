# BeSeen Interface

BeSeen's Next.js client. Sign-in is fully client-side: Blux authenticates the
user's Stellar account, a deterministic SEP-10 challenge signature is turned
into a local keypair, and the (currently mocked) API only ever learns two
identity facts — the wallet address and the derived public key.

## How sign-in works

1. **Blux login** — the user authenticates with a wallet, email, or Google
   (`blux.login()`). Blux hands us their Stellar address.
2. **Deterministic challenge** — the app builds a SEP-10 style transaction,
   sourced by the user's own account (wallets refuse to sign for any other
   source), that is byte-for-byte identical on every visit for that account
   and can never be submitted (sequence 0), and asks the wallet to sign it.
3. **Key derivation** — Ed25519 signatures are deterministic, so the signature
   is stable per account. It is fed through HKDF-SHA256 to derive a Stellar
   keypair. Same account → same keypair, on every visit and every device.
4. **Storage** — the derived secret key never leaves the browser and is
   encrypted at rest: a non-extractable AES-GCM key lives in IndexedDB and
   the ciphertext in `localStorage`, so copying the storage to another
   machine yields nothing. It can always be re-derived by signing again, so
   there is nothing to back up. The derived public key is sent to the API
   together with the wallet address.
5. **Profile** — one onboarding step asks for a username and an optional logo.

Blux sessions are deliberately **not persistent**: every page load starts at
the login screen, but returning users skip the signature step because the
encrypted keypair cache is per wallet address. Testnet is the only network
the app is configured for.

All of steps 1–4 live in a single commented file: `src/lib/blux.tsx`.

## The API is mocked

The real backend is disabled for now. `src/lib/api.ts` implements the whole
API surface against `localStorage` and documents the route contract to
implement later (register, get-by-wallet, update, username availability,
public profile, followers, broadcasts). Swap each function body for a `fetch`
call when the backend exists — call sites won't change.

## End-to-end encrypted broadcasts

Broadcasts are encrypted in the browser before anything is sent: one copy for
the sender (so they can reread their own messages) and one per follower
public key returned by the API. The scheme is ECIES over the derived keypair
(ed25519 → X25519, ephemeral ECDH, HKDF-SHA256, AES-256-GCM) — see
`src/lib/broadcast-crypto.ts`. The server stores `{ id (uuid), senderId,
createdAt, copies[{recipientPublicKey, ciphertext}] }` and can never read a
message. On load, the broadcasts page fetches everything addressed to your
derived public key — your own messages and other people's — and decrypts it
locally with the derived secret key.

## Requirements

- Node.js 20.9 or newer
- A Blux application ID (Stellar Testnet)

## Local setup

```sh
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_BLUX_APP_ID
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000). Public
profiles are served at `http://localhost:3000/{username}`.

## Environment

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_BLUX_APP_ID` | Blux application used for wallet, email, and Google login. |
| `NEXT_PUBLIC_APP_URL` | Public frontend URL used for profile links. Falls back to the serving origin. |

## Docker

```sh
docker compose up --build
```

`compose.yaml` reads both `NEXT_PUBLIC_*` values from `.env` and passes them
as build args (Next.js inlines them into the client bundle at build time, so
changing them requires a rebuild). The image is a multi-stage standalone
build served by `node server.js` on port 3000.

## Important modules

- `src/lib/blux.tsx` — **all** Blux code: provider config, deterministic
  SEP-10 challenge, signature verification, key derivation, auth state
- `src/lib/api.ts` — mocked API + the route contract for the future backend
- `src/lib/broadcast-crypto.ts` — per-recipient E2E encryption of broadcasts
- `src/components/layout/route-guard.tsx` — waits while auth loads and
  auto-advances users to login → onboarding → dashboard
- `src/app/(onboarding)/onboarding/page.tsx` — username + logo, the only
  onboarding step

## Validation

```sh
npm run typecheck
npm run lint
npm test
npm run build
```
