'use client';

/**
 * =============================================================================
 * ALL Blux code lives in this one file.
 * =============================================================================
 *
 * THE SIGN-IN FLOW
 *   1. `blux.login()` — the user authenticates with Blux (wallet / email /
 *      Google). Blux gives us their Stellar address (`blux.user.address`).
 *   2. We ask the wallet to sign a SEP-10 style challenge transaction that is
 *      IDENTICAL on every visit for that account and can NEVER be submitted
 *      to the network (sequence number 0). The user's own address is the
 *      transaction source — wallets refuse to sign for anyone else.
 *   3. Ed25519 signatures are deterministic (RFC 8032), so the same account
 *      signing the same challenge produces the same signature every time.
 *   4. That signature is fed through HKDF-SHA256 to derive a Stellar keypair.
 *      Same signature → same keypair, on every visit, on every device.
 *   5. The derived SECRET key is cached in localStorage only — it never leaves
 *      this browser. The derived PUBLIC key is sent to the BeSeen API together
 *      with the wallet address (see `src/lib/api.ts`). Those two values are the
 *      only identity facts the server ever stores.
 *
 * Because the keypair is re-derivable by signing again, there is nothing to
 * back up: a user on a fresh browser just signs the same challenge and gets
 * the same keys.
 *
 * WHY signTransaction AND NOT signMessage
 *   Not every wallet implements `signMessage` (Ledger throws outright) and the
 *   ones that do disagree on what exactly gets signed. Every wallet must
 *   implement `signTransaction`. SEP-10 exists for exactly this reason: prove
 *   control of an account with a transaction that can never reach the network.
 *
 * WHAT YOU MUST NOT CHANGE AFTER USERS HAVE DERIVED KEYS
 *   DOMAIN, VERSION, CHALLENGE_NETWORK, the HKDF salt/info strings, and the
 *   challenge shape all feed into the signature. Changing any single character
 *   silently gives every existing user a brand-new keypair. Bump VERSION when
 *   you *intend* to rotate everyone's keys, never by accident.
 *
 * Blux docs: https://docs.blux.cc
 */

import { BluxProvider, networks, useBlux } from '@bluxcc/react';
import {
  Account,
  BASE_FEE,
  Keypair,
  Networks,
  Operation,
  StrKey,
  Transaction,
  TransactionBuilder,
  hash,
} from '@stellar/stellar-sdk';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api } from '@/lib/api';
import type { User } from '@/types';

/* ========================================================================== *
 * CONFIG
 * ========================================================================== */

/** Ties the challenge (and therefore every derived key) to this app. */
const DOMAIN = 'beseen.app';

/**
 * Bump this when you deliberately want to rotate every user's derived key.
 * (v2: the challenge became sourced by the user's own account instead of a
 * fixed throwaway account, which wallets refused to sign for.)
 */
const VERSION = 'v2';

/**
 * The signature covers the network passphrase, so it is pinned: the derived
 * keys stay stable even if the app's active network ever changes.
 */
const CHALLENGE_NETWORK = Networks.TESTNET;

/** localStorage slot for the derived secret key, namespaced per wallet. */
const secretStorageKey = (walletAddress: string) =>
  `beseen:derived-secret:${VERSION}:${walletAddress}`;

/** How long we wait for a wallet signature before giving up. */
const SIGNING_TIMEOUT_MS = 60_000;

const bluxConfig = {
  appId: process.env.NEXT_PUBLIC_BLUX_APP_ID ?? '',
  appName: 'BeSeen',
  // Testnet is the ONLY network the product accepts: it is the sole entry
  // here, the default, and `promptOnWrongNetwork` nags wallets that are
  // connected elsewhere. The challenge below is pinned to it as well.
  networks: [networks.testnet],
  defaultNetwork: networks.testnet,
  // No session persistence: every page load starts signed out and goes
  // through `blux.login()` again. The derived keypair is still cached
  // (encrypted) per wallet, so returning users skip the signature step.
  isPersistent: false,
  promptOnWrongNetwork: true,
  // Sign headlessly — BeSeen renders its own UI around the flow.
  showWalletUIs: false,
  loginMethods: ['wallet', 'email', 'google'],
  appearance: {
    logo: '/brand/beSeenLogoType.png',
    background: '#FFFFFF',
    fieldBackground: '#F7FAFB',
    accentColor: '#1045F5',
    textColor: '#0B0B3F',
    fontFamily: 'Outfit, sans-serif',
    borderRadius: '16px',
    borderColor: '#D7E5EA',
    borderWidth: '1px',
  },
};

/* ========================================================================== *
 * Byte helpers (browser-safe, no Buffer polyfill needed)
 * ========================================================================== */

const utf8 = (value: string) => new TextEncoder().encode(value);

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const toBase64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...Array.from(bytes)));

const concat = (a: Uint8Array, b: Uint8Array) => {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
};

/**
 * stellar-sdk's types ask for Node Buffers, but everything used here only
 * reads bytes and a Buffer *is* a Uint8Array, so plain Uint8Arrays work.
 */
const asBuffer = (value: Uint8Array) => value as unknown as Buffer;

const sha256 = (bytes: Uint8Array) => new Uint8Array(hash(asBuffer(bytes)));

/* ========================================================================== *
 * The deterministic challenge transaction
 * ========================================================================== */

/**
 * SEP-10 wants a 64-character base64 nonce. A random nonce is the whole point
 * in real SEP-10 (it stops replay), but it would destroy determinism here, so
 * it is derived from constants. That is safe precisely because the challenge
 * can never be submitted or replayed anywhere.
 */
const CHALLENGE_NONCE = toBase64(
  concat(
    sha256(utf8(`${DOMAIN}|${VERSION}|nonce-a`)),
    sha256(utf8(`${DOMAIN}|${VERSION}|nonce-b`)).slice(0, 16),
  ),
);

/**
 * Builds the challenge. Apart from the user's address, every field is a
 * constant — nothing here may depend on `Date.now()`, `Math.random()`, or
 * account state, or the XDR changes between runs and so does the derived
 * keypair. Determinism only has to hold PER ACCOUNT (wallet A always gets
 * keypair B; wallet C always gets keypair D), so the address may appear.
 *
 * The transaction source MUST be the user's own account: wallets — including
 * Blux's API signer for email/Google logins — refuse to sign a transaction
 * sourced from any other account ("transaction source account … does not
 * match the user's wallet"). Real SEP-10 puts a server key there, but this
 * flow has no server, and the user's address is just as deterministic.
 */
export function buildChallenge(userAddress: string): Transaction {
  // "-1" so TransactionBuilder's increment lands on sequence 0. A sequence-0
  // transaction is rejected by every validator, always — even when sourced by
  // a real account: accounts are created with sequence (ledger << 32) > 0 and
  // sequence numbers can only grow, so no account ever expects seq 0. This is
  // the same trick SEP-10 itself uses; the challenge can never be submitted.
  const source = new Account(userAddress, '-1');

  return new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: CHALLENGE_NETWORK,
  })
    .addOperation(
      Operation.manageData({
        // SEP-10 names the entry "<home domain> auth".
        name: `${DOMAIN} auth`,
        value: CHALLENGE_NONCE,
        // Explicit for clarity (it would default to the tx source anyway):
        // the operation, like the transaction, belongs to the signing user.
        source: userAddress,
      }),
    )
    // Infinite timebounds: a real timestamp would either expire or break
    // determinism. Harmless because sequence 0 already blocks submission.
    .setTimeout(0)
    .build();
}

/** Reduces the wallet's response (shapes vary per wallet) to an XDR string. */
function toSignedXdr(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    for (const key of [
      'signedTxXdr',
      'signedTransactionXdr',
      'signedXDR',
      'signedXdr',
      'xdr',
      'result',
    ]) {
      if (typeof record[key] === 'string') return record[key];
    }
  }
  throw new Error('Blux did not return a signed transaction.');
}

/** Stops an abandoned wallet prompt from hanging the sign-in screen forever. */
function withTimeout<T>(operation: Promise<T>, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out. Please try again.`)),
      SIGNING_TIMEOUT_MS,
    );
    operation.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (cause) => {
        clearTimeout(timer);
        reject(cause);
      },
    );
  });
}

/* ========================================================================== *
 * Signature → keypair derivation
 * ========================================================================== */

/** HKDF-SHA256: the standard way to turn a secret into key material. */
async function hkdfSha256(
  ikm: Uint8Array,
  salt: string,
  info: string,
  lengthInBytes: number,
): Promise<Uint8Array> {
  // Uint8Array.from re-backs the bytes with a plain ArrayBuffer, which is
  // what WebCrypto's types require.
  const key = await crypto.subtle.importKey('raw', Uint8Array.from(ikm), 'HKDF', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: utf8(salt), info: utf8(info) },
    key,
    lengthInBytes * 8,
  );
  return new Uint8Array(bits);
}

type SignTransaction = (
  xdr: string,
  options?: { network: string },
) => Promise<unknown>;

/**
 * The core of the flow: challenge → wallet signature → verified → keypair.
 *
 * Deterministic end to end: calling this twice for the same account always
 * returns the same keypair.
 */
export async function deriveKeypair(
  userAddress: string,
  signTransaction: SignTransaction,
): Promise<Keypair> {
  if (!StrKey.isValidEd25519PublicKey(userAddress)) {
    // e.g. a smart-wallet contract address (C…): it has no ed25519 key, so
    // its signature can neither be verified nor be deterministic.
    throw new Error(
      'This account type is not supported yet. Sign in with a regular Stellar account (G…).',
    );
  }

  /* -- 1. build the unsubmittable challenge ------------------------------- */

  const challenge = buildChallenge(userAddress);
  const challengeHash = new Uint8Array(challenge.hash());

  if (challenge.sequence !== '0') {
    // Refuse to ask for a signature over anything that could be submitted.
    throw new Error('Challenge safety check failed: sequence is not 0.');
  }

  /* -- 2. let the wallet sign it ------------------------------------------ */

  const response = await withTimeout(
    signTransaction(challenge.toEnvelope().toXDR('base64'), {
      network: CHALLENGE_NETWORK,
    }),
    'The wallet signing request',
  );
  const signed = new Transaction(toSignedXdr(response), CHALLENGE_NETWORK);
  const signedHash = new Uint8Array(signed.hash());

  /* -- 3. verify the wallet signed exactly OUR challenge ------------------ */

  if (toHex(signedHash) !== toHex(challengeHash)) {
    // The wallet handed back a different transaction than the one we built,
    // so the signature is over something we did not author. Never trust that.
    throw new Error('The wallet returned a modified transaction. Aborting.');
  }

  /* -- 4. verify the signature belongs to the logged-in account ----------- */

  const verifier = Keypair.fromPublicKey(userAddress);
  const signature = signed.signatures
    .map((decorated) => new Uint8Array(decorated.signature()))
    .find((bytes) => verifier.verify(asBuffer(signedHash), asBuffer(bytes)));

  if (!signature) {
    throw new Error(
      'The signature was made by a different account than the one signed in. Aborting.',
    );
  }

  /* -- 5. signature → 32-byte seed → keypair ------------------------------ */

  const seed = await hkdfSha256(
    signature,
    `${DOMAIN}|${VERSION}|derive-keys|salt`,
    `${DOMAIN}|${VERSION}|ed25519-seed`,
    32,
  );
  return Keypair.fromRawEd25519Seed(asBuffer(seed));
}

/* ========================================================================== *
 * Local (and ONLY local) storage of the derived secret — encrypted at rest
 * ========================================================================== */

/**
 * Caching the secret skips the signature prompt when the same Blux address
 * comes back. Losing the cache is harmless: signing the challenge again
 * reproduces the exact same keypair.
 *
 * The secret is never stored in plaintext. A NON-EXTRACTABLE AES-GCM key is
 * generated once per browser and kept in IndexedDB — the browser will use it
 * but never reveal its bytes — and the secret is stored in localStorage as
 * ciphertext encrypted with that key. Copying localStorage (or the IndexedDB
 * file) to another machine yields nothing usable.
 */

const DEVICE_DB_NAME = 'beseen-device';
const DEVICE_DB_STORE = 'meta';
const DEVICE_KEY_ID = 'secret-wrapping-key';

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

async function openDeviceDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DEVICE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DEVICE_DB_STORE)) {
        request.result.createObjectStore(DEVICE_DB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB could not be opened.'));
  });
}

/** The per-browser wrapping key; created on first use, unexportable forever. */
async function deviceWrappingKey(): Promise<CryptoKey> {
  const db = await openDeviceDb();
  try {
    const existing = await idbRequest<CryptoKey | undefined>(
      db.transaction(DEVICE_DB_STORE, 'readonly')
        .objectStore(DEVICE_DB_STORE)
        .get(DEVICE_KEY_ID),
    );
    if (existing) return existing;

    const generated = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false, // extractable: false — the key material can never leave the browser
      ['encrypt', 'decrypt'],
    );
    await idbRequest(
      db.transaction(DEVICE_DB_STORE, 'readwrite')
        .objectStore(DEVICE_DB_STORE)
        .put(generated, DEVICE_KEY_ID),
    );
    return generated;
  } finally {
    db.close();
  }
}

const fromBase64 = (value: string) =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

async function loadCachedKeypair(walletAddress: string): Promise<Keypair | null> {
  try {
    const raw = localStorage.getItem(secretStorageKey(walletAddress));
    if (!raw) return null;

    const record = JSON.parse(raw) as { iv: string; ciphertext: string };
    if (!record?.iv || !record?.ciphertext) return null;
    const key = await deviceWrappingKey();
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(record.iv) },
      key,
      fromBase64(record.ciphertext),
    );
    const secret = new TextDecoder().decode(plaintext);
    return StrKey.isValidEd25519SecretSeed(secret)
      ? Keypair.fromSecret(secret)
      : null;
  } catch {
    // Wrong/lost device key, corrupt record, blocked storage… all equally
    // fine: the user just signs the challenge again.
    return null;
  }
}

async function cacheKeypair(walletAddress: string, keypair: Keypair): Promise<void> {
  try {
    const key = await deviceWrappingKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      utf8(keypair.secret()),
    );
    localStorage.setItem(
      secretStorageKey(walletAddress),
      JSON.stringify({
        iv: toBase64(iv),
        ciphertext: toBase64(new Uint8Array(ciphertext)),
      }),
    );
  } catch {
    // Storage full/blocked: not fatal, the user just signs again next visit.
  }
}

function forgetCachedKeypair(walletAddress: string) {
  try {
    localStorage.removeItem(secretStorageKey(walletAddress));
  } catch {
    // Ignore — worst case the ciphertext stays cached on this device.
  }
}

/* ========================================================================== *
 * Signing API requests with the derived key
 * ========================================================================== */

/**
 * Proof-of-login helper for future API calls: the server knows the derived
 * PUBLIC key for each wallet, so a signature made with the derived SECRET key
 * proves this request comes from the logged-in user. See `src/lib/api.ts` for
 * how the server should verify this.
 */
export function signForApi(keypair: Keypair, message: string) {
  return {
    derivedPublicKey: keypair.publicKey(),
    signatureBase64: toBase64(
      new Uint8Array(keypair.sign(asBuffer(utf8(message)))),
    ),
  };
}

/* ========================================================================== *
 * React: auth provider + useAuth()
 * ========================================================================== */

export type AuthStatus =
  /** Blux is still booting, or a sign-in step is in flight. Wait. */
  | 'loading'
  /** No Blux session — show the "Continue with Blux" button. */
  | 'signed-out'
  /** Blux session exists but the ownership signature is missing/failed. */
  | 'sign-required'
  /** Fully signed in, but no BeSeen account yet — ask for username + logo. */
  | 'needs-username'
  /** Signed in and registered — the app is usable. */
  | 'ready';

export type AuthContextValue = {
  status: AuthStatus;
  /** What the sign-in machinery is doing while `status` is "loading". */
  busyLabel: string | null;
  /** The Stellar address of the Blux account (G…). */
  address: string | null;
  /** The derived keypair. Its secret never leaves this browser. */
  keypair: Keypair | null;
  /** The BeSeen account, once registered. */
  user: User | null;
  error: string | null;
  /** Opens the Blux modal, then runs the signature + derivation steps. */
  login: () => Promise<void>;
  /** Re-runs signature + derivation (retry path for `sign-required`). */
  completeSignIn: () => Promise<void>;
  logout: () => void;
  /** Store the account returned by register/update calls. */
  setUser: (user: User) => void;
  /** Opens Blux's built-in wallet profile modal. */
  openWalletProfile: () => void;
  /** Asks Blux to fund the connected Testnet wallet (friendbot). */
  fundWallet: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function AuthBridge({ children }: { children: ReactNode }) {
  const blux = useBlux();
  const address = blux.user?.address ?? null;

  const [keys, setKeys] = useState<{ address: string; keypair: Keypair } | null>(null);
  // `user` is only meaningful after the API was asked about `address`;
  // `checkedAddress` records which address that answer belongs to.
  const [user, setUserState] = useState<User | null>(null);
  const [checkedAddress, setCheckedAddress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  // Only auto-prompt for a signature once per address per page load —
  // afterwards the user retries explicitly from the login screen.
  const autoAttempted = useRef<string | null>(null);

  const keypair = keys && keys.address === address ? keys.keypair : null;

  /**
   * Finish sign-in for the current Blux session: get the deterministic
   * keypair (cache first, wallet signature otherwise) and ask the API whether
   * this wallet already has a BeSeen account.
   */
  const completeSignIn = useCallback(async () => {
    if (!address || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      setBusyLabel('Unlocking your keys…');
      let derived = await loadCachedKeypair(address);
      if (!derived) {
        setBusyLabel(
          'Creating your keypair — approve the signature request in your wallet',
        );
        derived = await deriveKeypair(address, blux.signTransaction);
        await cacheKeypair(address, derived);
      }
      setKeys({ address, keypair: derived });

      setBusyLabel('Loading your BeSeen account…');
      const existing = await api.getUserByWallet(address);
      setUserState(existing);
      setCheckedAddress(address);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Secure sign-in could not be completed.',
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
      setBusyLabel(null);
    }
  }, [address, blux.signTransaction]);

  /** Blux modal → then immediately continue with the signature step. */
  const login = useCallback(async () => {
    setError(null);
    try {
      await withTimeout(blux.login(), 'Sign in');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Sign-in was not completed.',
      );
      throw cause;
    }
    // The auto sign-in effect below picks the new session up as well, but
    // running it here keeps errors attached to the button that was clicked.
    await completeSignIn();
  }, [blux, completeSignIn]);

  const logout = useCallback(() => {
    // The secret is re-derivable by signing again, so wiping it on logout
    // costs nothing and keeps it off shared machines.
    if (address) forgetCachedKeypair(address);
    blux.logout();
    setKeys(null);
    setUserState(null);
    setCheckedAddress(null);
    setError(null);
    autoAttempted.current = null;
  }, [address, blux]);

  const setUser = useCallback((next: User) => {
    setUserState(next);
    setCheckedAddress(next.walletAddress);
  }, []);

  // Blux's built-in wallet screens, exposed so app pages never import Blux.
  const openWalletProfile = useCallback(() => blux.profile(), [blux]);
  const fundWallet = useCallback(() => blux.fundMe(), [blux]);

  /**
   * Auto-advance: whenever a Blux session exists (fresh login, page refresh,
   * or another tab) and we are missing the keypair or the account check,
   * complete the sign-in automatically — the user never has to click again.
   */
  useEffect(() => {
    if (!blux.isReady || !blux.isAuthenticated || !address) return;
    if (keypair && checkedAddress === address) return;
    let stale = false;
    void (async () => {
      // A cached keypair means no wallet prompt — always safe to auto-run.
      // Otherwise prompt automatically only once per address per page load.
      if (!(await loadCachedKeypair(address))) {
        if (autoAttempted.current === address) return;
        autoAttempted.current = address;
      }
      if (!stale) void completeSignIn();
    })();
    return () => {
      stale = true;
    };
  }, [
    address,
    blux.isAuthenticated,
    blux.isReady,
    checkedAddress,
    completeSignIn,
    keypair,
  ]);

  const status: AuthStatus = !blux.isReady
    ? 'loading'
    : !blux.isAuthenticated || !address
      ? 'signed-out'
      : busy
        ? 'loading'
        : !keypair
          ? 'sign-required'
          : checkedAddress !== address
            ? 'loading'
            : user
              ? 'ready'
              : 'needs-username';

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      busyLabel,
      address,
      keypair,
      user,
      error,
      login,
      completeSignIn,
      logout,
      setUser,
      openWalletProfile,
      fundWallet,
    }),
    [
      status,
      busyLabel,
      address,
      keypair,
      user,
      error,
      login,
      completeSignIn,
      logout,
      setUser,
      openWalletProfile,
      fundWallet,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Mount once near the root (see `src/providers/index.tsx`). Client-side only —
 * Blux talks to wallet extensions and localStorage.
 */
export function BeSeenAuthProvider({ children }: { children: ReactNode }) {
  if (!bluxConfig.appId) {
    throw new Error('NEXT_PUBLIC_BLUX_APP_ID is required (see .env.example).');
  }
  return (
    <BluxProvider config={bluxConfig}>
      <AuthBridge>{children}</AuthBridge>
    </BluxProvider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside BeSeenAuthProvider.');
  }
  return context;
}
