'use client';

import { BadgeCheck, Radio } from 'lucide-react';
import { MessageBubble } from '@/components/messenger/message-bubble';
import type { RecipientDetails } from '@/components/messenger/broadcast/recipient-details-modal';
import type { BroadcastRecipientSummary, DecryptedBroadcast } from '@/types';

export function BroadcastDeliveryConfirmation({
  item,
  recipients,
  onOpenDetails,
}: {
  item: DecryptedBroadcast;
  recipients?: BroadcastRecipientSummary[];
  onOpenDetails: (details: RecipientDetails) => void;
}) {
  return (
    <article className="flex w-full min-w-0 justify-start min-[1440px]:items-start min-[1440px]:gap-3" aria-label="BeSeen delivery confirmation">
      <span className="hidden size-9 shrink-0 place-items-center rounded-full bg-brand text-white min-[1440px]:grid" aria-hidden="true">
        <Radio size={15} />
      </span>
      <MessageBubble shadow="soft" tone="incoming">
        <div className="flex items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-white min-[1440px]:hidden"><Radio size={13} /></span>
          <strong className="flex items-center gap-1 text-xs">
            BeSeen <BadgeCheck className="fill-brand text-white" size={14} aria-label="Official" />
          </strong>
        </div>
        <p className="mt-2 text-sm text-secondary">
          Your broadcast was sent to {item.manifest.audienceCount.toLocaleString()} {item.manifest.audienceCount === 1 ? 'person' : 'people'}.
        </p>
        {recipients && (
          <button
            className="mt-2 cursor-pointer text-xs font-semibold text-brand underline underline-offset-3"
            onClick={() => onOpenDetails({ audienceCount: item.manifest.audienceCount, recipients })}
            type="button"
          >
            View details
          </button>
        )}
      </MessageBubble>
    </article>
  );
}
