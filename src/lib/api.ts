'use client';

/**
 * =============================================================================
 * MOCK API — the real BeSeen backend is disabled for now.
 * =============================================================================
 *
 * Nothing in this file talks to the network. Every function below persists to
 * localStorage so the app behaves as if a server existed. When the backend is
 * ready, replace each function body with a `fetch` call — the signatures and
 * return shapes are the contract the backend should implement:
 *
 *   api.getUserByWallet(walletAddress)         GET  /v1/users/by-wallet/:walletAddress
 *   api.register({ walletAddress,              POST /v1/users
 *     derivedPublicKey, username, avatarUrl })
 *   api.updateUser(walletAddress, changes)     PATCH /v1/users/me
 *   api.checkUsername(username)                GET  /v1/users/username-availability?username=…
 *   api.getPublicProfile(username)             GET  /v1/users/:username
 *   api.getFollowers(userId)                   GET  /v1/users/:userId/followers
 *   api.publishBroadcast({senderId, copies})   POST /v1/broadcasts
 *   api.getInbox(derivedPublicKey)             GET  /v1/broadcasts?recipient=:derivedPublicKey
 *
 * The server stores exactly two identity facts per account — `walletAddress`
 * and `derivedPublicKey` — plus the profile (username + logo). It never sees a
 * secret key of any kind.
 *
 * BROADCASTS ARE OPAQUE TO THE SERVER
 *   A broadcast row is { id (uuid), senderId (→ users.id), createdAt,
 *   copies[] } where every copy is { recipientPublicKey, ciphertext } — the
 *   message encrypted client-side for one recipient's derived public key
 *   (see `src/lib/broadcast-crypto.ts`). The sender is one of the recipients
 *   so they can reread their own messages. The inbox endpoint returns, per
 *   broadcast, ONLY the copy addressed to the caller. The server never sees
 *   plaintext and cannot decrypt anything.
 *
 * AUTHENTICATING REAL REQUESTS LATER
 *   The server knows each account's `derivedPublicKey`, and only the real user
 *   can produce signatures matching it (the secret is re-derived locally from
 *   their wallet signature — see `src/lib/blux.tsx`). So protected routes
 *   should require a signature over the request (or over a short-lived
 *   server-issued challenge) and verify it against the stored key.
 *   `signForApi()` in `src/lib/blux.tsx` is the client half of that handshake.
 */

import { RESERVED_USERNAMES } from '@/lib/constants';
import type {
  BroadcastCopy,
  Follower,
  InboxBroadcast,
  PublicUser,
  StoredBroadcast,
  User,
  UsernameAvailability,
} from '@/types';

const MOCK_DB_KEY = 'beseen:mock-api-db:v1';

type MockDb = {
  /** Users keyed by wallet address. */
  users: Record<string, User>;
  /** Encrypted broadcasts, newest first. */
  broadcasts: StoredBroadcast[];
};

function readDb(): MockDb {
  try {
    const raw = localStorage.getItem(MOCK_DB_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<MockDb>) : null;
    return {
      users:
        parsed && typeof parsed.users === 'object' && parsed.users
          ? parsed.users
          : {},
      broadcasts: Array.isArray(parsed?.broadcasts) ? parsed.broadcasts : [],
    };
  } catch {
    return { users: {}, broadcasts: [] };
  }
}

function writeDb(db: MockDb) {
  localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));
}

function findByUsername(db: MockDb, username: string): User | null {
  const normalized = username.trim().toLowerCase();
  return (
    Object.values(db.users).find((user) => user.username === normalized) ?? null
  );
}

export function validateUsername(username: string): boolean {
  const normalized = username.trim().toLowerCase();
  return (
    normalized.length >= 3 &&
    normalized.length <= 30 &&
    /^[a-z0-9_]+$/.test(normalized) &&
    !RESERVED_USERNAMES.includes(
      normalized as (typeof RESERVED_USERNAMES)[number],
    )
  );
}

export const api = {
  /** The account belonging to a wallet, or null if it never registered. */
  async getUserByWallet(walletAddress: string): Promise<User | null> {
    return readDb().users[walletAddress] ?? null;
  },

  /**
   * Creates the account. This is the ONLY write the sign-up flow needs: the
   * wallet address and the derived public key (plus username + logo).
   */
  async register(input: {
    walletAddress: string;
    derivedPublicKey: string;
    username: string;
    avatarUrl: string | null;
  }): Promise<User> {
    const db = readDb();
    const username = input.username.trim().toLowerCase();
    if (db.users[input.walletAddress]) {
      throw new Error('This wallet already has a BeSeen account.');
    }
    if (!validateUsername(username)) {
      throw new Error('Use 3–30 lowercase letters, numbers, or underscores.');
    }
    if (findByUsername(db, username)) {
      throw new Error('That username is already taken.');
    }
    const user: User = {
      id: crypto.randomUUID(),
      walletAddress: input.walletAddress,
      derivedPublicKey: input.derivedPublicKey,
      username,
      avatarUrl: input.avatarUrl,
      createdAt: new Date().toISOString(),
    };
    db.users[input.walletAddress] = user;
    writeDb(db);
    return user;
  },

  /**
   * Updates username and/or logo. The real endpoint must verify the request
   * is signed by the account's derived key (see the note at the top).
   */
  async updateUser(
    walletAddress: string,
    changes: { username?: string; avatarUrl?: string | null },
  ): Promise<User> {
    const db = readDb();
    const user = db.users[walletAddress];
    if (!user) throw new Error('This wallet has no BeSeen account.');

    if (changes.username !== undefined) {
      const username = changes.username.trim().toLowerCase();
      if (!validateUsername(username)) {
        throw new Error('Use 3–30 lowercase letters, numbers, or underscores.');
      }
      const holder = findByUsername(db, username);
      if (holder && holder.walletAddress !== walletAddress) {
        throw new Error('That username is already taken.');
      }
      user.username = username;
    }
    if (changes.avatarUrl !== undefined) {
      user.avatarUrl = changes.avatarUrl;
    }
    writeDb(db);
    return user;
  },

  async checkUsername(username: string): Promise<UsernameAvailability> {
    const normalized = username.trim().toLowerCase();
    if (!validateUsername(normalized)) {
      const reserved = RESERVED_USERNAMES.includes(
        normalized as (typeof RESERVED_USERNAMES)[number],
      );
      return {
        username: normalized,
        available: false,
        reason: reserved ? 'reserved' : 'invalid',
      };
    }
    const taken = findByUsername(readDb(), normalized) !== null;
    return {
      username: normalized,
      available: !taken,
      reason: taken ? 'taken' : null,
    };
  },

  /** Public view of a profile — never exposes wallet or key material. */
  async getPublicProfile(username: string): Promise<PublicUser | null> {
    const user = findByUsername(readDb(), username);
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  },

  /**
   * The caller's followers, reduced to what encryption needs: their derived
   * public keys. MOCK: there is no follow graph yet, so every other
   * registered user counts as a follower — the real endpoint only has to
   * return this same shape for the actual followers.
   */
  async getFollowers(userId: string): Promise<Follower[]> {
    return Object.values(readDb().users)
      .filter((user) => user.id !== userId)
      .map((user) => ({
        userId: user.id,
        username: user.username,
        derivedPublicKey: user.derivedPublicKey,
      }));
  },

  /**
   * Stores a broadcast. The server assigns the UUID and timestamp and links
   * the sender by user id; the copies arrive already encrypted, one per
   * recipient, and are stored untouched — no plaintext ever reaches the API.
   */
  async publishBroadcast(input: {
    senderId: string;
    copies: BroadcastCopy[];
  }): Promise<StoredBroadcast> {
    const db = readDb();
    const sender = Object.values(db.users).find(
      (user) => user.id === input.senderId,
    );
    if (!sender) throw new Error('Unknown sender.');
    if (input.copies.length === 0) {
      throw new Error('A broadcast needs at least one encrypted copy.');
    }
    const broadcast: StoredBroadcast = {
      id: crypto.randomUUID(),
      senderId: input.senderId,
      createdAt: new Date().toISOString(),
      copies: input.copies,
    };
    db.broadcasts.unshift(broadcast);
    writeDb(db);
    return broadcast;
  },

  /**
   * Everything addressed to one derived public key (own messages included —
   * the sender encrypts a copy for themselves), newest first. Each item
   * carries ONLY the caller's copy plus joined sender info.
   */
  async getInbox(derivedPublicKey: string): Promise<InboxBroadcast[]> {
    const db = readDb();
    const byId = new Map(
      Object.values(db.users).map((user) => [user.id, user]),
    );
    const inbox: InboxBroadcast[] = [];
    for (const broadcast of db.broadcasts) {
      const copy = broadcast.copies.find(
        (candidate) => candidate.recipientPublicKey === derivedPublicKey,
      );
      if (!copy) continue;
      const sender = byId.get(broadcast.senderId);
      inbox.push({
        id: broadcast.id,
        sender: {
          id: broadcast.senderId,
          username: sender?.username ?? 'unknown',
          avatarUrl: sender?.avatarUrl ?? null,
        },
        createdAt: broadcast.createdAt,
        ciphertext: copy.ciphertext,
      });
    }
    return inbox;
  },
};
