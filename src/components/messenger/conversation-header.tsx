'use client';

import { ChevronLeft } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import type { MessengerWorkspaceState } from '@/components/messenger/use-messenger-workspace';

export function ConversationHeader({ workspace }: { workspace: MessengerWorkspaceState }) {
  const { otherParticipant, setActiveConversationId, setProfileUsername } = workspace;

  return (
    <header className="flex min-w-0 items-center gap-3 border-b border-border bg-white px-5">
      <button
        className="mr-1 hidden size-10 cursor-pointer place-items-center rounded-full bg-subtle max-[720px]:grid"
        onClick={() => setActiveConversationId(null)}
        aria-label="Back to conversations"
        type="button"
      >
        <ChevronLeft size={20} />
      </button>
      {otherParticipant ? (
        <button
          className="cursor-pointer rounded-full"
          onClick={() => setProfileUsername(otherParticipant.username)}
          aria-label={`View @${otherParticipant.username} profile`}
          type="button"
        >
          <Avatar className="size-10" username={otherParticipant.username} src={otherParticipant.avatar} size="md" />
        </button>
      ) : (
        <span className="size-11 animate-pulse rounded-full bg-disabled" />
      )}
      <button
        className="min-w-0 text-left"
        disabled={!otherParticipant}
        onClick={() => otherParticipant && setProfileUsername(otherParticipant.username)}
        type="button"
      >
        <h1 className="truncate text-base font-semibold transition hover:text-brand">
          {otherParticipant ? `@${otherParticipant.username}` : 'Loading conversation…'}
        </h1>
        <p className="mt-1 text-[11px] text-muted">Direct message</p>
      </button>
    </header>
  );
}
