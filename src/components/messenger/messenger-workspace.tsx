'use client';

import { MessageCircleMore } from 'lucide-react';
import { motion } from 'framer-motion';
import { BroadcastChat } from '@/components/messenger/broadcast/broadcast-chat';
import { ConversationHeader } from '@/components/messenger/conversation-header';
import { ConversationSidebar } from '@/components/messenger/conversation-sidebar';
import { conversationPanelClassName } from '@/components/messenger/conversation-surface';
import { MessageComposer } from '@/components/messenger/message-composer';
import { MessageTimeline } from '@/components/messenger/message-timeline';
import { ProfileModal } from '@/components/messenger/profile-modal';
import { useMessengerWorkspace } from '@/components/messenger/use-messenger-workspace';
import { cn } from '@/lib/utils';
import type { DerivedKeys, User } from '@/types';

export function MessengerWorkspace({
  user,
  keys,
}: {
  user: User;
  keys: DerivedKeys;
}) {
  const workspace = useMessengerWorkspace(user, keys);
  const {
    activeConversationId,
    broadcastOpen,
    broadcastRecipientDetails,
    closeProfile,
    profileUsername,
    setBroadcastOpen,
    setBroadcastRecipientDetails,
  } = workspace;

  return (
    <section
      className="grid h-full min-h-0 min-w-0 grid-cols-[360px_minmax(0,1fr)] overflow-hidden bg-white max-[1200px]:grid-cols-[340px_minmax(0,1fr)] max-[900px]:grid-cols-[300px_minmax(0,1fr)] max-[720px]:grid-cols-1"
      data-mobile-chat-open={Boolean(activeConversationId || broadcastOpen)}
      aria-label="BeSeen Messenger"
    >
      <ConversationSidebar workspace={workspace} />
      <div
        className={cn(
          'min-h-0 min-w-0 max-w-full overflow-hidden bg-subtle min-[721px]:relative min-[721px]:z-10 min-[721px]:overflow-visible',
          !broadcastOpen && !activeConversationId && 'max-[720px]:hidden',
        )}
      >
        {broadcastOpen ? (
          <BroadcastChat
            user={user}
            keys={keys}
            recipientDetails={broadcastRecipientDetails}
            onRecipientsLoaded={(broadcastId, recipients) => {
              setBroadcastRecipientDetails((current) => ({
                ...current,
                [broadcastId]: recipients,
              }));
            }}
            onBack={() => setBroadcastOpen(false)}
          />
        ) : !activeConversationId ? (
          <div className="grid h-full place-items-center bg-ice p-8 text-center">
            <div className="max-w-md">
              <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-info-bg text-brand">
                <MessageCircleMore size={30} />
              </span>
              <h1 className="mt-5 text-2xl font-semibold">
                Your conversations
              </h1>
              <p className="mt-2 text-sm leading-6 text-secondary">
                Chat one-to-one with creators whose tokens you own.
              </p>
            </div>
          </div>
        ) : (
          <motion.div
            className={conversationPanelClassName}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            <ConversationHeader workspace={workspace} />
            <MessageTimeline workspace={workspace} />
            <MessageComposer workspace={workspace} />
          </motion.div>
        )}
      </div>
      <ProfileModal username={profileUsername} onClose={closeProfile} />
    </section>
  );
}
