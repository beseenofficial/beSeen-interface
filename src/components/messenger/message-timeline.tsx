'use client';

import {
  AlertCircle,
  ArrowDown,
  LoaderCircle,
  MessageCircleMore,
  Radio,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { conversationBackgroundClassName } from '@/components/messenger/conversation-surface';
import { MessageDay, messageDayKey } from '@/components/messenger/message-day';
import { MessageBubble } from '@/components/messenger/message-bubble';
import { MessengerMessage } from '@/components/messenger/messenger-message';
import { messengerTimeLabel } from '@/components/messenger/messenger-view-utils';
import { UnreadMarker } from '@/components/messenger/unread-marker';
import { cn } from '@/lib/utils';
import type { MessengerWorkspaceState } from '@/components/messenger/use-messenger-workspace';

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

  const timeline = useRef<HTMLElement>(null);
  const [showLatestButton, setShowLatestButton] = useState(false);

  const updateLatestButton = useCallback(() => {
    const element = timeline.current;
    if (!element) return;
    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    setShowLatestButton(distanceFromBottom > 120);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(updateLatestButton);
    return () => cancelAnimationFrame(frame);
  }, [historyLoading, timelineItems.length, updateLatestButton]);

  const scrollToLatest = () => {
    messageEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  return (
    <main
      ref={timeline}
      className={cn(
        conversationBackgroundClassName,
        'min-h-0 min-w-0 max-w-full overflow-x-hidden overflow-y-auto px-6 py-5 max-sm:bg-white max-sm:bg-none max-sm:px-4 max-sm:py-4 max-sm:before:hidden',
      )}
      onScroll={updateLatestButton}
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
        <div className="grid w-full min-w-0 grid-cols-1 gap-0">
          {timelineItems.map((item, index) => {
            const showDay =
              index === 0 ||
              messageDayKey(item.createdAt) !==
                messageDayKey(timelineItems[index - 1].createdAt);
            if (item.kind === 'broadcast') {
              const broadcast = item.broadcast;
              return (
                <div className="contents" key={`broadcast-${broadcast.id}`}>
                  {showDay && <MessageDay value={item.createdAt} />}
                  <motion.article
                    className="mt-2 flex w-full min-w-0 justify-start"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    <MessageBubble
                      padding="none"
                      shadow="soft"
                      tone="broadcast"
                    >
                      <div className="flex min-w-0 items-center gap-2.5 border-b border-brand/12 bg-[#EDF1FF] px-4 py-3">
                        <span className="grid size-8 place-items-center rounded-full bg-brand text-white shadow-[0_4px_12px_rgba(16,69,245,0.22)]">
                          <Radio size={15} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <strong className="block text-xs font-semibold text-brand">Broadcast</strong>
                          <span className="block text-[10px] text-secondary">
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
                      <div className="bg-white/65 px-4 py-3.5">
                        {broadcast.state === 'decrypted' ? (
                          <p className="font-message max-w-full whitespace-pre-wrap break-words text-[15px] leading-6 [overflow-wrap:anywhere]">
                            {broadcast.content}
                          </p>
                        ) : (
                          <p className="flex items-center gap-2 text-sm text-muted">
                            <AlertCircle size={16} /> This broadcast is
                            unavailable
                          </p>
                        )}
                      </div>
                    </MessageBubble>
                  </motion.article>
                </div>
              );
            }
            const message = item.message;
            const previousItem = index > 0 ? timelineItems[index - 1] : null;
            const previousMessage =
              previousItem?.kind === 'message' ? previousItem.message : null;
            const elapsedSincePrevious = previousItem
              ? new Date(item.createdAt).getTime() -
                new Date(previousItem.createdAt).getTime()
              : Number.POSITIVE_INFINITY;
            const groupStart =
              showDay ||
              !previousMessage ||
              previousMessage.manifest.senderId !== message.manifest.senderId ||
              elapsedSincePrevious >= 60 * 60 * 1000;
            const reply = message.manifest.replyToMessageId
              ? (messages.find(
                  (candidate) =>
                    candidate.id === message.manifest.replyToMessageId,
                ) ?? null)
              : null;
            return (
              <div className="contents" key={message.id}>
                {showDay && <MessageDay value={item.createdAt} />}
                {message.id === unreadMessageId && unreadMarker && (
                  <UnreadMarker count={unreadMarker.count} />
                )}
                <MessengerMessage
                  message={message}
                  reply={reply}
                  outgoing={message.manifest.senderId === user.id}
                  beneficiary={message.manifest.recipientId === user.id}
                  claimingBountyId={claimingBountyId}
                  groupStart={groupStart}
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
      <div className="pointer-events-none h-0">
        <AnimatePresence>
          {showLatestButton && (
            <motion.button
              className="pointer-events-auto fixed bottom-24 right-4 z-30 grid size-11 cursor-pointer place-items-center rounded-full border border-white/70 bg-brand text-white shadow-[0_8px_24px_rgba(16,69,245,0.3)] transition hover:bg-[#0c3bd6] max-sm:bottom-20 max-sm:right-3"
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onClick={scrollToLatest}
              aria-label="Jump to latest message"
              type="button"
            >
              <ArrowDown size={20} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
