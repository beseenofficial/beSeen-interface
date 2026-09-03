'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAvatarPalette } from '@/components/discover/use-avatar-palette';
import { DashboardPage } from '@/components/layout/dashboard-page';
import { PageHeader } from '@/components/layout/page-header';
import { OwnProfileEditor } from '@/components/profile/own-profile-editor';
import { Avatar } from '@/components/ui/avatar';
import { LoadingState } from '@/components/ui/states';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { profileApi } from '@/lib/api';
import { useAuth } from '@/lib/blux';
import { cn } from '@/lib/utils';
import type { FollowCounts, PublicUserProfile } from '@/types';

function ValueSkeleton({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-block animate-pulse rounded bg-[#eef3f6]', className)}
      aria-hidden="true"
    />
  );
}

function InlineStat({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      {loading ? (
        <ValueSkeleton className="h-4 w-7 translate-y-[-1px]" />
      ) : (
        <strong className="font-semibold tabular-nums text-navy">
          {value === undefined ? '—' : value.toLocaleString()}
        </strong>
      )}
      <span className="text-secondary">{label}</span>
    </span>
  );
}

function SignalMark() {
  return (
    <span
      className="public-profile-signal-mark absolute right-5 top-5 inline-block shrink-0 bg-white/90 drop-shadow-sm"
      aria-hidden="true"
    />
  );
}

function ActivityRegisterRow({
  label,
  value,
  unit,
  isEmpty = false,
}: {
  label: string;
  value: string;
  unit?: string;
  isEmpty?: boolean;
}) {
  return (
    <div className="grid min-h-10 min-w-0 grid-cols-[10px_minmax(0,1fr)_auto] items-baseline gap-x-3 py-1.5">
      <span className="mt-[9px] block h-px w-2 bg-[#b9c9d6]" aria-hidden="true" />
      <span className="text-[13px] font-medium leading-5 text-secondary">{label}</span>
      <strong
        className={cn(
          'text-right text-[14px] leading-5 tabular-nums tracking-[-0.01em]',
          isEmpty ? 'font-normal text-muted/75' : 'font-semibold text-navy',
        )}
      >
        {isEmpty ? (
          'None yet'
        ) : (
          <>
            {value}
            {unit ? <span className="ml-1 text-[10px] font-medium text-muted">{unit}</span> : null}
          </>
        )}
      </strong>
    </div>
  );
}

export default function ProfilePage() {
  const auth = useAuth();
  const user = auth.user;
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [followCounts, setFollowCounts] = useState<FollowCounts | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [bannerPrimary, bannerSecondary] = useAvatarPalette(
    user?.avatar ?? null,
    user?.id || user?.username || 'profile',
  );

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setStatsLoading(true);
    const [profileResult, countsResult] = await Promise.allSettled([
      profileApi.public(user.username),
      profileApi.followCounts(user.username),
    ]);
    setProfile(profileResult.status === 'fulfilled' ? profileResult.value : null);
    setFollowCounts(countsResult.status === 'fulfilled' ? countsResult.value : null);
    setStatsLoading(false);
  }, [user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (!user || !auth.keys) {
    return <LoadingState label="Preparing your profile…" />;
  }

  const bannerGradient = `linear-gradient(135deg, ${bannerPrimary}, ${bannerSecondary})`;
  const joined = new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(user.createdAt));
  const formatCount = (value: number | undefined) =>
    value === undefined ? '—' : value.toLocaleString();

  return (
    <DashboardPage>
      <PageHeader
        className="mx-auto w-full max-w-[1000px]"
        eyebrow="Your account"
        title="Profile"
        description="Manage the profile people see on BeSeen."
        action={<OwnProfileEditor variant="filled" onUpdated={() => void loadProfile()} />}
      />

      <section className="public-profile-card relative mx-auto min-w-0 max-w-[1000px] rounded-[24px] border border-[#d9e1f0] bg-white p-3 shadow-[0_14px_40px_-6px_rgba(35,58,115,0.10)] sm:p-4">
        <div
          className="public-profile-banner relative h-[clamp(128px,14vw,152px)] overflow-hidden rounded-[14px] shadow-[inset_0_0_0_1px_rgba(11,11,63,0.05)] sm:rounded-[16px]"
          style={{ backgroundImage: bannerGradient }}
          aria-hidden="true"
        >
          {user.avatar ? (
            <img
              className="size-full scale-125 object-cover opacity-75 blur-2xl saturate-150"
              src={user.avatar}
              alt=""
            />
          ) : null}
          <span className="absolute inset-0 bg-white/15" />
          <span className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.12),transparent_45%,rgba(11,11,63,0.10))]" />
          <SignalMark />
        </div>

        <div className="relative grid min-w-0 px-2 pb-6 pt-0 sm:px-6 sm:pb-7 xl:grid-cols-[minmax(0,1fr)_248px] xl:gap-8 xl:px-11 xl:pb-7">
          <div className="public-profile-main relative z-10 min-w-0">
            <div className="public-profile-identity relative min-w-0">
              <div className="relative z-10 -mt-13 w-fit sm:-mt-15 xl:-mt-17">
                <span className="inline-flex w-fit shrink-0 overflow-hidden rounded-full bg-white p-1.5 leading-none">
                  <Avatar
                    username={user.username}
                    src={user.avatar}
                    size="xxl"
                    className="public-profile-avatar size-28 text-[34px] sm:size-30 sm:text-[36px] xl:size-34 xl:text-[40px]"
                  />
                </span>
                {user.verification?.isVerified ? (
                  <span className="absolute bottom-0 right-0 grid size-10 place-items-center rounded-full bg-white shadow-raised max-sm:size-8">
                    <VerificationBadge
                      verification={user.verification}
                      size={22}
                      className="max-sm:size-4.5"
                    />
                  </span>
                ) : null}
              </div>

              <div className="mt-4 min-w-0">
                <h2 className="public-profile-name min-w-0 text-[clamp(40px,5vw,60px)] font-semibold leading-[0.96] tracking-[-0.035em] [overflow-wrap:anywhere]">
                  @{user.username}
                </h2>

                {user.bio?.trim() ? (
                  <p className="public-profile-tagline mt-3 max-w-[38ch] break-words text-[18px] leading-[1.5] text-secondary">
                    {user.bio}
                  </p>
                ) : null}

                <p className="public-profile-followers mt-3.5 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-[15px] font-medium leading-6 text-secondary">
                  <InlineStat
                    label="Followers"
                    value={followCounts?.followerCount}
                    loading={statsLoading}
                  />
                  <span aria-hidden="true" className="text-[#a3b1c6]">·</span>
                  <InlineStat
                    label="Following"
                    value={followCounts?.followingCount}
                    loading={statsLoading}
                  />
                </p>
              </div>
            </div>
          </div>

          <aside className="public-profile-aside relative z-10 mt-7 min-w-0 border-t border-hairline/45 px-2 pb-1 pt-6 sm:max-w-[520px] sm:px-0 xl:mt-0 xl:flex xl:max-w-none xl:flex-col xl:justify-start xl:border-t-0 xl:px-0 xl:pb-0 xl:pt-21">
            <section className="public-profile-stats min-w-0">
              <h2 className="text-[18px] font-semibold tracking-[-0.02em]">Activity</h2>

              <div className="mt-3">
                <ActivityRegisterRow
                  label="Total messages"
                  value={formatCount(profile?.messageCount)}
                  isEmpty={profile?.messageCount === 0}
                />
                <ActivityRegisterRow
                  label="Broadcasts"
                  value={formatCount(profile?.broadcastCount)}
                  isEmpty={profile?.broadcastCount === 0}
                />
                <ActivityRegisterRow
                  label="Bounty earned"
                  value={profile?.totalBountyReceivedUsdc ?? '—'}
                  unit={profile?.totalBountyReceivedUsdc !== undefined ? 'USDC' : undefined}
                  isEmpty={Number(profile?.totalBountyReceivedUsdc) === 0}
                />
                <ActivityRegisterRow label="Joined" value={joined} />
              </div>
            </section>
          </aside>
        </div>
      </section>
    </DashboardPage>
  );
}
