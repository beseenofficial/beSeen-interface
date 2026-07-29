import { broadcastApi } from '@/lib/api';
import {
  draftManifestFields,
  encryptBroadcastContent,
  recipientKeysDigest,
  signBroadcastManifest,
  wrapContentKey,
} from '@/lib/broadcast-crypto';
import { base64ToBytes, bytesToBase64 } from '@/lib/encoding';
import { deleteSecureRecord, getSecureJson, setSecureJson } from '@/lib/secure-storage';
import type {
  BroadcastDraft,
  BroadcastDraftListItem,
  BroadcastRecipient,
  DerivedKeys,
  PublishedBroadcast,
  User,
} from '@/types';

type StoredDraftCrypto = {
  draftId: string;
  clientBroadcastId: string;
  contentCiphertext: string;
  contentNonce: string;
  creatorEncryptedBroadcastKey: string;
  contentKey: string;
  recipientKeys: Record<string, string>;
};

const draftRecord = (draftId: string) => `broadcast-draft:${draftId.toLowerCase()}`;
const attemptRecord = (userId: string) => `broadcast-compose-attempt:${userId.toLowerCase()}`;

async function composeAttemptId(userId: string): Promise<string> {
  const existing = await getSecureJson<{ clientBroadcastId: string }>(attemptRecord(userId));
  if (existing?.clientBroadcastId) return existing.clientBroadcastId;
  const clientBroadcastId = crypto.randomUUID().toLowerCase();
  await setSecureJson(attemptRecord(userId), { clientBroadcastId });
  return clientBroadcastId;
}

export async function loadAllRecipients(draft: BroadcastDraft): Promise<BroadcastRecipient[]> {
  const all = [...draft.recipients.items];
  let page = draft.recipients;
  while (page.hasMore) {
    if (!page.nextCursor) throw new Error('The recipient cursor is missing.');
    page = await broadcastApi.recipients(draft.id, page.nextCursor);
    all.push(...page.items);
  }
  if (all.length !== draft.audience.count) {
    throw new Error('The frozen audience does not match the draft.');
  }
  return all;
}

async function continueDraft(
  draft: BroadcastDraft,
  state: StoredDraftCrypto,
  user: User,
  keys: DerivedKeys,
): Promise<PublishedBroadcast> {
  const contentKey = base64ToBytes(state.contentKey, 32);
  try {
    const recipients = await loadAllRecipients(draft);
    const resolved: Array<BroadcastRecipient & { encryptedBroadcastKey: string }> = [];
    const pending: Array<{ recipientId: string; encryptedBroadcastKey: string }> = [];

    for (const recipient of recipients) {
      let wrapped: string;
      if (recipient.keyUploaded) {
        if (!recipient.encryptedBroadcastKey) throw new Error('An uploaded recipient key is missing.');
        wrapped = recipient.encryptedBroadcastKey;
      } else {
        wrapped = state.recipientKeys[recipient.userId];
        if (!wrapped) {
          wrapped = await wrapContentKey(contentKey, recipient.encryptionPublicKey);
          state.recipientKeys[recipient.userId] = wrapped;
          await setSecureJson(draftRecord(draft.id), state);
        }
        pending.push({ recipientId: recipient.userId, encryptedBroadcastKey: wrapped });
      }
      resolved.push({ ...recipient, encryptedBroadcastKey: wrapped });
    }

    let uploadComplete = pending.length === 0 ? draft.audience.count === 0 || draft.progress.complete : false;
    for (let offset = 0; offset < pending.length; offset += 250) {
      const progress = await broadcastApi.uploadKeys(draft.id, pending.slice(offset, offset + 250));
      uploadComplete = progress.complete;
    }
    if (!uploadComplete && draft.audience.count > 0) {
      throw new Error('Recipient key upload did not complete.');
    }

    const digest = await recipientKeysDigest(resolved);
    const fields = draftManifestFields(
      draft,
      user.id,
      state,
      state.creatorEncryptedBroadcastKey,
      digest,
    );
    const signature = await signBroadcastManifest(fields, keys);
    const published = await broadcastApi.finalize(draft.id, {
      contentCiphertext: state.contentCiphertext,
      contentNonce: state.contentNonce,
      creatorEncryptedBroadcastKey: state.creatorEncryptedBroadcastKey,
      signature,
    });
    await Promise.all([
      deleteSecureRecord(draftRecord(draft.id)),
      deleteSecureRecord(attemptRecord(user.id)),
    ]);
    return published;
  } finally {
    contentKey.fill(0);
  }
}

export async function publishEncryptedBroadcast(
  plaintext: string,
  user: User,
  keys: DerivedKeys,
): Promise<PublishedBroadcast> {
  const clientBroadcastId = await composeAttemptId(user.id);
  const draft = await broadcastApi.createDraft(clientBroadcastId);
  const existing = await getSecureJson<StoredDraftCrypto>(draftRecord(draft.id));
  if (existing?.clientBroadcastId === draft.clientBroadcastId) {
    return continueDraft(draft, existing, user, keys);
  }
  const encrypted = await encryptBroadcastContent(plaintext);
  try {
    const creatorEncryptedBroadcastKey = await wrapContentKey(
      encrypted.contentKey,
      draft.creatorKey.encryptionPublicKey,
    );
    const state: StoredDraftCrypto = {
      draftId: draft.id,
      clientBroadcastId,
      contentCiphertext: encrypted.contentCiphertext,
      contentNonce: encrypted.contentNonce,
      creatorEncryptedBroadcastKey,
      contentKey: bytesToBase64(encrypted.contentKey),
      recipientKeys: {},
    };
    await setSecureJson(draftRecord(draft.id), state);
    return await continueDraft(draft, state, user, keys);
  } finally {
    encrypted.contentKey.fill(0);
  }
}

async function allDrafts(): Promise<BroadcastDraftListItem[]> {
  const items: BroadcastDraftListItem[] = [];
  let cursor: string | undefined;
  do {
    const page = await broadcastApi.drafts(cursor);
    items.push(...page.items);
    if (!page.hasMore) break;
    if (!page.nextCursor) throw new Error('The draft cursor is missing.');
    cursor = page.nextCursor;
  } while (cursor);
  return items;
}

export async function resumeOrCancelDrafts(user: User, keys: DerivedKeys): Promise<number> {
  let resumed = 0;
  for (const summary of await allDrafts()) {
    const state = await getSecureJson<StoredDraftCrypto>(draftRecord(summary.id));
    if (!state || state.clientBroadcastId !== summary.clientBroadcastId) {
      await broadcastApi.cancel(summary.id);
      await deleteSecureRecord(draftRecord(summary.id));
      continue;
    }
    const recipients = await broadcastApi.recipients(summary.id);
    const draft: BroadcastDraft = { ...summary, recipients };
    await continueDraft(draft, state, user, keys);
    resumed += 1;
  }
  return resumed;
}
