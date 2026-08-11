'use client';

import { ArrowLeft } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import type { MessengerWorkspaceState } from '@/components/messenger/use-messenger-workspace';

export function ConversationHeader({
  workspace,
}: {
  workspace: MessengerWorkspaceState;
}) {
  const { otherParticipant, setActiveConversationId, setProfileUsername } =
    workspace;

  return (
    <header className="flex min-w-0 items-center gap-3 border-b border-border bg-white px-5 max-[720px]:gap-2 max-[720px]:bg-subtle max-[720px]:px-3 max-[720px]:py-2">
      <button
        className="hidden size-12 shrink-0 cursor-pointer place-items-center rounded-xl border border-border bg-white text-navy shadow-[0_2px_8px_rgba(11,11,63,0.04)] transition hover:border-brand/25 hover:bg-info-bg max-[720px]:grid"
        onClick={() => setActiveConversationId(null)}
        aria-label="Back to conversations"
        type="button"
      >
        <ArrowLeft size={20} />
      </button>

      {otherParticipant ? (
        <button
          className="flex min-w-0 cursor-pointer items-center gap-3 text-left transition hover:opacity-85 max-[720px]:min-h-12 max-[720px]:flex-1 max-[720px]:gap-2.5 max-[720px]:rounded-xl max-[720px]:border max-[720px]:border-border max-[720px]:bg-white max-[720px]:px-2.5 max-[720px]:shadow-[0_2px_8px_rgba(11,11,63,0.04)]"
          onClick={() => setProfileUsername(otherParticipant.username)}
          aria-label={`View @${otherParticipant.username} profile`}
          type="button"
        >
          <Avatar
            className="size-10 max-[720px]:size-9"
            username={otherParticipant.username}
            src={otherParticipant.avatar}
            size="md"
          />
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-base font-semibold transition hover:text-brand">
              @{otherParticipant.username}
            </strong>
            <span className="mt-1 block text-[11px] leading-none text-muted max-[720px]:mt-0.5">
              Direct message
            </span>
          </span>
        </button>
      ) : (
        <span className="h-12 min-w-0 flex-1 animate-pulse rounded-xl bg-disabled" />
      )}
    </header>
  );
}
