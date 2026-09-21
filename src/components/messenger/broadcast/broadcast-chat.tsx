'use client';

import { BroadcastComposer } from '@/components/messenger/broadcast/broadcast-composer';
import { BroadcastFeed } from '@/components/messenger/broadcast/broadcast-feed';
import { BroadcastHeader } from '@/components/messenger/broadcast/broadcast-header';
import { RecipientDetailsModal } from '@/components/messenger/broadcast/recipient-details-modal';
import { useBroadcastChat } from '@/components/messenger/broadcast/use-broadcast-chat';
import { conversationPanelClassName } from '@/components/messenger/conversation-surface';
import type { DerivedKeys, User } from '@/types';

type BroadcastChatProps = {
  user: User;
  keys: DerivedKeys;
  onBack: () => void;
};

export function BroadcastChat({
  user,
  keys,
  onBack,
}: BroadcastChatProps) {
  const state = useBroadcastChat({ user, keys });
  return (
    <>
      <div className={conversationPanelClassName}>
        <BroadcastHeader onBack={onBack} />
        <BroadcastFeed state={state} />
        <BroadcastComposer state={state} />
      </div>
      <RecipientDetailsModal details={state.openDetails} onClose={() => state.setOpenDetails(null)} />
    </>
  );
}
