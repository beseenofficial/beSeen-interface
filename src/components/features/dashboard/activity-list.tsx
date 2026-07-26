import {
  Bell,
  KeyRound,
  Radio,
  Sparkles,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import type { ActivityType, CreatorActivity } from "@/types";
import { relativeTime } from "@/lib/utils";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils";

const icons: Record<ActivityType, typeof Bell> = {
  profile_created: UserRoundCheck,
  messaging_key_created: KeyRound,
  aura_acquired: UsersRound,
  broadcast_published: Radio,
  bounty_received: Bell,
  profile_updated: Sparkles,
};

const iconTones: Partial<Record<ActivityType, string>> = {
  messaging_key_created: "bg-success-bg text-success",
  aura_acquired: "bg-[#f0edff] text-[#6755c9]",
  bounty_received: "bg-[#fff0ec] text-[#c15e45]",
};

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
        message="New creator and Aura activity will appear here."
      />
    );
  }
  return (
    <div className="grid">
      {items.map((item) => {
        const Icon = icons[item.type];
        return (
          <div className="grid min-h-18 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border-t border-[#edf2f4] py-3 first:border-t-0 max-sm:grid-cols-[38px_minmax(0,1fr)]" key={item.id}>
            <span className={cn("grid size-9.5 place-items-center rounded-[10px] bg-info-bg text-brand", iconTones[item.type])}>
              <Icon size={18} aria-hidden />
            </span>
            <div className="min-w-0">
              <strong className="block text-[13px]">{item.title}</strong>
              {item.description && <p className="mt-0.75 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-muted">{item.description}</p>}
            </div>
            <time className="whitespace-nowrap text-[10px] text-muted max-sm:col-start-2" dateTime={item.createdAt}>{relativeTime(item.createdAt)}</time>
          </div>
        );
      })}
    </div>
  );
}
