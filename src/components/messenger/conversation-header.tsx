'use client';

import { CircleAlert } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { MessengerHeader } from '@/components/messenger/messenger-header';
import type { MessengerWorkspaceState } from '@/components/messenger/use-messenger-workspace';

export function ConversationHeader({
  workspace,
}: {
  workspace: MessengerWorkspaceState;
}) {
  const { otherParticipant, setActiveConversationId, setProfileUsername } =
    workspace;

  return (
    <MessengerHeader onBack={() => setActiveConversationId(null)}>
      {otherParticipant ? (
        <button
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left transition hover:opacity-85 max-[720px]:min-h-12 max-[720px]:gap-2.5 max-[720px]:rounded-2xl max-[720px]:border-0 max-[720px]:bg-transparent max-[720px]:px-2.5 max-[720px]:shadow-none max-[720px]:backdrop-blur-none"
          onClick={() => setProfileUsername(otherParticipant.username)}
          aria-label={`View @${otherParticipant.username} profile`}
          type="button"
        >
          <Avatar
            className="size-9 max-[720px]:size-9"
            username={otherParticipant.username}
            src={otherParticipant.avatar}
            size="md"
          />
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-base font-semibold transition hover:text-brand">
              {otherParticipant.username}
            </strong>
            {/* <span className="mt-1 block text-[11px] leading-none text-muted max-[720px]:mt-0.5">
              Direct message
            </span> */}
          </span>
          <span
            className="grid size-8 shrink-0 place-items-center text-secondary transition hover:text-brand"
            aria-hidden="true"
          >
            <CircleAlert size={17} strokeWidth={1.9} />
          </span>
        </button>
      ) : (
        <span className="h-12 min-w-0 flex-1 animate-pulse rounded-xl bg-disabled max-[720px]:rounded-2xl max-[720px]:bg-white/60 max-[720px]:shadow-[0_6px_20px_rgba(11,11,63,0.07)] max-[720px]:backdrop-blur-2xl" />
      )}
    </MessengerHeader>
  );
}
