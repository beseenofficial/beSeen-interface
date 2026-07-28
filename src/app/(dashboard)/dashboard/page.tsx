'use client';

import {
  ArrowUpRight,
  Check,
  Inbox,
  KeyRound,
  Radio,
  Share2,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ActivityList } from '@/components/features/dashboard/activity-list';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/features/dashboard/stat-card';
import { AuraRipple } from '@/components/ui/aura-ripple';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { StatusBadge } from '@/components/ui/status-badge';
import { APP_URL } from '@/lib/constants';
import { getDecryptedFeed } from '@/lib/broadcasts';
import { useProfile } from '@/providers/profile-provider';
import { useToast } from '@/providers/toast-provider';
import type {
  CreatorActivity,
  DashboardOverview,
  DecryptedBroadcast,
} from '@/types';

function buildActivity(
  createdAt: string,
  sent: DecryptedBroadcast[],
  received: DecryptedBroadcast[],
): CreatorActivity[] {
  const activity: CreatorActivity[] = [
    {
      id: 'account-created',
      type: 'account_created',
      title: 'BeSeen account created',
      description: 'Your profile and secure BeSeen identity are ready.',
      createdAt,
    },
    ...sent.map((item) => ({
      id: `sent-${item.id}`,
      type: 'broadcast_published' as const,
      title: 'Encrypted broadcast published',
      description: item.content?.slice(0, 90),
      createdAt: item.publishedAt,
    })),
    ...received.map((item) => ({
      id: `received-${item.id}`,
      type: 'broadcast_received' as const,
      title: `Verified broadcast from @${item.creator.username}`,
      description: item.content?.slice(0, 90),
      createdAt: item.publishedAt,
    })),
  ];
  return activity.sort(
    (first, second) =>
      new Date(second.createdAt).getTime() -
      new Date(first.createdAt).getTime(),
  );
}

export default function OverviewPage() {
  const { profile } = useProfile();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!profile) return;
    setError(null);
    try {
      const [sent, received] = await Promise.all([
        getDecryptedFeed('sent', profile, undefined, 50),
        getDecryptedFeed('received', profile, undefined, 50),
      ]);
      setData({
        profile,
        sent: sent.items,
        received: received.items,
        sentHasMore: sent.hasMore,
        receivedHasMore: received.hasMore,
        activity: buildActivity(profile.createdAt, sent.items, received.items),
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'We could not load your profile overview.',
      );
    }
  }, [profile]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState message={error} retry={() => void load()} />;
  if (!data) return <LoadingState label="Loading your encrypted activity…" />;

  const profileUrl = `${APP_URL}/${data.profile.username}`;
  const countLabel = (count: number, more: boolean) =>
    `${count.toLocaleString()}${more ? '+' : ''}`;

  return (
    <div className="mx-auto w-full max-w-360 px-12 pb-16 pt-12 max-[1180px]:px-8 max-[1180px]:pb-14 max-[1180px]:pt-10 max-sm:px-4 max-sm:pb-12 max-sm:pt-7.5">
      <PageHeader
        eyebrow="overview"
        title={`Good to see you, ${data.profile.displayName}.`}
        description="Your BeSeen profile and end-to-end encrypted activity at a glance."
      />

      <section className="relative grid min-h-95 grid-cols-[minmax(0,1fr)_300px] items-center gap-11 overflow-hidden rounded-3xl border border-[#d9d1ff] bg-[#faf9ff] p-10.5 max-[1180px]:grid-cols-[1fr_260px] max-[1180px]:p-8.5 max-[900px]:grid-cols-1 max-sm:min-h-0 max-sm:gap-7 max-sm:rounded-[20px] max-sm:px-5 max-sm:py-6.5">
        <AuraRipple
          className="absolute! -bottom-42.5 right-27.5 size-107.5 [&_i:nth-child(3)]:size-105"
          tone="lilac"
        />
        <div className="relative z-1 [&>h2]:mt-4.5 [&>h2]:text-[clamp(34px,4vw,46px)] [&>h2]:font-semibold [&>p]:mt-3 [&>p]:text-[17px] [&>p]:text-secondary max-sm:[&>h2]:text-4xl">
          <StatusBadge tone="success">
            <ShieldCheck size={14} /> Testnet session active
          </StatusBadge>
          <h2>Your BeSeen identity is ready.</h2>
          <p>
            Signed in as a {data.profile.accountType} account with local
            encrypted identity keys.
          </p>
          <p className="!max-w-162.5 !text-sm !text-muted">
            Broadcast content is never sent in plaintext. Every feed item is
            verified before decryption.
          </p>
          <div className="mt-6 flex max-w-162.5 items-center justify-between gap-3 rounded-[14px] border border-border bg-white py-2 pl-4 pr-2 max-sm:flex-col max-sm:items-stretch max-sm:p-3.5">
            <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold max-sm:break-all max-sm:whitespace-normal">
              {profileUrl}
            </span>
            <CopyButton value={profileUrl} />
          </div>
          <div className="mt-4.5 flex flex-wrap gap-2.5 max-sm:w-full max-sm:[&>*]:w-full">
            <Button
              icon={<Share2 size={18} />}
              onClick={async () => {
                if (navigator.share) {
                  await navigator.share({
                    title: 'My BeSeen profile',
                    url: profileUrl,
                  });
                } else {
                  await navigator.clipboard.writeText(profileUrl);
                  toast('Profile link copied', 'It is ready to share.');
                }
              }}
            >
              Share profile
            </Button>
            <Link
              className="inline-flex min-h-11.5 items-center justify-center gap-2.25 rounded-xl border border-border bg-white px-5 font-semibold text-navy transition hover:-translate-y-px hover:border-[#a9c2ca] hover:bg-subtle"
              href="/dashboard/broadcasts"
            >
              {data.profile.accountType === 'creator' ? (
                <Radio size={18} />
              ) : (
                <Inbox size={18} />
              )}
              {data.profile.accountType === 'creator'
                ? 'Send a broadcast'
                : 'Open received feed'}
            </Link>
          </div>
        </div>
        <div className="relative z-1 rounded-[18px] border border-[#5949b5]/15 bg-white p-7 shadow-[0_10px_24px_rgb(11_11_63/5%)]">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
            Public profile
          </span>
          <strong className="mt-2 block text-[26px]">
            @{data.profile.username}
          </strong>
          <p className="mt-1.5 text-xs text-success">
            {data.profile.accountType} · active · Testnet
          </p>
        </div>
      </section>

      <section
        className="mt-5 grid grid-cols-4 gap-4 max-[1180px]:grid-cols-2 max-sm:grid-cols-1"
        aria-label="BeSeen account summary"
      >
        <StatCard
          label="Account type"
          value={data.profile.accountType}
          meta="Your current profile setting"
          tone="lilac"
          icon={UserRound}
        />
        <StatCard
          label="Sent broadcasts"
          value={countLabel(data.sent.length, data.sentHasMore)}
          meta="Verified and decrypted"
          tone="blue"
          icon={Radio}
        />
        <StatCard
          label="Received broadcasts"
          value={countLabel(data.received.length, data.receivedHasMore)}
          meta="Verified and decrypted"
          tone="peach"
          icon={Inbox}
        />
        <StatCard
          label="Key protocol"
          value="v1"
          meta="Ed25519 + X25519"
          tone="lime"
          icon={KeyRound}
        />
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-white p-7 max-sm:p-5">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <span className="mb-1.25 inline-block text-xs font-bold uppercase tracking-[0.09em] text-brand">
              Verified timeline
            </span>
            <h2 className="text-[23px] font-semibold">Recent activity</h2>
          </div>
          {/* <StatusBadge tone="success">
            <Check size={13} /> API synced
          </StatusBadge> */}
        </div>
        <ActivityList activity={data.activity} limit={8} />
      </section>
    </div>
  );
}
