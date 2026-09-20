'use client';

import { AlertCircle, Check, CheckCheck, Reply } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageBounty } from '@/components/messenger/message-bounty';
import {
  MessageBubble,
  MessageBubbleAvatar,
} from '@/components/messenger/message-bubble';
import { messengerTimeLabel } from '@/components/messenger/messenger-view-utils';
import { cn } from '@/lib/utils';
import type { DecryptedMessengerMessage, MessengerBounty as MessengerBountyData } from '@/types';

export function MessengerMessage({
  message,
  reply,
  outgoing,
  groupStart,
  replyActionOpen,
  senderAvatar,
  senderUsername,
  onReply,
  onToggleReplyAction,
  onClaimExpiredBounty,
  reclaimError,
  reclaiming,
}: {
  message: DecryptedMessengerMessage;
  reply: DecryptedMessengerMessage | null;
  outgoing: boolean;
  groupStart: boolean;
  replyActionOpen: boolean;
  senderAvatar: string | null;
  senderUsername: string;
  onReply: (message: DecryptedMessengerMessage) => void;
  onToggleReplyAction: (messageId: string) => void;
  onClaimExpiredBounty: (bounty: MessengerBountyData) => Promise<void>;
  reclaimError: string | null;
  reclaiming: boolean;
}) {
  return (
    <motion.article
      className={cn(
        'group col-span-full flex w-full min-w-0 items-start gap-2',
        groupStart ? 'mt-2' : 'mt-1',
        outgoing ? 'justify-end' : 'justify-start',
      )}
      initial={{ opacity: 0, y: 8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <MessageBubbleAvatar
        avatar={senderAvatar}
        outgoing={outgoing}
        visible={groupStart}
        username={senderUsername}
      />
      <MessageBubble
        padding={message.bounty ? 'none' : 'default'}
        className={cn(
          'group/bubble cursor-pointer',
          message.bounty && 'min-w-[310px] max-w-[440px] overflow-visible bg-transparent shadow-[0_9px_22px_rgba(26,61,177,0.11)] max-sm:min-w-0 max-sm:w-[82%]',
          !message.bounty && 'max-sm:overflow-visible',
          outgoing && 'order-1',
        )}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('button')) return;
          if (window.matchMedia('(max-width: 640px)').matches) {
            event.stopPropagation();
            onToggleReplyAction(message.id);
          }
        }}
        tone={message.bounty || outgoing ? 'outgoing' : 'incoming'}
      >
        <button
          className={cn(
            'absolute -top-3 z-20 hidden h-7 cursor-pointer items-center gap-1 rounded-full border border-border bg-white px-2.5 text-[10px] font-semibold text-brand opacity-0 shadow-[0_5px_16px_rgba(11,11,63,0.12)] transition duration-150 group-hover/bubble:opacity-100 focus:opacity-100 min-[641px]:inline-flex',
            outgoing ? 'left-3' : 'right-3',
          )}
          onClick={(event) => {
            event.stopPropagation();
            onReply(message);
          }}
          aria-label="Reply to message"
          type="button"
        >
          <Reply size={12} strokeWidth={1.9} /> Reply
        </button>
        <AnimatePresence>
          {replyActionOpen && (
            <motion.button
              className={cn(
                'absolute -top-3 z-20 inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border border-border/80 bg-white px-2.5 text-[10px] font-semibold text-brand shadow-[0_5px_16px_rgba(11,11,63,0.12)] min-[641px]:hidden',
                outgoing ? 'left-3' : 'right-3',
              )}
              initial={{ opacity: 0, y: 4, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 2, scale: 0.96 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              onClick={(event) => {
                event.stopPropagation();
                onReply(message);
                onToggleReplyAction(message.id);
              }}
              aria-label="Reply to message"
              type="button"
            >
              <Reply size={12} strokeWidth={1.9} /> Reply
            </motion.button>
          )}
        </AnimatePresence>
        <div className={message.bounty ? 'rounded-t-[18px] bg-[#2148F3] px-[18px] pb-3 pt-3.5 text-white max-sm:px-4 max-sm:pb-2.5 max-sm:pt-3' : undefined}>
          {message.manifest.replyToMessageId && (
            <div
              className={cn(
                'mb-2 rounded-xl border px-3 py-1.5 text-xs',
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
            <p className="font-message max-w-full whitespace-pre-wrap break-words text-[14px] leading-[1.4] [overflow-wrap:anywhere]">
              {message.plaintext}
              <span className="inline-block w-20" aria-hidden="true" />
            </p>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted">
              <AlertCircle size={16} /> This message is unavailable
              <span className="inline-block w-20" aria-hidden="true" />
            </p>
          )}
          {message.bounty && (
            <div className="mt-1.5 flex items-center justify-end gap-1 text-[11px] leading-none text-white/85">
              <time>{messengerTimeLabel(message.createdAt)}</time>
              {outgoing && (message.delivery.seenByRecipient ? <CheckCheck size={13} aria-label="Seen" /> : <Check size={13} aria-label="Sent" />)}
            </div>
          )}
        </div>
        {message.bounty && (
          <MessageBounty
            bounty={message.bounty}
            canClaimExpired={outgoing}
            outgoing={outgoing}
            reclaimError={reclaimError}
            reclaiming={reclaiming}
            onClaimExpired={() => onClaimExpiredBounty(message.bounty!)}
          />
        )}
        <div
          className={cn(
            'flex items-center justify-end gap-1.5 text-[11px] leading-none text-[#080B0D]',
            'absolute bottom-[11px] right-[20px]',
            message.bounty && 'hidden',
            outgoing && 'text-white',
          )}
        >
          <time>{messengerTimeLabel(message.createdAt)}</time>
          {outgoing &&
            (message.delivery.seenByRecipient ? (
              <CheckCheck size={14} aria-label="Seen" />
            ) : (
              <Check size={14} aria-label="Sent" />
            ))}
        </div>
      </MessageBubble>
    </motion.article>
  );
}
