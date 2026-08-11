'use client';

import { BroadcastComposer } from '@/components/messenger/broadcast/broadcast-composer';
import { BroadcastFeed } from '@/components/messenger/broadcast/broadcast-feed';
import { BroadcastHeader } from '@/components/messenger/broadcast/broadcast-header';
import { RecipientDetailsModal } from '@/components/messenger/broadcast/recipient-details-modal';
import { useBroadcastChat } from '@/components/messenger/broadcast/use-broadcast-chat';
import { conversationPanelClassName } from '@/components/messenger/conversation-surface';
import type { BroadcastRecipientSummary, DerivedKeys, User } from '@/types';

type BroadcastChatProps = {
  user: User;
  keys: DerivedKeys;
  recipientDetails: Record<string, BroadcastRecipientSummary[]>;
  onRecipientsLoaded: (broadcastId: string, recipients: BroadcastRecipientSummary[]) => void;
  onBack: () => void;
};

export function BroadcastChat({
  user,
  keys,
  recipientDetails,
  onRecipientsLoaded,
  onBack,
}: BroadcastChatProps) {
  const state = useBroadcastChat({ user, keys, onRecipientsLoaded });
  return (
    <>
      <div className={conversationPanelClassName}>
        <BroadcastHeader onBack={onBack} />
        <BroadcastFeed state={state} recipientDetails={recipientDetails} />
        <BroadcastComposer state={state} />
      </div>
      <RecipientDetailsModal details={state.openDetails} onClose={() => state.setOpenDetails(null)} />
    </>
  );
}
