'use client';

import { AlertCircle, CheckCheck } from 'lucide-react';
import {
  MessageBubble,
  MessageBubbleAvatar,
} from '@/components/messenger/message-bubble';
import { cn } from '@/lib/utils';
import type { DecryptedBroadcast } from '@/types';

const broadcastTime = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function BroadcastBubble({ item }: { item: DecryptedBroadcast }) {
  const own = item.viewerKey.source === 'creator';
  return (
    <article
      className={cn(
        'flex w-full min-w-0 items-start gap-3',
        own ? 'justify-end' : 'justify-start',
      )}
    >
      <MessageBubbleAvatar
        avatar={item.creator.avatar}
        outgoing={own}
        username={item.creator.username}
      />
      <MessageBubble tone={own ? 'outgoing' : 'incoming'}>
        {item.state === 'decrypted' ? (
          <p className="font-message max-w-full whitespace-pre-wrap break-words text-[15px] leading-6 [overflow-wrap:anywhere]">
            {item.content}
          </p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted">
            <AlertCircle size={16} /> This broadcast is unavailable
          </p>
        )}
        <div
          className={cn(
            'mt-2 flex flex-wrap items-center justify-end gap-2 text-[10px]',
            own ? 'text-white/75' : 'text-[#5F6875]',
          )}
        >
          <time dateTime={item.publishedAt}>
            {broadcastTime.format(new Date(item.publishedAt))}
          </time>
          {own && <CheckCheck size={15} aria-label="Sent" />}
        </div>
      </MessageBubble>
    </article>
  );
}
