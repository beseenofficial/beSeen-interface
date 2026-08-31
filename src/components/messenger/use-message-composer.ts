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
import { compareDecimalStrings, isCanonicalDecimal } from '@/lib/decimal';
import { invalidateData } from '@/lib/data-invalidation';
import type {
  DecryptedMessengerMessage,
  DerivedKeys,
  MessengerConversation,
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
  demoUsdcBalance: string | undefined;
  refreshCurrentUser: () => Promise<unknown>;
};

export type BountyDurationUnit = 'minute' | 'hour' | 'day';

const bountyDurationMultipliers: Record<BountyDurationUnit, number> = {
  minute: 60,
  hour: 3600,
  day: 86400,
};

export function useMessageComposer({
  activeConversationId,
  keys,
  setActiveConversationId,
  setConversations,
  setMessages,
  refreshHistory,
  refreshConversationList,
  toast,
  demoUsdcBalance,
  refreshCurrentUser,
}: UseMessageComposerOptions) {
  const [draft, setDraft] = useState('');
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

  const afterSuccessfulSend = useCallback(
    async (message: Awaited<ReturnType<typeof retryPendingMessengerMessage>>['message']) => {
      setHasPendingRetry(false);
      setSendError(null);
      setSendErrorCode(null);
      if (message.unlockedBounty) {
        setMessages((current) => applyUnlockedBounty(current, message.unlockedBounty!));
        toast('Reward unlocked', 'The other person can now collect this demo reward.');
      }
      if (message.bounty) {
        await refreshCurrentUser().catch(() => undefined);
      }
      if (activeConversationId) {
        invalidateData({ resource: 'conversations', conversationId: activeConversationId });
        await Promise.allSettled([
          refreshHistory(activeConversationId),
          refreshConversationList(),
        ]);
      }
    },
    [activeConversationId, refreshConversationList, refreshCurrentUser, refreshHistory, setMessages, toast],
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
    const bounty: MessengerBountyTerms | null = showBounty
      ? { assetCode: bountyAsset, amount: bountyAmount, durationSeconds: Number(bountyDuration) }
      : null;
    try {
      const result = await createAndSendMessengerMessage({
        conversationId: activeConversationId,
        plaintext: draft,
        keys,
        replyToMessageId: replyTarget?.id ?? null,
        bounty,
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
  const bountyError = showBounty || bountyPanelOpen
    ? !isCanonicalDecimal(bountyAmount, 7) || /^0(?:\.0+)?$/.test(bountyAmount)
      ? 'Enter a positive USDC amount with up to 7 decimal places.'
      : demoUsdcBalance === undefined
        ? 'Your demo USDC balance is still loading.'
        : compareDecimalStrings(bountyAmount, demoUsdcBalance) > 0
          ? 'Your demo USDC balance is not sufficient for this bounty.'
          : !/^[1-9]\d*$/.test(bountyDurationValue)
            ? 'Enter a positive whole number for the reply time.'
            : bountyDurationSeconds > 30 * 86400
              ? 'Reply time cannot be longer than 30 days.'
              : null
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
    demoUsdcBalance,
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
