'use client';

import {
  ArrowUpRight,
  Bell,
  Check,
  Circle,
  Radio,
  Share2,
  Sparkles,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ActivityList } from '@/components/features/dashboard/activity-list';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/features/dashboard/stat-card';
import { AuraRipple } from '@/components/ui/aura-ripple';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { StatusBadge } from '@/components/ui/status-badge';
import { APP_URL } from '@/lib/constants';
import { mockApi } from '@/lib/mock-api';
import { useToast } from '@/providers/toast-provider';
import type { DashboardOverview } from '@/types';

export default function OverviewPage() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  async function load() {
    setError(null);
    try {
      setData(await mockApi.getDashboardOverview());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'We could not load your overview.',
      );
    }
  }
  useEffect(() => void load(), []);
  if (error) return <ErrorState message={error} retry={() => void load()} />;
  if (!data) return <LoadingState label="Loading your Aura…" />;

  const profileUrl = `${APP_URL}/${data.profile.username}`;
  return (
    <div className="mx-auto w-full max-w-360 px-12 pb-16 pt-12 max-[1180px]:px-8 max-[1180px]:pb-14 max-[1180px]:pt-10 max-sm:px-4 max-sm:pb-12 max-sm:pt-7.5">
      <PageHeader
        eyebrow="Overview"
        title={`Good to see you, @${data.profile.username}.`}
        description="Your creator presence, community, and updates at a glance."
      />

      <section className="relative grid min-h-95 grid-cols-[minmax(0,1fr)_300px] items-center gap-11 overflow-hidden rounded-3xl border border-[#d9d1ff] bg-[#faf9ff] p-10.5 max-[1180px]:grid-cols-[1fr_260px] max-[1180px]:p-8.5 max-[900px]:grid-cols-1 max-sm:min-h-0 max-sm:gap-7 max-sm:rounded-[20px] max-sm:px-5 max-sm:py-6.5">
        <AuraRipple
          className="absolute! -bottom-42.5 right-27.5 size-107.5 [&_i:nth-child(3)]:size-105"
          tone="lilac"
        />
        <div className="relative z-1 [&>h2]:mt-4.5 [&>h2]:text-[clamp(34px,4vw,46px)] [&>h2]:font-semibold [&>p]:mt-3 [&>p]:text-[17px] [&>p]:text-secondary max-sm:[&>h2]:text-4xl">
          <StatusBadge tone="success">
            <Check size={14} /> Setup complete
          </StatusBadge>
          <h2>You’re ready to BeSeen.</h2>
          <p>Your account, messaging key, and Aura identity are active.</p>
          <p className="!max-w-162.5 !text-sm !text-muted">
            Share your username so people can discover your Aura and start
            joining the community around you.
          </p>
          <div className="mt-6 flex max-w-162.5 items-center justify-between gap-3 rounded-[14px] border border-border bg-white py-2 pl-4 pr-2 [&>span]:min-w-0 [&>span]:overflow-hidden [&>span]:text-ellipsis [&>span]:whitespace-nowrap [&>span]:text-sm [&>span]:font-semibold max-sm:flex-col max-sm:items-stretch max-sm:p-3.5 max-sm:[&_button]:min-h-9.5 max-sm:[&_button]:px-3 max-sm:[&_button]:text-xs max-sm:[&>span]:whitespace-normal max-sm:[&>span]:break-all">
            <span>{profileUrl}</span>
            <CopyButton value={profileUrl} />
          </div>
          <div className="mt-4.5 flex flex-wrap gap-2.5 max-sm:w-full max-sm:[&>*]:w-full">
            <Button
              icon={<Share2 size={18} />}
              onClick={async () => {
                if (navigator.share) {
                  await navigator.share({
                    title: 'My BeSeen Aura',
                    url: profileUrl,
                  });
                } else {
                  await navigator.clipboard.writeText(profileUrl);
                  toast(
                    'Aura link copied',
                    'Share it wherever your community follows you.',
                  );
                }
              }}
            >
              Share your Aura
            </Button>
            <Link
              className="inline-flex min-h-11.5 items-center justify-center gap-2.25 rounded-xl border border-border bg-white px-5 font-semibold text-navy transition hover:-translate-y-px hover:border-[#a9c2ca] hover:bg-subtle"
              href="/dashboard/broadcasts"
            >
              <Radio size={18} /> Send a broadcast
            </Link>
          </div>
        </div>
        <div className="relative z-1 rounded-[18px] border border-[#5949b5]/15 bg-white p-7 shadow-[0_10px_24px_rgb(11_11_63/5%)] max-[900px]:max-w-90 [&>span]:text-[11px] [&>span]:font-bold [&>span]:uppercase [&>span]:tracking-[0.08em] [&>span]:text-muted [&>strong]:mt-2 [&>strong]:block [&>strong]:text-[26px] [&>p]:mt-1.5 [&>p]:text-xs [&>p]:text-success [&>a]:mt-7 [&>a]:flex [&>a]:items-center [&>a]:gap-1.5 [&>a]:text-[13px] [&>a]:font-semibold [&>a]:text-brand">
          <span>Your public Aura</span>
          <strong>@{data.profile.username}</strong>
          <p>Visible • Active • Ready to share</p>
          <Link href="/dashboard/profile">
            View creator info <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>

      <section
        className="mt-5 grid grid-cols-4 gap-4 max-[1180px]:grid-cols-2 max-sm:grid-cols-1"
        aria-label="Creator summary"
      >
        <StatCard
          label="Aura holders"
          value={String(data.stats.auraHolders)}
          meta="+12 this month"
          tone="lilac"
          icon={UsersRound}
        />
        <StatCard
          label="Current Aura price"
          value={`${data.stats.auraPrice.amount} ${data.stats.auraPrice.asset}`}
          meta="Mock market value"
          tone="lime"
          icon={WalletCards}
        />
        <StatCard
          label="Bounty messages"
          value={String(data.stats.bountyMessages)}
          meta="Waiting for reply"
          tone="peach"
          icon={Bell}
        />
        <StatCard
          label="Broadcasts sent"
          value={String(data.stats.broadcastsSent)}
          meta="All time"
          tone="blue"
          icon={Radio}
        />
      </section>

      <div className="mt-5 grid grid-cols-[minmax(300px,0.8fr)_minmax(430px,1.2fr)] gap-5 max-[900px]:grid-cols-1">
        <section className="rounded-2xl border border-border bg-white p-7 max-sm:p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <span className="mb-1.25 inline-block text-xs font-bold uppercase tracking-[0.09em] text-brand">
                Get momentum
              </span>
              <h2 className="text-[23px] font-semibold">Quick start</h2>
            </div>
            <Sparkles className="text-[#6a58ce]" size={21} />
          </div>
          <div className="grid [&>*]:flex [&>*]:min-h-17.5 [&>*]:items-center [&>*]:gap-3.25 [&>*]:border-t [&>*]:border-[#edf2f4] [&>*]:py-3 [&>*:first-child]:border-t-0 [&_svg]:w-5 [&_svg]:text-muted [&_span]:flex [&_span]:flex-col [&_span]:text-xs [&_span]:text-muted [&_strong]:text-sm [&_strong]:text-navy">
            <div>
              <Check className="rounded-full bg-success-bg p-0.75 !text-success" />
              <span>
                <strong>Share your profile</strong>Your link is ready to promote
              </span>
            </div>
            <Link href="/dashboard/broadcasts">
              <Circle />
              <span>
                <strong>Publish your first broadcast</strong>Update every Aura
                holder
              </span>
            </Link>
            <div>
              <Circle />
              <span>
                <strong>Invite early supporters</strong>Start with the people
                who know your work
              </span>
            </div>
            <div className="opacity-70">
              <Circle />
              <span>
                <strong>Messenger coming soon</strong>Private bounty messages
                are in development
              </span>
            </div>
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-white p-7 max-sm:p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <span className="mb-1.25 inline-block text-xs font-bold uppercase tracking-[0.09em] text-brand">
                Latest signals
              </span>
              <h2 className="text-[23px] font-semibold">Recent activity</h2>
            </div>
            <Link
              className="text-[13px] font-semibold text-brand"
              href="/dashboard/profile"
            >
              View all
            </Link>
          </div>
          <ActivityList activity={data.activity} limit={5} />
        </section>
      </div>
    </div>
  );
}
