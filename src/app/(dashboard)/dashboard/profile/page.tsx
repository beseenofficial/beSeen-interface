"use client";

import {
  Activity,
  Bell,
  CalendarDays,
  Check,
  CircleDollarSign,
  KeyRound,
  Radio,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ActivityList } from "@/components/features/dashboard/activity-list";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { CopyButton } from "@/components/ui/copy-button";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { APP_URL } from "@/lib/constants";
import { mockApi } from "@/lib/mock-api";
import { formatDate, shortenAddress } from "@/lib/utils";
import type { CreatorInfo } from "@/types";

const infoTones = {
  lilac: "bg-[#f0edff] text-[#6553c7]",
  lime: "bg-[#f9fbd2] text-[#717800]",
  peach: "bg-[#fff0ec] text-[#ba5d46]",
  blue: "bg-info-bg text-brand",
  aqua: "bg-[#e4fafd] text-[#147b87]",
  neutral: "bg-subtle text-secondary",
};

export default function CreatorProfilePage() {
  const [data, setData] = useState<CreatorInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function load() {
    setError(null);
    try {
      setData(await mockApi.getCreatorInfo());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not load creator information.");
    }
  }
  useEffect(() => void load(), []);
  if (error) return <ErrorState message={error} retry={() => void load()} />;
  if (!data) return <LoadingState label="Loading creator info…" />;

  const profileUrl = `${APP_URL}/${data.profile.username}`;
  const info = [
    { label: "Aura holders", value: String(data.stats.auraHolders), meta: "Community members", icon: UsersRound, tone: "lilac" },
    { label: "Current Aura price", value: `${data.stats.auraPrice.amount} ${data.stats.auraPrice.asset}`, meta: "Mock amount", icon: CircleDollarSign, tone: "lime" },
    { label: "Bounty messages", value: String(data.stats.bountyMessages), meta: "Waiting for a reply", icon: Bell, tone: "peach" },
    { label: "Broadcasts", value: String(data.stats.broadcastsSent), meta: "Total sent", icon: Radio, tone: "blue" },
    { label: "Creator activity", value: data.stats.activityStatus, meta: "Presence status", icon: Activity, tone: "aqua" },
    { label: "Member since", value: formatDate(data.profile.createdAt), meta: "BeSeen account created", icon: CalendarDays, tone: "neutral" },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-360 px-12 pb-16 pt-12 max-[1180px]:px-8 max-[1180px]:pb-14 max-[1180px]:pt-10 max-sm:px-4 max-sm:pb-12 max-sm:pt-7.5">
      <PageHeader eyebrow="Account overview" title="Creator Profile" description="Your public identity, Aura status, and creator activity." />
      <section className="grid grid-cols-[96px_minmax(220px,1fr)_auto_auto] items-center gap-6 rounded-2xl border border-border bg-white p-7 max-[1180px]:grid-cols-[80px_1fr_auto] max-[1180px]:[&>button]:col-[2/4] max-[1180px]:[&>button]:w-fit max-sm:grid-cols-[72px_1fr] max-sm:p-5 max-sm:[&>button]:col-[1/3] max-sm:[&>button]:w-full">
        <Avatar username={data.profile.username} src={data.profile.avatarUrl} size="xl" />
        <div>
          <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.09em] text-brand">Aura by</span>
          <h2 className="text-[28px]">@{data.profile.username}</h2>
          <a className="mt-1.5 block text-[13px] font-semibold text-brand" href={profileUrl}>{profileUrl}</a>
          <p className="mt-1 text-[11px] text-muted">{shortenAddress(data.profile.stellarAddress)}</p>
        </div>
        <div className="flex flex-col items-start gap-1.75 max-sm:col-[1/3]">
          <StatusBadge tone="success"><KeyRound size={13} /> Messaging key active</StatusBadge>
          <StatusBadge tone="lilac"><Check size={13} /> Aura active</StatusBadge>
        </div>
        <CopyButton value={profileUrl} label="Copy profile link" />
      </section>
      <section className="mt-5 grid grid-cols-3 gap-4 max-sm:grid-cols-1">
        {info.map((item) => {
          const Icon = item.icon;
          return (
            <article className="flex min-h-44.5 flex-col rounded-2xl border border-border bg-white p-6 max-sm:min-h-40" key={item.label}>
              <span className={`grid size-9.5 place-items-center rounded-[11px] ${infoTones[item.tone]}`}><Icon size={20} /></span>
              <p className="mt-4 text-xs text-secondary">{item.label}</p>
              <strong className="mt-1 text-2xl font-semibold">{item.value}</strong>
              <small className="mt-auto text-[11px] text-muted">{item.meta}</small>
            </article>
          );
        })}
      </section>
      <section className="mt-5 rounded-2xl border border-border bg-white p-7 max-sm:p-5">
        <div className="mb-5 flex items-center justify-between gap-4"><div><span className="mb-1.25 inline-block text-xs font-bold uppercase tracking-[0.09em] text-brand">Timeline</span><h2 className="text-[23px] font-semibold">Creator activity</h2></div></div>
        <ActivityList activity={data.activity} />
      </section>
    </div>
  );
}
