'use client';

import { AlertCircle, Check, CircleCheck, Reply } from 'lucide-react';
import { motion } from 'framer-motion';
import { MessageBounty } from '@/components/messenger/message-bounty';
import {
  MessageBubble,
  MessageBubbleAvatar,
} from '@/components/messenger/message-bubble';
import { messengerTimeLabel } from '@/components/messenger/messenger-view-utils';
import type { MessengerWorkspaceState } from '@/components/messenger/use-messenger-workspace';
import { cn } from '@/lib/utils';
import type { DecryptedMessengerMessage } from '@/types';

export function MessengerMessage({
  message,
  reply,
  outgoing,
  beneficiary,
  claimingBountyId,
  groupStart,
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
  groupStart: boolean;
  senderAvatar: string | null;
  senderUsername: string;
  onReply: (message: DecryptedMessengerMessage) => void;
  onClaim: MessengerWorkspaceState['claimBounty'];
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
      <button
        className={cn(
          'mt-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-white text-secondary opacity-0 shadow-[0_3px_12px_rgba(11,11,63,0.06)] transition hover:border-brand/30 hover:text-brand group-hover:opacity-100 focus:opacity-100 max-sm:mt-1 max-sm:size-6 max-sm:border-0 max-sm:bg-[#F1F4F5] max-sm:opacity-100 max-sm:shadow-none',
          outgoing ? 'order-0' : 'order-2',
        )}
        onClick={() => onReply(message)}
        aria-label="Reply to message"
        type="button"
      >
        <Reply size={13} />
      </button>
      <MessageBubble
        className={cn(outgoing && 'order-1')}
        tone={outgoing ? 'outgoing' : 'incoming'}
      >
        {message.manifest.replyToMessageId && (
          <div
            className={cn(
              'mb-2 rounded-xl border-l-2 px-3 py-1.5 text-xs',
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
          <p className="font-message max-w-full whitespace-pre-wrap break-words text-[16px] leading-[1.45] [overflow-wrap:anywhere]">
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
          <MessageBounty
            bounty={message.bounty}
            beneficiary={beneficiary}
            claiming={claimingBountyId === message.bounty.id}
            onClaim={(bounty) => void onClaim(bounty)}
          />
        )}
        <div
          className={cn(
            'flex items-center justify-end gap-1.5 text-[11px] leading-none text-[#080B0D]',
            message.bounty
              ? 'relative mt-2 min-h-4'
              : 'absolute bottom-[11px] right-[20px]',
            outgoing && 'text-white',
          )}
        >
          <time>{messengerTimeLabel(message.createdAt)}</time>
          {outgoing &&
            (message.delivery.seenByRecipient ? (
              <CircleCheck size={14} aria-label="Seen" />
            ) : (
              <Check size={14} aria-label="Sent" />
            ))}
        </div>
      </MessageBubble>
    </motion.article>
  );
}
