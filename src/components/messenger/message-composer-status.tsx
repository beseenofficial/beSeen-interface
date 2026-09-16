'use client';

import { RotateCcw } from 'lucide-react';
import Link from 'next/link';
import type { MessengerWorkspaceState } from '@/components/messenger/use-messenger-workspace';

export function MessageComposerStatus({ workspace }: { workspace: MessengerWorkspaceState }) {
  const {
    discardRetry,
    hasPendingRetry,
    retrySend,
    sendError,
    sendErrorCode,
    sending,
    showBounty,
    bountyError,
    otherParticipant,
  } = workspace;
  // A 403 means current on-chain Aura access is gone; a fresh purchase from the
  // other person's profile is the way back. The preserved message can be
  // retried afterwards.
  const accessDeniedProfileHref =
    sendErrorCode === 'CONTRACT_MESSAGE_ACCESS_DENIED' && otherParticipant?.username
      ? `/u/${encodeURIComponent(otherParticipant.username)}`
      : null;
  return (
    <>
      {hasPendingRetry && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-warning/25 bg-warning-bg px-3 py-2 text-xs text-warning" role="alert">
          <RotateCcw size={16} />
          <span className="min-w-0 flex-1">{sendError ?? 'We could not confirm whether this message was sent.'} Retry it, or stop retrying to write a new message.</span>
          {accessDeniedProfileHref && (
            <Link className="min-h-11 rounded-lg px-2 font-semibold underline underline-offset-2" href={accessDeniedProfileHref}>Open their profile</Link>
          )}
          {sendErrorCode !== 'MESSAGE_ID_CONFLICT' && <button className="min-h-11 rounded-lg px-2 font-semibold underline underline-offset-2" disabled={sending} onClick={() => void retrySend()} type="button">Try again</button>}
          <button className="min-h-11 rounded-lg px-2 font-semibold underline underline-offset-2" disabled={sending} onClick={() => void discardRetry()} type="button">Stop retrying</button>
        </div>
      )}
      {sendError && !hasPendingRetry && (
        <p className="mb-2 text-xs text-error" role="alert">
          {sendError}
          {accessDeniedProfileHref && (
            <>
              {' '}
              <Link className="font-semibold underline underline-offset-2" href={accessDeniedProfileHref}>Open their profile</Link>
            </>
          )}
        </p>
      )}
      {showBounty && (
        <p className={bountyError ? 'mb-2 text-xs text-error' : 'mb-2 text-xs text-muted'} role={bountyError ? 'alert' : undefined}>
          {bountyError ?? 'The USDC amount is locked on-chain from your connected wallet when you send.'}
        </p>
      )}
    </>
  );
}
