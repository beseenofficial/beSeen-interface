'use client';

import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type SetStateAction,
} from 'react';
import { messengerError } from '@/components/messenger/messenger-view-utils';
import { ApiError } from '@/lib/api';
import { MAX_MESSENGER_BYTES } from '@/lib/messenger-crypto';
import { applyUnlockedBounty } from '@/lib/messenger-state';
import {
  createAndSendMessengerMessage,
  discardPendingMessengerAttempt,
  loadPendingMessengerAttempt,
  retryPendingMessengerMessage,
} from '@/lib/messenger-workflow';
import { utf8 } from '@/lib/encoding';
import { isCanonicalDecimal } from '@/lib/decimal';
import { invalidateData } from '@/lib/data-invalidation';
import type {
  DecryptedMessengerMessage,
  DerivedKeys,
  MessengerConversation,
  MessengerBountyLockTerms,
  MessengerBountyTerms,
} from '@/types';

type UseMessageComposerOptions = {
  activeConversationId: string | null;
  keys: DerivedKeys;
  setActiveConversationId: Dispatch<SetStateAction<string | null>>;
  setConversations: Dispatch<SetStateAction<MessengerConversation[]>>;
  setMessages: Dispatch<SetStateAction<DecryptedMessengerMessage[]>>;
  refreshHistory: (conversationId: string) => Promise<void>;
  refreshConversationList: () => Promise<void>;
  toast: (title: string, message?: string) => void;
  /**
   * Locks the bounty on-chain via the sender's wallet and resolves to the
   * contract-generated bounty ID (decimal string). A rejection or failure must
   * abort the send — the message is never silently downgraded to bounty-less.
   */
  lockBounty: (bounty: MessengerBountyLockTerms) => Promise<string>;
  /** Username of the conversation partner, used to link back to their profile. */
  otherParticipantUsername?: string | null;
};

export type BountyDurationUnit = 'minute' | 'hour' | 'day';

export const bountyDurationMultipliers: Record<BountyDurationUnit, number> = {
  minute: 60,
  hour: 3600,
  day: 86400,
};

// Bounty funding is verified on-chain by the contract during lock_bounty;
// the client only validates the shape of the form, never a local balance.
export function validateBountyTerms({
  amount,
  durationUnit,
  durationValue,
}: {
  amount: string;
  durationUnit: BountyDurationUnit;
  durationValue: string;
}) {
  if (!isCanonicalDecimal(amount, 7) || /^0(?:\.0+)?$/.test(amount)) {
    return 'Enter a positive amount with up to 7 decimal places.';
  }
  if (!/^[1-9]\d*$/.test(durationValue)) return 'Enter a whole number greater than zero.';
  const durationSeconds = Number(durationValue) * bountyDurationMultipliers[durationUnit];
  if (durationSeconds > 30 * 86400) return 'Choose a reply window of 30 days or less.';
  return null;
}

export function useMessageComposer({
  activeConversationId,
  keys,
  setActiveConversationId,
  setConversations,
  setMessages,
  refreshHistory,
  refreshConversationList,
  toast,
  lockBounty,
  otherParticipantUsername,
}: UseMessageComposerOptions) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendErrorCode, setSendErrorCode] = useState<string | null>(null);
  const [hasPendingRetry, setHasPendingRetry] = useState(false);
  const [replyTarget, setReplyTarget] = useState<DecryptedMessengerMessage | null>(null);
  const [showBounty, setShowBounty] = useState(false);
  const [bountyPanelOpen, setBountyPanelOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [bountyAsset, setBountyAsset] = useState<'USDC'>('USDC');
  const [bountyAmount, setBountyAmount] = useState('10');
  const [bountyDurationValue, setBountyDurationValue] = useState('1');
  const [bountyDurationUnit, setBountyDurationUnit] = useState<BountyDurationUnit>('hour');
  const messageInput = useRef<HTMLTextAreaElement>(null);
  const draft = activeConversationId ? drafts[activeConversationId] ?? '' : '';
  const setDraft: Dispatch<SetStateAction<string>> = useCallback((nextDraft) => {
    if (!activeConversationId) return;
    setDrafts((current) => {
      const currentDraft = current[activeConversationId] ?? '';
      const resolved = typeof nextDraft === 'function' ? nextDraft(currentDraft) : nextDraft;
      if (resolved === currentDraft) return current;
      if (!resolved) {
        const next = { ...current };
        delete next[activeConversationId];
        return next;
      }
      return { ...current, [activeConversationId]: resolved };
    });
  }, [activeConversationId]);

  const afterSuccessfulSend = useCallback(
    async (message: Awaited<ReturnType<typeof retryPendingMessengerMessage>>['message']) => {
      setHasPendingRetry(false);
      setSendError(null);
      setSendErrorCode(null);
      if (message.unlockedBounty) {
        setMessages((current) => applyUnlockedBounty(current, message.unlockedBounty!));
        toast('Reply received', 'The bounty settlement is now queued on-chain.');
      }
      if (activeConversationId) {
        invalidateData({ resource: 'conversations', conversationId: activeConversationId });
        await Promise.allSettled([
          refreshHistory(activeConversationId),
          refreshConversationList(),
        ]);
      }
    },
    [activeConversationId, refreshConversationList, refreshHistory, setMessages, toast],
  );

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!activeConversationId || sending || hasPendingRetry || !draft.trim()) return;
    setSendError(null);
    setSendErrorCode(null);
    if (showBounty && bountyError) {
      setSendError(bountyError);
      return;
    }
    setSending(true);
    const bountyDraft: MessengerBountyLockTerms | null = showBounty
      ? { assetCode: bountyAsset, amount: bountyAmount, durationSeconds: Number(bountyDuration) }
      : null;
    try {
      // The idempotency key is final before anything leaves this device.
      const clientMessageId = crypto.randomUUID().toLowerCase();
      // Lock the bounty on-chain first; only the contract-generated ID makes
      // the message bounty-backed, and it must be inside the signed manifest.
      // A failed, rejected, or ID-less lock aborts before any manifest is
      // signed or sent, and the draft stays intact for a retry.
      const lockedBounty: MessengerBountyTerms | null = bountyDraft
        ? { ...bountyDraft, contractBountyId: await lockBounty(bountyDraft) }
        : null;
      const result = await createAndSendMessengerMessage({
        conversationId: activeConversationId,
        plaintext: draft,
        keys,
        clientMessageId,
        replyToMessageId: replyTarget?.id ?? null,
        bounty: lockedBounty,
      });
      setDraft('');
      if (messageInput.current) messageInput.current.style.height = 'auto';
      setReplyTarget(null);
      setShowBounty(false);
      setBountyPanelOpen(false);
      requestAnimationFrame(() => messageInput.current?.focus());
      await afterSuccessfulSend(result.message);
    } catch (cause) {
      if (cause instanceof ApiError && (cause.code === 'CONVERSATION_NOT_FOUND' || cause.status === 404)) {
        setConversations((current) => current.filter((item) => item.id !== activeConversationId));
        setActiveConversationId(null);
        toast('Conversation unavailable', 'It was removed from Messenger.');
        return;
      }
      const pending = await loadPendingMessengerAttempt(activeConversationId);
      setHasPendingRetry(Boolean(pending));
      if (pending) setDraft('');
      setSendError(messengerError(cause));
      setSendErrorCode(cause instanceof ApiError ? cause.code : 'NETWORK_UNKNOWN');
      // Contract access was denied: the relationship record may still exist,
      // but the on-chain Aura no longer does. Refresh the related views so the
      // profile, price, and conversation state reflect that.
      if (cause instanceof ApiError && cause.code === 'CONTRACT_MESSAGE_ACCESS_DENIED') {
        invalidateData({ resource: 'conversations', conversationId: activeConversationId });
        if (otherParticipantUsername) {
          invalidateData({ resource: 'public-profile', username: otherParticipantUsername });
          invalidateData({ resource: 'follow-counts', username: otherParticipantUsername });
        }
      }
    } finally {
      setSending(false);
    }
  }

  function handleMessageKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    if (window.matchMedia('(max-width: 640px)').matches) return;
    event.preventDefault();
    if (sending || hasPendingRetry || !draft.trim() || draftBytes > MAX_MESSENGER_BYTES) return;
    event.currentTarget.form?.requestSubmit();
  }

  function insertEmoji(emoji: string) {
    setDraft((current) => `${current}${emoji}`);
    setShowEmojiPicker(false);
    requestAnimationFrame(() => messageInput.current?.focus());
  }

  async function retrySend() {
    if (!activeConversationId || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const result = await retryPendingMessengerMessage(activeConversationId);
      await afterSuccessfulSend(result.message);
    } catch (cause) {
      setSendError(messengerError(cause));
      setSendErrorCode(cause instanceof ApiError ? cause.code : 'NETWORK_UNKNOWN');
    } finally {
      setSending(false);
    }
  }

  async function discardRetry() {
    if (!activeConversationId) return;
    await discardPendingMessengerAttempt(activeConversationId);
    setHasPendingRetry(false);
    setSendError(null);
    setSendErrorCode(null);
  }

  const draftBytes = utf8(draft).length;
  const bountyDurationSeconds = Number(bountyDurationValue) * bountyDurationMultipliers[bountyDurationUnit];
  const bountyDuration = String(bountyDurationSeconds);
  const bountyError = showBounty
    ? validateBountyTerms({
        amount: bountyAmount,
        durationUnit: bountyDurationUnit,
        durationValue: bountyDurationValue,
      })
    : null;

  return {
    draft,
    sending,
    sendError,
    sendErrorCode,
    hasPendingRetry,
    replyTarget,
    showBounty,
    bountyPanelOpen,
    showEmojiPicker,
    bountyAsset,
    bountyAmount,
    bountyDuration,
    bountyDurationValue,
    bountyDurationUnit,
    bountyError,
    messageInput,
    draftBytes,
    setDraft,
    setHasPendingRetry,
    setReplyTarget,
    setShowBounty,
    setBountyPanelOpen,
    setShowEmojiPicker,
    setBountyAsset: (asset: string) => {
      if (asset === 'USDC') setBountyAsset(asset);
    },
    setBountyAmount,
    setBountyDurationValue: (value: string) => setBountyDurationValue(value.replace(/\D/g, '')),
    setBountyDurationUnit,
    setBountyDuration: (seconds: string) => {
      const duration = Number(seconds);
      if (!Number.isFinite(duration) || duration <= 0) return;
      if (duration % 86400 === 0) {
        setBountyDurationValue(String(duration / 86400));
        setBountyDurationUnit('day');
      } else if (duration % 3600 === 0) {
        setBountyDurationValue(String(duration / 3600));
        setBountyDurationUnit('hour');
      } else {
        setBountyDurationValue(String(Math.max(1, Math.round(duration / 60))));
        setBountyDurationUnit('minute');
      }
    },
    setSendError,
    sendMessage,
    handleMessageKeyDown,
    insertEmoji,
    retrySend,
    discardRetry,
  };
}
