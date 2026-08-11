'use client';

import { UsersRound } from 'lucide-react';
import { BroadcastBubble } from '@/components/messenger/broadcast/broadcast-bubble';
import { BroadcastDeliveryConfirmation } from '@/components/messenger/broadcast/broadcast-delivery-confirmation';
import {
  BroadcastFeedEmpty,
  BroadcastFeedError,
  BroadcastFeedLoading,
} from '@/components/messenger/broadcast/broadcast-feed-states';
import type { BroadcastChatState } from '@/components/messenger/broadcast/use-broadcast-chat';
import { conversationBackgroundClassName } from '@/components/messenger/conversation-surface';
import { cn } from '@/lib/utils';
import type { BroadcastRecipientSummary } from '@/types';

export function BroadcastFeed({
  state,
  recipientDetails,
}: {
  state: BroadcastChatState;
  recipientDetails: Record<string, BroadcastRecipientSummary[]>;
}) {
  const { chronologicalFeed, error, load, messageEnd, setOpenDetails } = state;
  return (
    <main
      className={cn(
        conversationBackgroundClassName,
        'min-h-0 min-w-0 max-w-full overflow-x-hidden overflow-y-auto px-7 py-6 max-sm:px-3',
      )}
      aria-live="polite"
    >
      <div className="w-full min-w-0">
        <div className="mx-auto mb-7 flex w-fit max-w-full items-center gap-3 rounded-2xl border border-brand/10 bg-info-bg px-4 py-3 text-xs text-secondary">
          <UsersRound className="shrink-0 text-brand" size={18} />
          <span>Send one update to everyone who follows you.</span>
        </div>

        <BroadcastFeedError error={error} onRetry={() => void load()} />

        {!chronologicalFeed ? (
          <BroadcastFeedLoading />
        ) : chronologicalFeed.length === 0 ? (
          <BroadcastFeedEmpty />
        ) : (
          <div className="grid w-full min-w-0 gap-4">
            {chronologicalFeed.map((item) => {
              const own = item.viewerKey.source === 'creator';
              return (
                <div className="grid min-w-0 gap-2" key={item.id}>
                  <BroadcastBubble item={item} />
                  {own && (
                    <BroadcastDeliveryConfirmation
                      item={item}
                      recipients={recipientDetails[item.id]}
                      onOpenDetails={setOpenDetails}
                    />
                  )}
                </div>
              );
            })}
            <div ref={messageEnd} />
          </div>
        )}
      </div>
    </main>
  );
}
