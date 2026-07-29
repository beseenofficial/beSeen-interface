export type User = {
  id: string;
  username: string;
  avatar: string | null;
  createdAt: string;
};

export type PublicUser = User;

export type UsernameAvailability = {
  username: string;
  available: boolean;
  reason: 'invalid' | 'reserved' | 'taken' | null;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshTokenExpiresAt: string;
};

export type AuthenticatedResult = { user: User; auth: AuthTokens };

export type AuthConfig = {
  stellarNetwork: 'public' | 'testnet';
  networkPassphrase: string;
  keyDerivation: {
    version: 1;
    source: 'STELLAR_WALLET_FIXED_TRANSACTION_SIGNATURE';
    walletMethod: 'signTransaction';
    transaction: {
      builtBy: 'client';
      sourceAccount: 'connected-wallet';
      sequence: '0';
      feeStroops: '100';
      timeBounds: { minTime: '0'; maxTime: '0' };
      memo: 'none';
      operation: {
        type: 'manageData';
        name: 'beseen_kdf_v1';
        value: 'beseen.fi/key-derivation/v1';
      };
      submissionRequired: false;
    };
    signature: { lengthBytes: 64; sentToServer: false };
    kdf: {
      name: 'HKDF-SHA-256';
      salt: string;
      seedLengthBytes: 32;
      signingInfo: string;
      encryptionInfo: string;
    };
    signingAlgorithm: 'Ed25519';
    encryptionAlgorithm: 'X25519';
    privateKeyStorage: 'client-only';
  };
  registration: Record<string, unknown>;
  login: { proof: string; version: 1; maxAgeSeconds: number };
  session: Record<string, unknown>;
};

export type DerivedKeys = {
  signingPublicKey: Uint8Array;
  signingPrivateKey: Uint8Array;
  encryptionPublicKey: Uint8Array;
  encryptionPrivateKey: Uint8Array;
};

export type UserToken = {
  id: string;
  owner: Pick<User, 'id' | 'username' | 'avatar'>;
  createdAt: string;
  acquiredAt?: string;
};

export type TokenHolding = {
  tokenId: string;
  ownerId: string;
  ownerUsername: string;
  acquiredAt: string;
};

export type BroadcastRecipient = {
  userId: string;
  username: string;
  keyVersion: number;
  encryptionPublicKey: string;
  keyUploaded: boolean;
  encryptedBroadcastKey: string | null;
};

export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type BroadcastProgress = {
  uploadedCount: number;
  remainingCount: number;
  complete: boolean;
};

export type BroadcastDraft = {
  id: string;
  clientBroadcastId: string;
  status: 'draft';
  audience: { type: 'token_holders'; count: number };
  encryption: {
    version: 1;
    contentSuite: 'XCHACHA20-POLY1305-IETF';
    keyWrapSuite: 'X25519-XSALSA20-POLY1305-SEALEDBOX';
  };
  creatorKey: { keyVersion: number; encryptionPublicKey: string };
  progress: BroadcastProgress;
  recipients: CursorPage<BroadcastRecipient>;
  createdAt: string;
  expiresAt: string;
};

export type BroadcastDraftListItem = Omit<BroadcastDraft, 'recipients'>;

export type PublishedBroadcast = {
  id: string;
  clientBroadcastId: string;
  creatorId: string;
  status: 'published';
  audience: { type: 'token_holders'; count: number };
  encryptionVersion: 1;
  contentCiphertext: string;
  contentNonce: string;
  creatorEncryptedBroadcastKey: string;
  recipientKeysDigest: string;
  signature: string;
  publishedAt: string;
};

export type BroadcastFeedItem = {
  id: string;
  clientBroadcastId: string;
  creator: Pick<User, 'id' | 'username' | 'avatar'>;
  manifest: {
    signatureVersion: 1;
    encryptionVersion: 1;
    contentSuite: 'XCHACHA20-POLY1305-IETF';
    keyWrapSuite: 'X25519-XSALSA20-POLY1305-SEALEDBOX';
    creatorId: string;
    creatorKeyVersion: number;
    contentCiphertext: string;
    contentNonce: string;
    creatorEncryptedBroadcastKey: string;
    audienceType: 'token_holders';
    audienceCount: number;
    recipientKeysDigest: string;
  };
  viewerKey: {
    source: 'recipient' | 'creator';
    keyVersion: number;
    encryptedBroadcastKey: string;
  };
  integrity: {
    algorithm: 'Ed25519';
    signingPublicKey: string;
    signature: string;
  };
  publishedAt: string;
};

export type DecryptedBroadcast = BroadcastFeedItem & {
  content: string | null;
  state: 'decrypted' | 'locked' | 'invalid';
};
