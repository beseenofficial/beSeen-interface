import { Inbox, Radio, UserRoundCheck } from "lucide-react";
import type { CreatorActivity } from "@/types";
import { relativeTime } from "@/lib/utils";
import { EmptyState } from "@/components/ui/states";

const icons = {
  account_created: UserRoundCheck,
  broadcast_published: Radio,
  broadcast_received: Inbox,
} as const;

export function ActivityList({
  activity,
  limit,
}: {
  activity: CreatorActivity[];
  limit?: number;
}) {
  const items = typeof limit === "number" ? activity.slice(0, limit) : activity;
  if (!items.length) {
    return (
      <EmptyState
        title="No recent activity"
        message="Your verified BeSeen activity will appear here."
      />
    );
  }
  return (
    <div className="grid">
      {items.map((item) => {
        const Icon = icons[item.type];
        return (
          <div
            className="grid min-h-18 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border-t border-[#edf2f4] py-3 first:border-t-0 max-sm:grid-cols-[38px_minmax(0,1fr)]"
            key={item.id}
          >
            <span className="grid size-9.5 place-items-center rounded-[10px] bg-info-bg text-brand">
              <Icon size={18} aria-hidden />
            </span>
            <div className="min-w-0">
              <strong className="block text-[13px]">{item.title}</strong>
              {item.description && (
                <p className="mt-0.75 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-muted">
                  {item.description}
                </p>
              )}
            </div>
            <time
              className="whitespace-nowrap text-[10px] text-muted max-sm:col-start-2"
              dateTime={item.createdAt}
            >
              {relativeTime(item.createdAt)}
            </time>
          </div>
        );
      })}
    </div>
  );
}
