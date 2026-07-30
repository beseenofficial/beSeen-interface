# BeSeen Interface

BeSeen’s Next.js client integrates directly with the BeSeen v1 API. It uses a
Stellar wallet only for deterministic local key recovery, JWTs for ordinary API
authentication, and client-side authenticated encryption for broadcasts.

## Security and authentication

At startup the client loads `GET /v1/auth/config`, restores a rotating refresh
session from encrypted IndexedDB when possible, and keeps the access token in
memory. Wallet sign-in builds the backend-configured fixed sequence-0 Stellar
transaction locally and never submits or uploads it. Its one raw signature is
domain-separated with HKDF-SHA-256 into Ed25519 signing and X25519 encryption
keys. The signed fixed transaction is encrypted under a non-extractable device
key in an account-bound IndexedDB collection. Derived private keys exist only
in memory and are reconstructed from that encrypted signature after refresh.

Registration sends the Stellar public address and the two raw public keys only.
Login signs the canonical timestamped UUID proof. Public profiles contain only
`id`, `username`, and `avatar`.

## Encrypted broadcasts

Publishing uses the v1 draft workflow. The backend freezes the token-holder
audience; the browser encrypts content once with XChaCha20-Poly1305, seals the
same content key for every recipient and the creator, uploads retry-stable
wrapped keys, signs the canonical encrypted manifest, and finalizes the draft.
Unfinished local cryptographic state is encrypted in IndexedDB so interrupted
uploads can resume without changing sealed ciphertext. Drafts whose local state
cannot be recovered are canceled.

Received and sent feed items are verified with the creator’s Ed25519 public key
before any decryption or display. A restored API session without local private
keys stays behind the loading gate until the account-bound signed transaction
has restored the derived keys or a new ownership signature has been approved.

## Local setup

Requirements: Node.js 20.9+, the BeSeen API, and a Blux application ID.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

The frontend runs at [http://localhost:3000](http://localhost:3000). The local
API default is `http://localhost:5000`.

## Environment

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_BLUX_APP_ID` | Blux application used to connect a Stellar wallet. |
| `NEXT_PUBLIC_API_BASE_URL` | BeSeen API origin, without `/v1`; defaults to `http://localhost:5000`. |
| `NEXT_PUBLIC_APP_URL` | Public frontend origin used for profile links. |

`Dockerfile` and `compose.yaml` pass all three public values at build time.

## Important modules

- `src/lib/api/transport.ts` — envelope parsing, typed errors, bearer transport,
  rotating refresh-token persistence, and the single-flight refresh mutex.
- `src/lib/api/` — focused auth, profile, token, and broadcast route clients.
- `src/lib/keys.ts` — fixed Stellar transaction validation, dual-key derivation,
  canonical login proofs, and local key vault access.
- `src/lib/broadcast-crypto.ts` — XChaCha encryption, sealed boxes, recipient
  digests, manifest serialization/signing, verification, and feed decryption.
- `src/lib/broadcast-workflow.ts` — draft creation, pagination, retry-safe upload,
  finalization, recovery, and cancellation.

## Validation

```sh
npm run typecheck
npm run lint
npm test
npm run build
```
