'use client';

import { ArrowDown, UsersRound } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
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

export function BroadcastFeed({
  state,
}: {
  state: BroadcastChatState;
}) {
  const {
    chronologicalFeed,
    error,
    load,
    messageEnd,
    recipientDetails,
    setOpenDetails,
  } = state;
  const feed = useRef<HTMLElement>(null);
  const [showLatestButton, setShowLatestButton] = useState(false);

  const updateLatestButton = useCallback(() => {
    const element = feed.current;
    if (!element) return;
    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    setShowLatestButton(distanceFromBottom > 120);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(updateLatestButton);
    return () => cancelAnimationFrame(frame);
  }, [chronologicalFeed?.length, updateLatestButton]);

  const scrollToLatest = () => {
    messageEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  return (
    <main
      ref={feed}
      className={cn(
        conversationBackgroundClassName,
        'min-h-0 min-w-0 max-w-full overflow-x-hidden overflow-y-auto px-7 py-6 max-sm:px-3',
      )}
      onScroll={updateLatestButton}
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
              aria-label="Jump to latest broadcast"
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
