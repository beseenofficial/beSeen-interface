# BeSeen Interface

Frontend dashboard for BeSeen creators. The application covers authentication, creator onboarding, messaging-key setup, profile management, broadcasts, and account activity.

The project is built with Next.js App Router, React, TypeScript, Tailwind CSS, and the Blux React SDK. Local development can run with either Blux authentication or the included demo authentication flow.

## Requirements

- Node.js 20.9 or newer
- npm
- A Blux application ID when testing real authentication

## Getting started

Install the dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Start the development server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

On Windows PowerShell, you can copy the environment file with:

```powershell
Copy-Item .env.example .env.local
```

## Environment variables

```env
NEXT_PUBLIC_BLUX_APP_ID=
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_USE_MOCK_AUTH=false
```

| Variable                    | Description                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_BLUX_APP_ID`   | Application ID from the Blux dashboard. If it is empty, the local demo authentication flow is used. |
| `NEXT_PUBLIC_APP_URL`       | Base URL used when creating public profile links.                                                   |
| `NEXT_PUBLIC_USE_MOCK_AUTH` | Set to `true` to use demo authentication even when a Blux application ID is configured.             |

## Authentication and networks

Authentication is handled through Blux. The configured login methods are wallet, email, passkey, Google, GitHub, and Discord. Their availability also depends on the settings of the corresponding Blux application.

Both Stellar Testnet and Mainnet are registered in the client configuration. Testnet is the default network. Network and login-method settings are kept in [`src/lib/stellar-network.ts`](src/lib/stellar-network.ts).

When real authentication is not configured, the application stores the demo session in `sessionStorage`. Demo profile and dashboard data are stored locally in the browser.

## Available routes

| Route                   | Purpose                                                    |
| ----------------------- | ---------------------------------------------------------- |
| `/login`                | Sign in with Blux or the local demo flow.                  |
| `/onboarding/security`  | Create or recover the device messaging key.                |
| `/onboarding/profile`   | Choose a username and optional avatar.                     |
| `/dashboard`            | Creator overview, statistics, and recent activity.         |
| `/dashboard/broadcasts` | Create and review broadcasts.                              |
| `/dashboard/messenger`  | Messenger placeholder page.                                |
| `/dashboard/profile`    | Public profile details, Aura status, and creator activity. |

Authentication, profile completion, and the local messaging key are checked before protected pages are displayed.

## Project structure

```text
src/
├── app/                 # Routes, layouts, loading and error states
│   ├── (auth)/
│   ├── (dashboard)/
│   └── (onboarding)/
├── components/
│   ├── features/        # Components tied to a product feature
│   ├── layout/          # Navigation, shells and route guards
│   └── ui/              # Reusable interface components
├── lib/                 # Domain utilities, local API and cryptography
├── providers/           # Authentication, profile and notification state
├── test/                # Vitest and Testing Library tests
└── types/               # Shared TypeScript types
```

## Local data layer

The current dashboard uses the typed service in [`src/lib/mock-api.ts`](src/lib/mock-api.ts) as its data boundary. Pages call this service instead of accessing browser storage directly. This keeps the UI independent from the temporary local implementation and makes it easier to replace with a backend API later.

The local service currently handles:

- Creator profile creation and updates
- Username availability checks
- Messaging public-key registration
- Dashboard statistics and activity
- Broadcast creation and history

## Messaging-key storage

Messaging keys are derived and stored on the client:

1. The user signs a fixed, versioned setup message.
2. The signature is normalized and passed through HKDF-SHA-256.
3. An X25519 key pair is created with libsodium.
4. Only the public key is added to the creator profile.
5. The private key is encrypted with a non-exportable AES-GCM key and stored in IndexedDB.

The implementation is located in:

- [`src/lib/crypto/messaging-keys.ts`](src/lib/crypto/messaging-keys.ts)
- [`src/lib/crypto/key-storage.ts`](src/lib/crypto/key-storage.ts)

Private keys and derived seed material are not written to `localStorage` or sent through the local API.

## Scripts

```bash
npm run dev        # Start the development server
npm run build      # Create a production build
npm run start      # Run the production server
npm run lint       # Run ESLint
npm run typecheck  # Check TypeScript types
npm test           # Run the test suite
```

Before opening a pull request, run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Current scope

This repository contains the creator dashboard frontend. Broadcast delivery, marketplace features, Aura purchasing, bounty settlement, escrow, smart contracts, and the complete messenger experience are not implemented here. Dashboard statistics and activity are currently backed by local development data.
