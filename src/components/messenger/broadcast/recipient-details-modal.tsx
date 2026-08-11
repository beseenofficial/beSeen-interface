'use client';

import { Radio, X } from 'lucide-react';
import { useId, useRef } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import type { BroadcastRecipientSummary } from '@/types';

export type RecipientDetails = {
  audienceCount: number;
  recipients: BroadcastRecipientSummary[];
};

export function RecipientDetailsModal({
  details,
  onClose,
}: {
  details: RecipientDetails | null;
  onClose: () => void;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  return (
    <Modal
      open={Boolean(details)}
      onClose={onClose}
      initialFocusRef={closeButton}
      ariaLabelledBy={titleId}
      className="flex max-h-[min(680px,88svh)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-elevated"
    >
      {details && (
        <>
          <header className="flex items-start gap-3 border-b border-border bg-info-bg px-5 py-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white"><Radio size={19} /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold" id={titleId}>Broadcast recipients</h2>
              <p className="mt-1 text-xs text-secondary">Sent to {details.audienceCount.toLocaleString()} {details.audienceCount === 1 ? 'person' : 'people'}</p>
            </div>
            <button ref={closeButton} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-white text-secondary transition hover:border-brand hover:text-navy" aria-label="Close recipient details" onClick={onClose} type="button"><X size={17} /></button>
          </header>
          <div className="min-h-0 overflow-y-auto p-3">
            {details.recipients.length === 0 ? (
              <p className="px-3 py-10 text-center text-sm text-secondary">This broadcast had no recipients.</p>
            ) : (
              <ul className="grid gap-1">
                {details.recipients.map((recipient) => (
                  <li key={recipient.userId}>
                    <div className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5">
                      <Avatar className="size-9" username={recipient.username} size="sm" />
                      <span className="min-w-0 truncate text-sm font-semibold">@{recipient.username}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
