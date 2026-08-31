'use client';

import { RotateCcw } from 'lucide-react';
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
    demoUsdcBalance,
  } = workspace;
  return (
    <>
      {hasPendingRetry && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-warning/25 bg-warning-bg px-3 py-2 text-xs text-warning" role="alert">
          <RotateCcw size={16} />
          <span className="min-w-0 flex-1">{sendError ?? 'We could not confirm whether this message was sent.'} Retry it, or stop retrying to write a new message.</span>
          {sendErrorCode !== 'MESSAGE_ID_CONFLICT' && <button className="min-h-11 rounded-lg px-2 font-semibold underline underline-offset-2" disabled={sending} onClick={() => void retrySend()} type="button">Try again</button>}
          <button className="min-h-11 rounded-lg px-2 font-semibold underline underline-offset-2" disabled={sending} onClick={() => void discardRetry()} type="button">Stop retrying</button>
        </div>
      )}
      {sendError && !hasPendingRetry && <p className="mb-2 text-xs text-error" role="alert">{sendError}</p>}
      {showBounty && (
        <p className={bountyError ? 'mb-2 text-xs text-error' : 'mb-2 text-xs text-muted'} role={bountyError ? 'alert' : undefined}>
          {bountyError ?? `Available: ${demoUsdcBalance} demo USDC`}
        </p>
      )}
    </>
  );
}
