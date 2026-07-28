"use client";

import sodium from "libsodium-wrappers-sumo";
import { beseenApi } from "@/lib/beseen-api";
import {
  fromBase64,
  loadLocalBeSeenKeys,
  toBase64,
} from "@/lib/crypto/messaging-keys";
import {
  deleteSecureRecord,
  getSecureJson,
  putSecureJson,
} from "@/lib/secure-storage";
import type {
  BroadcastDraft,
  BroadcastDraftListItem,
  BroadcastFeedItem,
  BroadcastFeedPage,
  BroadcastRecipient,
  DecryptedBroadcast,
  User,
} from "@/types";

const CONTENT_SUITE = "XCHACHA20-POLY1305-IETF";
const KEY_WRAP_SUITE = "X25519-XSALSA20-POLY1305-SEALEDBOX";
const MAX_PLAINTEXT_BYTES = 65_536;
const draftRecordId = (draftId: string) => `broadcast-draft:${draftId}`;
const clientRecordId = (clientBroadcastId: string) =>
  `broadcast-client:${clientBroadcastId}`;

type FinalizePayload = {
  contentCiphertext: string;
  contentNonce: string;
  creatorEncryptedBroadcastKey: string;
  signature: string;
};

type LocalDraftSecretState = {
  draftId?: string;
  clientBroadcastId: string;
  contentKey: string;
  encryptedKeysByRecipientId: Record<string, string>;
  contentNonce: string;
  contentCiphertext: string;
  creatorEncryptedBroadcastKey?: string;
  finalizePayload?: FinalizePayload;
};

const utf8 = (value: string) => new TextEncoder().encode(value);

function ensureDraftProtocol(draft: Pick<BroadcastDraft, "encryption">) {
  if (
    draft.encryption.version !== 1 ||
    draft.encryption.contentSuite !== CONTENT_SUITE ||
    draft.encryption.keyWrapSuite !== KEY_WRAP_SUITE
  ) {
    throw new Error("UNSUPPORTED_BROADCAST_PROTOCOL");
  }
}

function wrapContentKey(contentKey: Uint8Array, publicKeyBase64: string) {
  const publicKey = fromBase64(publicKeyBase64);
  if (publicKey.length !== 32) throw new Error("INVALID_X25519_PUBLIC_KEY");
  const wrapped = sodium.crypto_box_seal(contentKey, publicKey);
  if (wrapped.length !== 80) throw new Error("INVALID_WRAPPED_KEY_LENGTH");
  return toBase64(wrapped);
}

async function recipientKeysDigest(entries: BroadcastRecipient[]) {
  const canonical = entries
    .map((entry) => {
      if (!entry.encryptedBroadcastKey) {
        throw new Error("RECIPIENT_KEYS_INCOMPLETE");
      }
      return [
        entry.userId.toLowerCase(),
        entry.keyVersion,
        entry.encryptionPublicKey,
        entry.encryptedBroadcastKey,
      ];
    })
    .sort(([firstId], [secondId]) => {
      const first = String(firstId);
      const second = String(secondId);
      return first < second ? -1 : first > second ? 1 : 0;
    });
  const hash = await crypto.subtle.digest(
    "SHA-256",
    utf8(JSON.stringify(canonical)),
  );
  return Array.from(
    new Uint8Array(hash),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

function buildBroadcastSignatureMessage(input: {
  broadcastId: string;
  clientBroadcastId: string;
  creatorId: string;
  creatorKeyVersion: number;
  encryptionVersion: number;
  contentCiphertext: string;
  contentNonce: string;
  creatorEncryptedBroadcastKey: string;
  audienceType: string;
  audienceCount: number;
  recipientKeysDigest: string;
}) {
  return [
    "BeSeen Encrypted Broadcast",
    "Signature Version: 1",
    `Encryption Version: ${input.encryptionVersion}`,
    `Content Suite: ${CONTENT_SUITE}`,
    `Key Wrap Suite: ${KEY_WRAP_SUITE}`,
    `Broadcast ID: ${input.broadcastId.toLowerCase()}`,
    `Client Broadcast ID: ${input.clientBroadcastId.toLowerCase()}`,
    `Creator ID: ${input.creatorId.toLowerCase()}`,
    `Creator Key Version: ${input.creatorKeyVersion}`,
    `Content Nonce: ${input.contentNonce}`,
    `Content Ciphertext: ${input.contentCiphertext}`,
    `Creator Encrypted Broadcast Key: ${input.creatorEncryptedBroadcastKey}`,
    `Audience Type: ${input.audienceType}`,
    `Audience Count: ${input.audienceCount}`,
    `Recipient Keys Digest: ${input.recipientKeysDigest}`,
  ].join("\n");
}

async function fetchAllRecipients(
  draftId: string,
  firstPage?: BroadcastDraft["recipients"],
): Promise<BroadcastRecipient[]> {
  const recipients = firstPage ? [...firstPage.items] : [];
  let cursor = firstPage?.nextCursor ?? undefined;
  let hasMore = firstPage?.hasMore ?? true;
  while (hasMore) {
    const result = await beseenApi.getBroadcastRecipients(draftId, cursor);
    recipients.push(...result.recipients.items);
    hasMore = result.recipients.hasMore;
    cursor = result.recipients.nextCursor ?? undefined;
  }
  return recipients;
}

async function saveDraftState(state: LocalDraftSecretState) {
  if (state.draftId) {
    await putSecureJson(draftRecordId(state.draftId), state);
  } else {
    await putSecureJson(clientRecordId(state.clientBroadcastId), state);
  }
}

async function loadDraftState(
  draft: Pick<BroadcastDraftListItem, "id" | "clientBroadcastId">,
) {
  const byDraft = await getSecureJson<LocalDraftSecretState>(
    draftRecordId(draft.id),
  );
  if (byDraft) return byDraft;
  const byClient = await getSecureJson<LocalDraftSecretState>(
    clientRecordId(draft.clientBroadcastId),
  );
  if (!byClient) return null;
  const promoted = { ...byClient, draftId: draft.id };
  await putSecureJson(draftRecordId(draft.id), promoted);
  await deleteSecureRecord(clientRecordId(draft.clientBroadcastId));
  return promoted;
}

async function processDraft(
  draft: BroadcastDraft | BroadcastDraftListItem,
  user: User,
  state: LocalDraftSecretState,
) {
  await sodium.ready;
  ensureDraftProtocol(draft);
  const localKeys = await loadLocalBeSeenKeys(user.walletAddress);
  if (!localKeys) {
    throw new Error("Your BeSeen identity keys are missing from this device.");
  }
  if (draft.creatorKey.keyVersion !== localKeys.derivationVersion) {
    throw new Error("The local key version does not match this draft.");
  }

  const contentKey = fromBase64(state.contentKey);
  if (contentKey.length !== 32) throw new Error("INVALID_CONTENT_KEY");
  if (!state.creatorEncryptedBroadcastKey) {
    state.creatorEncryptedBroadcastKey = wrapContentKey(
      contentKey,
      draft.creatorKey.encryptionPublicKey,
    );
    await saveDraftState(state);
  }

  const recipients = await fetchAllRecipients(
    draft.id,
    "recipients" in draft ? draft.recipients : undefined,
  );
  const missing: Array<{
    recipientId: string;
    keyVersion: number;
    encryptedBroadcastKey: string;
  }> = [];
  for (const recipient of recipients) {
    const serverValue = recipient.encryptedBroadcastKey;
    if (serverValue) {
      state.encryptedKeysByRecipientId[recipient.userId] = serverValue;
      continue;
    }
    let encrypted = state.encryptedKeysByRecipientId[recipient.userId];
    if (!encrypted) {
      encrypted = wrapContentKey(
        contentKey,
        recipient.encryptionPublicKey,
      );
      state.encryptedKeysByRecipientId[recipient.userId] = encrypted;
    }
    missing.push({
      recipientId: recipient.userId,
      keyVersion: recipient.keyVersion,
      encryptedBroadcastKey: encrypted,
    });
  }

  // Sealed boxes are randomized. Persist their exact bytes before any upload.
  await saveDraftState(state);
  for (let index = 0; index < missing.length; index += 250) {
    await beseenApi.uploadRecipientKeys(draft.id, missing.slice(index, index + 250));
  }

  const manifestRecipients = await fetchAllRecipients(draft.id);
  const digest = await recipientKeysDigest(manifestRecipients);
  if (!state.finalizePayload) {
    const signatureMessage = buildBroadcastSignatureMessage({
      broadcastId: draft.id,
      clientBroadcastId: draft.clientBroadcastId,
      creatorId: user.id,
      creatorKeyVersion: draft.creatorKey.keyVersion,
      encryptionVersion: draft.encryption.version,
      contentCiphertext: state.contentCiphertext,
      contentNonce: state.contentNonce,
      creatorEncryptedBroadcastKey: state.creatorEncryptedBroadcastKey,
      audienceType: draft.audience.type,
      audienceCount: draft.audience.count,
      recipientKeysDigest: digest,
    });
    const signature = sodium.crypto_sign_detached(
      utf8(signatureMessage),
      localKeys.signing.privateKey,
    );
    state.finalizePayload = {
      contentCiphertext: state.contentCiphertext,
      contentNonce: state.contentNonce,
      creatorEncryptedBroadcastKey: state.creatorEncryptedBroadcastKey,
      signature: toBase64(signature),
    };
    await saveDraftState(state);
  }

  const result = await beseenApi.finalizeBroadcast(
    draft.id,
    state.finalizePayload,
  );
  await deleteSecureRecord(draftRecordId(draft.id));
  await deleteSecureRecord(clientRecordId(draft.clientBroadcastId));
  contentKey.fill(0);
  localKeys.signing.privateKey.fill(0);
  localKeys.encryption.privateKey.fill(0);
  return result.broadcast;
}

export async function publishBroadcast(content: string, user: User) {
  await sodium.ready;
  const plaintext = utf8(content.trim());
  if (plaintext.length < 1 || plaintext.length > MAX_PLAINTEXT_BYTES) {
    throw new Error(
      `Broadcasts must contain 1–${MAX_PLAINTEXT_BYTES.toLocaleString()} UTF-8 bytes.`,
    );
  }

  const contentKey = sodium.randombytes_buf(32);
  const nonce = sodium.randombytes_buf(
    sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES,
  );
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintext,
    null,
    null,
    nonce,
    contentKey,
  );
  plaintext.fill(0);
  const state: LocalDraftSecretState = {
    clientBroadcastId: crypto.randomUUID(),
    contentKey: toBase64(contentKey),
    encryptedKeysByRecipientId: {},
    contentNonce: toBase64(nonce),
    contentCiphertext: toBase64(ciphertext),
  };
  await saveDraftState(state);

  const { draft } = await beseenApi.createBroadcastDraft(
    state.clientBroadcastId,
  );
  state.draftId = draft.id;
  await saveDraftState(state);
  await deleteSecureRecord(clientRecordId(state.clientBroadcastId));
  contentKey.fill(0);
  return processDraft(draft, user, state);
}

export async function resumeBroadcast(
  draft: BroadcastDraftListItem,
  user: User,
) {
  const state = await loadDraftState(draft);
  if (!state) {
    throw new Error(
      "The encrypted local secret for this draft is missing. Cancel it and create a new broadcast.",
    );
  }
  return processDraft(draft, user, state);
}

export async function cancelBroadcast(draft: BroadcastDraftListItem) {
  const result = await beseenApi.cancelBroadcastDraft(draft.id);
  await deleteSecureRecord(draftRecordId(draft.id));
  await deleteSecureRecord(clientRecordId(draft.clientBroadcastId));
  return result.draft;
}

export async function listBroadcastDrafts() {
  const items: BroadcastDraftListItem[] = [];
  let cursor: string | undefined;
  let hasMore = true;
  while (hasMore) {
    const result = await beseenApi.listBroadcastDrafts(cursor);
    items.push(...result.drafts.items);
    hasMore = result.drafts.hasMore;
    cursor = result.drafts.nextCursor ?? undefined;
  }
  return items;
}

export async function decryptVerifiedBroadcast(
  item: BroadcastFeedItem,
  user: User,
): Promise<string> {
  await sodium.ready;
  const localKeys = await loadLocalBeSeenKeys(user.walletAddress);
  if (!localKeys) throw new Error("LOCAL_KEYS_NOT_FOUND");
  if (
    item.manifest.signatureVersion !== 1 ||
    item.manifest.encryptionVersion !== 1 ||
    item.manifest.contentSuite !== CONTENT_SUITE ||
    item.manifest.keyWrapSuite !== KEY_WRAP_SUITE ||
    item.integrity.algorithm !== "Ed25519" ||
    item.viewerKey.keyVersion !== localKeys.derivationVersion
  ) {
    throw new Error("UNSUPPORTED_BROADCAST_PROTOCOL");
  }

  const signatureMessage = buildBroadcastSignatureMessage({
    broadcastId: item.id,
    clientBroadcastId: item.clientBroadcastId,
    creatorId: item.manifest.creatorId,
    creatorKeyVersion: item.manifest.creatorKeyVersion,
    encryptionVersion: item.manifest.encryptionVersion,
    contentCiphertext: item.manifest.contentCiphertext,
    contentNonce: item.manifest.contentNonce,
    creatorEncryptedBroadcastKey:
      item.manifest.creatorEncryptedBroadcastKey,
    audienceType: item.manifest.audienceType,
    audienceCount: item.manifest.audienceCount,
    recipientKeysDigest: item.manifest.recipientKeysDigest,
  });
  const signatureIsValid = sodium.crypto_sign_verify_detached(
    fromBase64(item.integrity.signature),
    utf8(signatureMessage),
    fromBase64(item.integrity.signingPublicKey),
  );
  if (!signatureIsValid) throw new Error("INVALID_BROADCAST_SIGNATURE");

  const contentKey = sodium.crypto_box_seal_open(
    fromBase64(item.viewerKey.encryptedBroadcastKey),
    localKeys.encryption.publicKey,
    localKeys.encryption.privateKey,
  );
  if (!contentKey || contentKey.length !== 32) {
    throw new Error("CANNOT_OPEN_VIEWER_KEY");
  }
  try {
    const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      fromBase64(item.manifest.contentCiphertext),
      null,
      fromBase64(item.manifest.contentNonce),
      contentKey,
    );
    return new TextDecoder("utf-8", { fatal: true }).decode(plaintext);
  } finally {
    contentKey.fill(0);
    localKeys.signing.privateKey.fill(0);
    localKeys.encryption.privateKey.fill(0);
  }
}

export async function decryptFeed(
  feed: BroadcastFeedPage,
  user: User,
): Promise<DecryptedBroadcast[]> {
  return Promise.all(
    feed.items.map(async (item): Promise<DecryptedBroadcast> => {
      try {
        return {
          id: item.id,
          clientBroadcastId: item.clientBroadcastId,
          creator: item.creator,
          content: await decryptVerifiedBroadcast(item, user),
          audienceCount: item.manifest.audienceCount,
          publishedAt: item.publishedAt,
          source: item.viewerKey.source,
          integrity: "verified",
        };
      } catch {
        return {
          id: item.id,
          clientBroadcastId: item.clientBroadcastId,
          creator: item.creator,
          content: null,
          audienceCount: item.manifest.audienceCount,
          publishedAt: item.publishedAt,
          source: item.viewerKey.source,
          integrity: "failed",
        };
      }
    }),
  );
}

export async function getDecryptedFeed(
  view: "received" | "sent",
  user: User,
  cursor?: string,
  limit = 20,
) {
  const { feed } = await beseenApi.getBroadcastFeed(
    view,
    cursor,
    limit,
  );
  return { ...feed, items: await decryptFeed(feed, user) };
}
