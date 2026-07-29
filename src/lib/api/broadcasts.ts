import { apiRequest } from '@/lib/api/transport';
import type {
  BroadcastDraft,
  BroadcastDraftListItem,
  BroadcastFeedItem,
  BroadcastProgress,
  BroadcastRecipient,
  CursorPage,
  PublishedBroadcast,
} from '@/types';

export const broadcastApi = {
  async createDraft(clientBroadcastId: string): Promise<BroadcastDraft> {
    return (
      await apiRequest<{ draft: BroadcastDraft }>('/v1/broadcasts/drafts', {
        method: 'POST',
        auth: true,
        body: { clientBroadcastId: clientBroadcastId.toLowerCase() },
      })
    ).draft;
  },
  async recipients(
    draftId: string,
    cursor?: string,
    signal?: AbortSignal,
  ): Promise<CursorPage<BroadcastRecipient>> {
    const search = new URLSearchParams({ limit: '250' });
    if (cursor) search.set('cursor', cursor);
    return (
      await apiRequest<{ recipients: CursorPage<BroadcastRecipient> }>(
        `/v1/broadcasts/drafts/${encodeURIComponent(draftId)}/recipients?${search}`,
        { auth: true, signal },
      )
    ).recipients;
  },
  async uploadKeys(
    draftId: string,
    keys: Array<{ recipientId: string; encryptedBroadcastKey: string }>,
  ): Promise<BroadcastProgress> {
    return (
      await apiRequest<{ progress: BroadcastProgress }>(
        `/v1/broadcasts/drafts/${encodeURIComponent(draftId)}/recipient-keys`,
        { method: 'PUT', auth: true, body: { keys } },
      )
    ).progress;
  },
  async finalize(
    draftId: string,
    body: {
      contentCiphertext: string;
      contentNonce: string;
      creatorEncryptedBroadcastKey: string;
      signature: string;
    },
  ): Promise<PublishedBroadcast> {
    return (
      await apiRequest<{ broadcast: PublishedBroadcast }>(
        `/v1/broadcasts/drafts/${encodeURIComponent(draftId)}/finalize`,
        { method: 'POST', auth: true, body },
      )
    ).broadcast;
  },
  async drafts(cursor?: string, signal?: AbortSignal): Promise<CursorPage<BroadcastDraftListItem>> {
    const search = new URLSearchParams({ limit: '20' });
    if (cursor) search.set('cursor', cursor);
    return (
      await apiRequest<{ drafts: CursorPage<BroadcastDraftListItem> }>(
        `/v1/broadcasts/drafts?${search}`,
        { auth: true, signal },
      )
    ).drafts;
  },
  async cancel(draftId: string): Promise<void> {
    await apiRequest(`/v1/broadcasts/drafts/${encodeURIComponent(draftId)}`, {
      method: 'DELETE',
      auth: true,
    });
  },
  async feed(
    view: 'received' | 'sent',
    cursor?: string,
    signal?: AbortSignal,
  ): Promise<CursorPage<BroadcastFeedItem>> {
    const search = new URLSearchParams({ view, limit: '20' });
    if (cursor) search.set('cursor', cursor);
    return (
      await apiRequest<{ feed: CursorPage<BroadcastFeedItem> }>(`/v1/broadcasts/feed?${search}`, {
        auth: true,
        signal,
      })
    ).feed;
  },
};

