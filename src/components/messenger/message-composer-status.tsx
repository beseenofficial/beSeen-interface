'use client';

import { RotateCcw } from 'lucide-react';
import type { MessengerWorkspaceState } from '@/components/messenger/use-messenger-workspace';

export function MessageComposerStatus({ workspace }: { workspace: MessengerWorkspaceState }) {
  const {
    discardRetry,
    hasPendingRetry,
    historyError,
    messages,
    retrySend,
    sendError,
    sendErrorCode,
    sending,
  } = workspace;
  return (
    <>
      {historyError && messages.length > 0 && <p className="mb-2 text-xs text-error" role="alert">{historyError}</p>}
      {hasPendingRetry && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-warning/25 bg-warning-bg px-3 py-2 text-xs text-warning" role="alert">
          <RotateCcw size={16} />
          <span className="min-w-0 flex-1">{sendError ?? 'We could not confirm whether this message was sent.'}</span>
          {sendErrorCode !== 'MESSAGE_ID_CONFLICT' && <button className="font-semibold underline" disabled={sending} onClick={() => void retrySend()} type="button">Try again</button>}
          <button className="font-semibold underline" disabled={sending} onClick={() => void discardRetry()} type="button">Discard</button>
        </div>
      )}
      {sendError && !hasPendingRetry && <p className="mb-2 text-xs text-error" role="alert">{sendError}</p>}
    </>
  );
}
