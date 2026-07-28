export type AccountType = "regular" | "creator";

export type CreatorProfile = {
  headline: string;
  categories: string[];
  skills: string[];
  websiteUrl: string | null;
  isAvailableForWork: boolean;
};

export type User = {
  id: string;
  walletAddress: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  accountType: AccountType;
  creatorProfile: CreatorProfile | null;
  createdAt: string;
};

export type PublicUser = Omit<User, "walletAddress">;

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  refreshTokenExpiresAt: string;
};

export type AuthenticatedResult = {
  user: User;
  auth: AuthTokens;
};

export type ApiSuccess<T> = {
  status: "success";
  message: string;
  result: T;
};

export type ApiValidationIssue = {
  path: string;
  message: string;
};

export type ApiErrorBody = {
  status: "error";
  message: string;
  result: {
    code?: string;
    issues?: ApiValidationIssue[];
    attemptsRemaining?: number;
    remainingCount?: number;
    [key: string]: unknown;
  };
};

export type AuthClientConfig = {
  protocol: {
    authenticationStandard: "SEP-10";
    challengeFormat: "stellar-transaction-xdr";
    walletMethod: "signTransaction";
    stellarNetwork: "public" | "testnet";
    networkPassphrase: string;
    authDomain: string;
    serverSigningPublicKey: string;
    transactionSubmissionRequired: false;
    challengeTtlSeconds: number;
    accessTokenTtlSeconds: number;
  };
  keyDerivation: {
    version: 1;
    source: "CLIENT_GENERATED";
    kdf: {
      name: "HKDF-SHA-256";
      input: "CLIENT-RANDOM-32-BYTE-MASTER-SECRET";
      inputEncoding: "raw-bytes";
      salt: string;
      seedLengthBytes: 32;
      signingInfo: string;
      encryptionInfo: string;
    };
    signingAlgorithm: "Ed25519";
    encryptionAlgorithm: "X25519";
  };
};

export type RegistrationProfileInput = {
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string | null;
  accountType: AccountType;
  creatorProfile?: {
    headline: string;
    categories: string[];
    skills?: string[];
    websiteUrl?: string | null;
    isAvailableForWork?: boolean;
  };
};

export type ProfileUpdate = Partial<
  Pick<User, "username" | "displayName" | "bio" | "avatarUrl" | "accountType">
> & {
  creatorProfile?: Partial<CreatorProfile>;
};

export type UsernameAvailability = {
  username: string;
  available: boolean;
  reason: "invalid" | "reserved" | "taken" | null;
};

export type PublicUserKeys = {
  derivationVersion: number;
  signing: { algorithm: "Ed25519"; publicKey: string };
  encryption: { algorithm: "X25519"; publicKey: string };
};

export type ChallengeResult = {
  challengeId: string;
  authenticationStandard: "SEP-10";
  transactionXdr: string;
  stellarNetwork: "public" | "testnet";
  networkPassphrase: string;
  serverSigningPublicKey: string;
  homeDomain: string;
  expiresAt: string;
};

export type BroadcastRecipient = {
  userId: string;
  username: string;
  keyVersion: number;
  encryptionPublicKey: string;
  keyUploaded: boolean;
  encryptedBroadcastKey: string | null;
};

export type BroadcastRecipientPage = {
  items: BroadcastRecipient[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type BroadcastDraftProgress = {
  uploadedCount: number;
  remainingCount: number;
  complete: boolean;
};

export type BroadcastDraft = {
  id: string;
  clientBroadcastId: string;
  status: "draft";
  audience: {
    type: "all_active_users" | "token_holders";
    count: number;
  };
  encryption: {
    version: number;
    contentSuite: string;
    keyWrapSuite: string;
  };
  creatorKey: {
    keyVersion: number;
    encryptionPublicKey: string;
  };
  progress: BroadcastDraftProgress;
  recipients: BroadcastRecipientPage;
  createdAt: string;
  expiresAt: string;
};

export type BroadcastDraftListItem = Omit<BroadcastDraft, "recipients">;

export type BroadcastDraftListPage = {
  items: BroadcastDraftListItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type BroadcastFeedItem = {
  id: string;
  clientBroadcastId: string;
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  manifest: {
    signatureVersion: 1;
    encryptionVersion: 1;
    contentSuite: "XCHACHA20-POLY1305-IETF";
    keyWrapSuite: "X25519-XSALSA20-POLY1305-SEALEDBOX";
    creatorId: string;
    creatorKeyVersion: number;
    contentCiphertext: string;
    contentNonce: string;
    creatorEncryptedBroadcastKey: string;
    audienceType: "all_active_users" | "token_holders";
    audienceCount: number;
    recipientKeysDigest: string;
  };
  viewerKey: {
    source: "recipient" | "creator";
    keyVersion: number;
    encryptedBroadcastKey: string;
  };
  integrity: {
    algorithm: "Ed25519";
    signingPublicKey: string;
    signature: string;
  };
  publishedAt: string;
};

export type BroadcastFeedPage = {
  view: "received" | "sent";
  items: BroadcastFeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type PublishedBroadcast = {
  id: string;
  clientBroadcastId: string;
  creatorId: string;
  status: "published";
  audience: {
    type: "all_active_users" | "token_holders";
    count: number;
  };
  encryptionVersion: number;
  contentCiphertext: string;
  contentNonce: string;
  creatorEncryptedBroadcastKey: string;
  recipientKeysDigest: string;
  signature: string;
  publishedAt: string;
};

export type DecryptedBroadcast = {
  id: string;
  clientBroadcastId: string;
  creator: BroadcastFeedItem["creator"];
  content: string | null;
  audienceCount: number;
  publishedAt: string;
  source: "recipient" | "creator";
  integrity: "verified" | "failed";
};

export type CreatorActivity = {
  id: string;
  type: "account_created" | "broadcast_published" | "broadcast_received";
  title: string;
  description?: string;
  createdAt: string;
};

export type DashboardOverview = {
  profile: User;
  sent: DecryptedBroadcast[];
  received: DecryptedBroadcast[];
  sentHasMore: boolean;
  receivedHasMore: boolean;
  activity: CreatorActivity[];
};
