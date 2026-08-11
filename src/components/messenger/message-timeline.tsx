'use client';

import {
  AlertCircle,
  Check,
  CheckCheck,
  LoaderCircle,
  MessageCircleMore,
  Radio,
  Reply,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MessageBounty } from '@/components/messenger/message-bounty';
import { conversationBackgroundClassName } from '@/components/messenger/conversation-surface';
import {
  MessageBubble,
  MessageBubbleAvatar,
} from '@/components/messenger/message-bubble';
import { messengerTimeLabel } from '@/components/messenger/messenger-view-utils';
import { cn } from '@/lib/utils';
import type { MessengerWorkspaceState } from '@/components/messenger/use-messenger-workspace';
import type { DecryptedMessengerMessage } from '@/types';

function UnreadMarker({ count }: { count: number }) {
  return (
    <motion.div
      className="flex w-full items-center gap-3 py-1"
      initial={{ opacity: 0, scaleX: 0.94 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.28 }}
      role="separator"
      aria-label={`${count} unread ${count === 1 ? 'message' : 'messages'}`}
    >
      <span className="h-px min-w-0 flex-1 bg-brand/35" />
      <span className="shrink-0 text-[11px] font-semibold text-brand">
        {count} unread {count === 1 ? 'message' : 'messages'}
      </span>
      <span className="h-px min-w-0 flex-1 bg-brand/35" />
    </motion.div>
  );
}

function MessengerMessage({
  message,
  reply,
  outgoing,
  beneficiary,
  claimingBountyId,
  senderAvatar,
  senderUsername,
  onReply,
  onClaim,
}: {
  message: DecryptedMessengerMessage;
  reply: DecryptedMessengerMessage | null;
  outgoing: boolean;
  beneficiary: boolean;
  claimingBountyId: string | null;
  senderAvatar: string | null;
  senderUsername: string;
  onReply: (message: DecryptedMessengerMessage) => void;
  onClaim: MessengerWorkspaceState['claimBounty'];
}) {
  return (
    <motion.article
      className={cn(
        'group col-span-full flex w-full min-w-0 items-start gap-3',
        outgoing ? 'justify-end min-[1440px]:justify-start' : 'justify-start',
      )}
      initial={{ opacity: 0, y: 8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <MessageBubbleAvatar
        avatar={senderAvatar}
        outgoing={outgoing}
        username={senderUsername}
      />
      <MessageBubble tone={outgoing ? 'outgoing' : 'incoming'}>
        {message.manifest.replyToMessageId && (
          <div
            className={cn(
              'mb-2 rounded-xl border-l-2 px-3 py-2 text-xs',
              outgoing
                ? 'border-brand/60 bg-white/65 text-secondary'
                : 'border-brand bg-info-bg text-secondary',
            )}
          >
            <span className="block font-semibold">Reply</span>
            <span className="mt-0.5 block truncate">
              {reply?.state === 'decrypted'
                ? reply.plaintext
                : 'Earlier message'}
            </span>
          </div>
        )}
        {message.state === 'decrypted' ? (
          <p className="max-w-full whitespace-pre-wrap break-words text-[15px] leading-6 [overflow-wrap:anywhere]">
            {message.plaintext}
          </p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted">
            <AlertCircle size={16} /> Unable to decrypt this message
          </p>
        )}
        {message.bounty && (
          <MessageBounty
            bounty={message.bounty}
            beneficiary={beneficiary}
            claiming={claimingBountyId === message.bounty.id}
            onClaim={(bounty) => void onClaim(bounty)}
          />
        )}
        <div className="mt-2 flex items-center justify-end gap-2 text-[10px] text-muted">
          <button
            className="mr-auto inline-flex cursor-pointer items-center gap-1 text-brand opacity-0 transition group-hover:opacity-100 focus:opacity-100"
            onClick={() => onReply(message)}
            type="button"
          >
            <Reply size={13} /> Reply
          </button>
          <time>{messengerTimeLabel(message.createdAt)}</time>
          {outgoing && (
            <span>{message.delivery.seenByRecipient ? 'Seen' : 'Sent'}</span>
          )}
          {outgoing &&
            (message.delivery.seenByRecipient ? (
              <CheckCheck size={15} aria-label="Seen" />
            ) : (
              <Check size={15} aria-label="Sent" />
            ))}
        </div>
      </MessageBubble>
    </motion.article>
  );
}

export function MessageTimeline({
  workspace,
}: {
  workspace: MessengerWorkspaceState;
}) {
  const {
    claimingBountyId,
    hasMoreMessages,
    historyError,
    historyLoading,
    loadingOlder,
    messageEnd,
    messages,
    otherParticipant,
    timelineItems,
    unreadMarker,
    unreadMessageId,
    user,
    claimBounty,
    loadOlderMessages,
    setReplyTarget,
  } = workspace;

  return (
    <main
      className={cn(
        conversationBackgroundClassName,
        'min-h-0 min-w-0 max-w-full overflow-x-hidden overflow-y-auto px-6 py-5 max-sm:px-3',
      )}
      aria-live="polite"
    >
      {hasMoreMessages && (
        <div className="mb-5 text-center">
          <Button
            loading={loadingOlder}
            onClick={() => void loadOlderMessages()}
            variant="tertiary"
          >
            Load earlier messages
          </Button>
        </div>
      )}
      {historyLoading ? (
        <div
          className="grid min-h-64 place-items-center text-secondary"
          role="status"
        >
          <div className="text-center">
            <LoaderCircle className="mx-auto animate-spin" size={26} />
            <p className="mt-3 text-sm">Loading messages…</p>
          </div>
        </div>
      ) : historyError && messages.length === 0 ? (
        <div
          className="mx-auto mt-12 max-w-md rounded-2xl border border-error/20 bg-error-bg p-5 text-center text-sm text-error"
          role="alert"
        >
          <AlertCircle className="mx-auto" />
          <p className="mt-2">{historyError}</p>
        </div>
      ) : timelineItems.length === 0 ? (
        <div className="grid min-h-64 place-items-center text-center text-secondary">
          <div>
            <MessageCircleMore className="mx-auto text-brand" size={28} />
            <h2 className="mt-3 text-base font-semibold text-navy">
              Say hello
            </h2>
            <p className="mt-1 text-xs">
              Start a conversation with @
              {otherParticipant?.username ?? 'this creator'}.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid w-full min-w-0 grid-cols-1 gap-3">
          {timelineItems.map((item) => {
            if (item.kind === 'broadcast') {
              const broadcast = item.broadcast;
              return (
                <motion.article
                  className="flex w-full min-w-0 justify-start"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  key={`broadcast-${broadcast.id}`}
                >
                  <MessageBubble padding="none" shadow="soft" tone="broadcast">
                    <div className="flex min-w-0 items-center gap-2 border-b border-lilac bg-white px-4 py-3">
                      <span className="grid size-8 place-items-center rounded-full bg-brand text-white">
                        <Radio size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <strong className="block text-xs">Broadcast</strong>
                        <span className="block text-[10px] text-muted">
                          Shared with followers
                        </span>
                      </div>
                      <time
                        className="text-[10px] text-muted"
                        dateTime={broadcast.publishedAt}
                      >
                        {messengerTimeLabel(broadcast.publishedAt)}
                      </time>
                    </div>
                    <div className="px-4 py-3.5">
                      {broadcast.state === 'decrypted' ? (
                        <p className="max-w-full whitespace-pre-wrap break-words text-[15px] leading-6 [overflow-wrap:anywhere]">
                          {broadcast.content}
                        </p>
                      ) : (
                        <p className="flex items-center gap-2 text-sm text-muted">
                          <AlertCircle size={16} /> Unable to decrypt this
                          broadcast
                        </p>
                      )}
                    </div>
                  </MessageBubble>
                </motion.article>
              );
            }
            const message = item.message;
            const reply = message.manifest.replyToMessageId
              ? (messages.find(
                  (candidate) =>
                    candidate.id === message.manifest.replyToMessageId,
                ) ?? null)
              : null;
            return (
              <div className="contents" key={message.id}>
                {message.id === unreadMessageId && unreadMarker && (
                  <UnreadMarker count={unreadMarker.count} />
                )}
                <MessengerMessage
                  message={message}
                  reply={reply}
                  outgoing={message.manifest.senderId === user.id}
                  beneficiary={message.manifest.recipientId === user.id}
                  claimingBountyId={claimingBountyId}
                  senderAvatar={
                    message.manifest.senderId === user.id
                      ? user.avatar
                      : (otherParticipant?.avatar ?? null)
                  }
                  senderUsername={
                    message.manifest.senderId === user.id
                      ? user.username
                      : (otherParticipant?.username ?? 'Creator')
                  }
                  onReply={setReplyTarget}
                  onClaim={claimBounty}
                />
              </div>
            );
          })}
          <div ref={messageEnd} />
        </div>
      )}
    </main>
  );
}
