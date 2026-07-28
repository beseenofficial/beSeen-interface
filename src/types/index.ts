/** A BeSeen account as the API stores it. */
export type User = {
  id: string;
  /** The Stellar account the user signed in with through Blux (G…). */
  walletAddress: string;
  /**
   * The public half of the keypair deterministically derived from the user's
   * SEP-10 challenge signature (see `src/lib/blux.tsx`). The secret half never
   * leaves the user's browser.
   */
  derivedPublicKey: string;
  username: string;
  /** The user's logo — a data URL or https URL, or null for the default. */
  avatarUrl: string | null;
  createdAt: string;
};

/** What anyone may see about an account — no key material. */
export type PublicUser = Omit<User, 'walletAddress' | 'derivedPublicKey'>;

export type UsernameAvailability = {
  username: string;
  available: boolean;
  reason: 'invalid' | 'reserved' | 'taken' | null;
};

/** A follower, reduced to what encryption needs: their derived public key. */
export type Follower = {
  userId: string;
  username: string;
  derivedPublicKey: string;
};

/**
 * One encrypted copy of a broadcast. The same message is encrypted separately
 * for every recipient (sender included) — the server stores only ciphertext.
 */
export type BroadcastCopy = {
  /** The derived public key this copy is encrypted for (G…). */
  recipientPublicKey: string;
  /** ECIES payload, base64: ephemeralPub(32) ‖ iv(12) ‖ ciphertext. */
  ciphertext: string;
};

/** A broadcast as the API/DB stores it — no plaintext anywhere. */
export type StoredBroadcast = {
  /** UUID, assigned by the server. */
  id: string;
  /** The sender's User.id. */
  senderId: string;
  createdAt: string;
  copies: BroadcastCopy[];
};

/** What the inbox endpoint returns: only the copy meant for the caller. */
export type InboxBroadcast = {
  id: string;
  sender: { id: string; username: string; avatarUrl: string | null };
  createdAt: string;
  ciphertext: string;
};

/** An inbox item after local decryption with the derived secret key. */
export type DecryptedBroadcast = {
  id: string;
  sender: InboxBroadcast['sender'];
  createdAt: string;
  /** null when this device could not decrypt the payload. */
  content: string | null;
};
