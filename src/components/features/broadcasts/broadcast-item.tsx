import { UsersRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { relativeTime } from "@/lib/utils";
import type { Broadcast } from "@/types";

export function BroadcastItem({
  broadcast,
  username,
  avatarUrl,
}: {
  broadcast: Broadcast;
  username: string;
  avatarUrl: string | null;
}) {
  return (
    <article className="grid grid-cols-[40px_minmax(0,1fr)] gap-3.25 border-t border-border py-5.5 first:border-t-0">
      <Avatar username={username} src={avatarUrl} size="sm" />
      <div>
        <div className="flex flex-wrap items-center gap-2.25 [&>span:last-child]:ml-auto [&>span:last-child]:min-h-6 [&>span:last-child]:py-0.5 max-sm:[&>span:last-child]:ml-0">
          <strong className="text-[13px]">@{username}</strong>
          <time className="text-[11px] text-muted" dateTime={broadcast.createdAt}>{relativeTime(broadcast.createdAt)}</time>
          <StatusBadge tone="success">Published</StatusBadge>
        </div>
        <p className="mt-2.75 whitespace-pre-wrap break-words text-secondary">{broadcast.content}</p>
        <span className="mt-3.25 flex items-center gap-1.5 text-[11px] text-muted"><UsersRound size={15} /> Sent to {broadcast.recipientCount} Aura holders</span>
      </div>
    </article>
  );
}
