import {
  AlertTriangle,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { relativeTime } from "@/lib/utils";
import type { DecryptedBroadcast } from "@/types";

export function BroadcastItem({
  broadcast,
}: {
  broadcast: DecryptedBroadcast;
}) {
  return (
    <article className="grid grid-cols-[40px_minmax(0,1fr)] gap-3.25 border-t border-border py-5.5 first:border-t-0">
      <Avatar
        username={broadcast.creator.username}
        src={broadcast.creator.avatarUrl}
        size="sm"
      />
      <div>
        <div className="flex flex-wrap items-center gap-2.25 [&>span:last-child]:ml-auto max-sm:[&>span:last-child]:ml-0">
          <strong className="text-[13px]">
            @{broadcast.creator.username}
          </strong>
          <time
            className="text-[11px] text-muted"
            dateTime={broadcast.publishedAt}
          >
            {relativeTime(broadcast.publishedAt)}
          </time>
          {broadcast.integrity === "verified" ? (
            <StatusBadge tone="success">
              <ShieldCheck size={13} /> Verified
            </StatusBadge>
          ) : (
            <StatusBadge tone="warning">
              <AlertTriangle size={13} /> Unverified
            </StatusBadge>
          )}
        </div>
        {broadcast.content === null ? (
          <p className="mt-2.75 rounded-xl bg-error-bg p-3 text-xs text-error">
            This encrypted broadcast could not be verified, so its content was
            not displayed.
          </p>
        ) : (
          <p className="mt-2.75 whitespace-pre-wrap break-words text-secondary">
            {broadcast.content}
          </p>
        )}
        <span className="mt-3.25 flex items-center gap-1.5 text-[11px] text-muted">
          <UsersRound size={15} /> Encrypted for{" "}
          {broadcast.audienceCount.toLocaleString()} recipient
          {broadcast.audienceCount === 1 ? "" : "s"}
        </span>
      </div>
    </article>
  );
}
