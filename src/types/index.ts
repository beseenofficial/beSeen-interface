export type UserVerification = {
  isVerified: boolean;
  grantedAt: string | null;
  expiresAt: string | null;
};

/**
 * The subject's current on-chain Aura price as reported by the server.
 *
 * This is the raw `aura_price(subject)` contract result serialized as a
 * base-unit integer string (7 decimal places for the USDC-style flow).
 * `null` means the server temporarily could not read the contract RPC; it
 * never means "free" and never means zero.
 */
export type AuraPrice = string | null;

export type BaseUser = {
  id: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  verification: UserVerification;
  createdAt: string;
};

export type PublicUserProfile = BaseUser & {
  /** Stellar `G...` address used as the `subject` of `buy_aura`. */
  walletAddress: string;
  auraPrice: AuraPrice;
  broadcastCount: number;
  sentMessageCount: number;
  receivedMessageCount: number;
  messageCount: number;
  totalBountyReceivedUsdc: string;
};

export type CurrentUserProfile = BaseUser & {
  auraPrice: AuraPrice;
};

export type FollowCounts = {
  user: { id: string; username: string };
  followerCount: number;
  followingCount: number;
};

export type User = CurrentUserProfile;
export type PublicUser = PublicUserProfile;

export type DiscoverUser = {
  id: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  auraPrice: AuraPrice;
  followerCount: number;
  followingCount: number;
  verification: UserVerification;
};

export type DiscoverUsersResult = {
  users: DiscoverUser[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type DiscoverUsersResponse = {
  status: 'success';
  message: string;
  result: DiscoverUsersResult;
};

export type DiscoverUsersQuery = {
  limit?: number;
  cursor?: string;
};

export type UserActivity = {
  creditedSeconds: number;
  lastActiveAt: string;
  isOnline: boolean;
};

export type UserActivityResult = {
  activity: UserActivity;
};

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

export type AuraPurchaseStatus = 'pending' | 'confirmed' | 'failed';

export type AuraPurchaseRegistration = {
  /** Contract-generated global Aura token ID (u64 decimal string). */
  tokenId: string;
  buyerId: string;
  subjectId: string;
  subjectUsername: string;
  /** Lowercase 64-character hexadecimal transaction hash. */
  transactionHash: string;
  status: AuraPurchaseStatus;
  confirmedAt: string | null;
};

export type AuraPurchaseConversation = {
  id: string;
  created: boolean;
};

export type AuraPurchaseRegistrationResult = {
  purchase: AuraPurchaseRegistration;
  /** Present once the purchase is confirmed; `null` while pending (HTTP 202). */
  conversation: AuraPurchaseConversation | null;
};

export type MessengerParticipant = Pick<User, 'id' | 'username' | 'avatar'>;

export type MessengerConversationLastMessage = {
  sequence: number;
  clientMessageId: string;
  senderId: string;
  createdAt: string;
};

export type MessengerConversationReadState = {
  viewerReadSequence: number;
  otherParticipantReadSequence: number;
};

export type MessengerConversation = {
  id: string;
  otherParticipant: MessengerParticipant;
  unreadCount: number;
  readState: MessengerConversationReadState;
  lastMessage: MessengerConversationLastMessage | null;
  lastMessageAt: string | null;
  createdAt: string;
};

export type MessengerConversationPage = CursorPage<MessengerConversation>;

export type MessengerContextParticipant = MessengerParticipant & {
  /** Stellar account used for on-chain bounty settlement. */
  walletAddress: string;
  keyVersion: number;
  signingPublicKey: string;
  encryptionPublicKey: string;
};

export type MessengerConversationContext = {
  conversationId: string;
  viewer: MessengerContextParticipant;
  otherParticipant: MessengerContextParticipant;
};

export type MessengerBountyTerms = {
  /**
   * Contract-generated global bounty ID (positive u64 decimal string),
   * returned by the client-signed `lock_bounty` transaction. Required: the
   * message manifest is only built and signed after the contract returns it.
   * Never a JavaScript number, never a MongoDB ObjectId.
   */
  contractBountyId: string;
  assetCode: 'USDC';
  /** Canonical positive decimal string with at most 7 decimal places. */
  amount: string;
  durationSeconds: number;
};

/**
 * The bounty terms known before the on-chain lock: everything except the
 * contract-generated ID. `lock_bounty` is called with these; the full
 * MessengerBountyTerms exist only after the contract returns the ID.
 */
export type MessengerBountyLockTerms = Omit<MessengerBountyTerms, 'contractBountyId'>;

export type ContractBountySettlementStatus =
  | 'pending'
  | 'processing'
  | 'confirmed'
  | 'failed';

/**
 * On-chain funding state of a bounty. Only contract-backed values exist.
 * The server does not serialize this field on message bounties yet; when it
 * does, `contract_refunded` distinguishes a sender-reclaimed expired bounty
 * from one whose response window simply ended.
 */
export type MessengerBountyFundingStatus =
  | 'contract_locked'
  | 'contract_settled'
  | 'contract_refunded';

export type MessengerBounty = MessengerBountyTerms & {
  /** Server (MongoDB) bounty ID. Never interchangeable with contractBountyId. */
  id: string;
  status: 'offered' | 'claimable' | 'claimed' | 'expired';
  fundingStatus?: MessengerBountyFundingStatus;
  settlementStatus: ContractBountySettlementStatus;
  settlementTransactionHash: string | null;
  expiresAt: string;
  replyMessageId: string | null;
  claimableAt: string | null;
  claimedAt: string | null;
};

export type MessengerMessageManifest = {
  signatureVersion: 1;
  encryptionVersion: 1;
  contentSuite: 'XCHACHA20-POLY1305-IETF';
  keyWrapSuite: 'X25519-XSALSA20-POLY1305-SEALEDBOX';
  conversationId: string;
  clientMessageId: string;
  senderId: string;
  recipientId: string;
  senderKeyVersion: number;
  recipientKeyVersion: number;
  senderSigningPublicKey: string;
  senderEncryptionPublicKey: string;
  recipientEncryptionPublicKey: string;
  contentCiphertext: string;
  contentNonce: string;
  senderEncryptedMessageKey: string;
  recipientEncryptedMessageKey: string;
  replyToMessageId: string | null;
  bountyTerms: MessengerBountyTerms | null;
};

export type MessengerMessageHistoryItem = {
  id: string;
  sequence: number;
  manifest: MessengerMessageManifest;
  viewerKey: {
    source: 'sender' | 'recipient';
    keyVersion: number;
    encryptionPublicKey: string;
    encryptedMessageKey: string;
  };
  integrity: {
    algorithm: 'Ed25519';
    signingPublicKey: string;
    signature: string;
  };
  delivery: { seenByRecipient: boolean };
  bounty: MessengerBounty | null;
  createdAt: string;
};

export type MessengerMessageHistoryPage = {
  items: MessengerMessageHistoryItem[];
  nextBeforeSequence: number | null;
  hasMore: boolean;
};

export type MessengerSendMessagePayload = {
  clientMessageId: string;
  contentCiphertext: string;
  contentNonce: string;
  senderEncryptedMessageKey: string;
  recipientEncryptedMessageKey: string;
  replyToMessageId: string | null;
  bounty: MessengerBountyTerms | null;
  signature: string;
};

export type MessengerSentMessage = {
  id: string;
  conversationId: string;
  sequence: number;
  clientMessageId: string;
  senderId: string;
  recipientId: string;
  replyToMessageId: string | null;
  bounty: MessengerBounty | null;
  unlockedBounty: MessengerBounty | null;
  createdAt: string;
};

export type MessengerReadReceipt = {
  conversationId: string;
  readSequence: number;
  unreadCount: number;
};

export type DecryptedMessengerMessage = MessengerMessageHistoryItem & {
  plaintext: string | null;
  state: 'decrypted' | 'invalid';
};

export type BroadcastRecipient = {
  userId: string;
  username: string;
  keyVersion: number;
  encryptionPublicKey: string;
  keyUploaded: boolean;
  encryptedBroadcastKey: string | null;
};

export type BroadcastRecipientSummary = Pick<BroadcastRecipient, 'userId' | 'username'>;

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

/**
 * Broadcast audiences are server-generated snapshots of confirmed Aura
 * followers. `demo_all_users` survives only in previously stored records.
 */
export type BroadcastAudienceType = 'aura_holders' | 'demo_all_users';

export type BroadcastDraft = {
  id: string;
  clientBroadcastId: string;
  status: 'draft';
  audience: { type: BroadcastAudienceType; count: number };
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
  audience: { type: BroadcastAudienceType; count: number };
  encryptionVersion: 1;
  contentCiphertext: string;
  contentNonce: string;
  creatorEncryptedBroadcastKey: string;
  recipientKeysDigest: string;
  signature: string;
  publishedAt: string;
};

export type PublishedBroadcastResult = PublishedBroadcast & {
  recipients: BroadcastRecipientSummary[];
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
    audienceType: BroadcastAudienceType;
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
