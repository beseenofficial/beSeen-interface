# BeSeen Interface

BeSeen's Next.js client, connected directly to the BeSeen v1 API. The current implementation covers Blux authentication, registration and profile management, local signing/encryption key derivation, encrypted broadcasts, feed verification, and session rotation.

## Requirements

- Node.js 20.9 or newer
- npm
- BeSeen API running at `http://localhost:5000/v1`
- A Blux application ID configured for Stellar Testnet

The client deliberately supports **Stellar Testnet only**. It rejects a backend authentication configuration for any other network.

## Local setup

```powershell
npm install
Copy-Item .env.example .env.local
npm run contract:check
npm run dev
```

The app is available at [http://localhost:3000](http://localhost:3000), the API at [http://localhost:5000/v1](http://localhost:5000/v1), and the local OpenAPI UI at [http://localhost:5000/v1/docs/](http://localhost:5000/v1/docs/).

Public profiles are available at `http://localhost:3000/{username}` and are populated from the API's public-user endpoint.

## Environment

```env
NEXT_PUBLIC_BLUX_APP_ID=
NEXT_PUBLIC_BESEEN_API_URL=http://localhost:5000/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_BLUX_APP_ID` | Blux application used for wallet, email, and Google login. |
| `NEXT_PUBLIC_BESEEN_API_URL` | Base URL for the BeSeen v1 API. |
| `NEXT_PUBLIC_APP_URL` | Public frontend URL used for profile links. |

There is no mock-auth or local mock-API fallback. Missing Blux configuration is surfaced as a configuration error.

## Authentication and registration

Blux is configured with the `wallet`, `email`, and `google` login methods and a single `testnet` network. The backend remains the protocol authority:

1. Fetch the public protocol and key-derivation configuration without a wallet query parameter.
2. Ask Blux to sign the exact backend SEP-10 transaction XDR with `signTransaction` on Testnet.
3. Never submit that zero-fee authentication transaction to Stellar and never rebuild or modify its XDR.
4. For a new account, generate a random 32-byte master secret and derive independent Ed25519 and X25519 seeds with HKDF-SHA-256.
5. Encrypt the master secret and private keys in device storage, and download a password-encrypted identity backup for cross-device restore.
6. Persist access and rotating refresh tokens in encrypted IndexedDB storage.
7. Refresh once, with a single in-flight request, only after a backend `401 UNAUTHORIZED`.

The client never reads Blux's internal token storage, submits SEP-10 transactions, sends master secrets or private keys to the API, or changes a backend-provided XDR.

## Broadcast security

Broadcast content is encrypted locally with XChaCha20-Poly1305. A random content key is sealed independently for every frozen recipient and for the creator. Draft state and exact ciphertext are encrypted locally before upload so interrupted drafts can resume without producing different recipient ciphertexts.

Before finalization, the client refetches the frozen manifest, computes the backend-specified SHA-256 digest, signs the exact canonical message with the derived Ed25519 key, and submits the signature. Received content is shown only after signature verification and successful decryption.

## Important modules

- `src/lib/api-client.ts` — API envelope handling, encrypted sessions, refresh rotation
- `src/lib/beseen-api.ts` — typed v1 API boundary
- `src/providers/blux-provider.tsx` — official Blux integration and Testnet configuration
- `src/providers/auth-provider.tsx` — provider/backend authentication state machine
- `src/lib/crypto/messaging-keys.ts` — HKDF, Ed25519, and X25519 derivation
- `src/lib/crypto/identity-backup.ts` — password-encrypted cross-device master-secret backup
- `src/lib/secure-storage.ts` — non-exportable AES-GCM device storage
- `src/lib/broadcasts.ts` — encrypted draft, upload, finalize, resume, and decrypt flows

## Validation

```powershell
npm run contract:check
npm run typecheck
npm run lint
npm test
npm run build
```

`contract:check` validates the local OpenAPI version and required endpoints, then confirms the running backend is configured for Testnet, SEP-10 transaction signing, and client-generated HKDF-SHA-256 keys.
