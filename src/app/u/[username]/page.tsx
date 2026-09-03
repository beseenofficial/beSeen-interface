'use client';

import {
  Check,
  LayoutGrid,
  LogIn,
  RadioTower,
  Send,
  Share2,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { useAvatarPalette } from '@/components/discover/use-avatar-palette';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { BrandLogo } from '@/components/ui/brand-logo';
import { OwnProfileEditor } from '@/components/profile/own-profile-editor';
import { ErrorState, SecureLoadingScreen } from '@/components/ui/states';
import { ApiError, messengerApi, profileApi, tokenApi } from '@/lib/api';
import { useAuth } from '@/lib/blux';
import {
  invalidateData,
  subscribeToInvalidation,
} from '@/lib/data-invalidation';
import { cn } from '@/lib/utils';
import type { FollowCounts, PublicUser } from '@/types';

const ACTION_BASE =
  'inline-flex items-center justify-center gap-2 rounded-full text-[15px] font-semibold tracking-[-0.01em] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:not-disabled:-translate-y-px active:not-disabled:translate-y-0';
const PRIMARY_ACTION = `${ACTION_BASE} group min-h-12 bg-[#22252a] px-6 text-white shadow-[0_1px_2px_rgb(11_11_63/16%),0_12px_26px_-12px_rgb(11_11_63/38%)] hover:bg-brand hover:shadow-[0_2px_3px_rgb(16_69_245/18%),0_14px_28px_-12px_rgb(16_69_245/48%)]`;
const SECONDARY_ACTION = `${ACTION_BASE} min-h-11 border border-transparent bg-transparent px-4 font-medium text-secondary hover:border-hairline/70 hover:bg-white/80 hover:text-navy`;
const HEADER_ACTION = `${ACTION_BASE} min-h-10 border border-transparent bg-transparent px-3.5 text-secondary hover:border-hairline hover:bg-white hover:text-navy max-sm:px-3`;

function ValueSkeleton({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block animate-pulse rounded bg-[#eef3f6]',
        className,
      )}
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

function SignalMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'public-profile-signal-mark inline-block shrink-0 bg-brand',
        className,
      )}
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
      <span
        className="mt-[9px] block h-px w-2 bg-[#b9c9d6]"
        aria-hidden="true"
      />
      <span className="text-[13px] font-medium leading-5 text-secondary">
        {label}
      </span>
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
            {unit ? (
              <span className="ml-1 text-[10px] font-medium text-muted">
                {unit}
              </span>
            ) : null}
          </>
        )}
      </strong>
    </div>
  );
}

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const auth = useAuth();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [followCounts, setFollowCounts] = useState<FollowCounts | null>(null);
  const [following, setFollowing] = useState(false);
  const [followingBusy, setFollowingBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [countsLoading, setCountsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [countsError, setCountsError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const formatCount = (value: number | undefined) =>
    value === undefined ? '—' : value.toLocaleString();
  const [bannerPrimary, bannerSecondary] = useAvatarPalette(
    profile?.avatar ?? null,
    profile?.id || profile?.username || username,
  );

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      let loadedProfile = await profileApi.public(username);
      if (
        loadedProfile.broadcastCount === undefined ||
        loadedProfile.messageCount === undefined ||
        loadedProfile.totalBountyReceivedUsdc === undefined
      ) {
        loadedProfile = await profileApi.public(username);
      }
      setProfile(loadedProfile);
    } catch (cause) {
      setProfile(null);
      setProfileError(
        cause instanceof ApiError &&
          (cause.status === 404 || cause.code === 'USER_NOT_FOUND')
          ? 'This BeSeen profile does not exist.'
          : cause instanceof Error
            ? cause.message
            : 'This BeSeen profile could not be loaded.',
      );
    } finally {
      setProfileLoading(false);
    }
  }, [username]);

  const loadFollowCounts = useCallback(async () => {
    setCountsLoading(true);
    setCountsError(null);
    try {
      setFollowCounts(await profileApi.followCounts(username));
    } catch (cause) {
      setFollowCounts(null);
      setCountsError(
        cause instanceof ApiError &&
          (cause.status === 404 || cause.code === 'USER_NOT_FOUND')
          ? 'Follow counts are unavailable because this user was not found.'
          : 'Follow counts could not be loaded.',
      );
    } finally {
      setCountsLoading(false);
    }
  }, [username]);

  useEffect(() => {
    void Promise.allSettled([loadProfile(), loadFollowCounts()]);
  }, [loadFollowCounts, loadProfile]);

  useEffect(
    () =>
      subscribeToInvalidation((detail) => {
        if (!detail.username || detail.username === username) {
          if (detail.resource === 'follow-counts') void loadFollowCounts();
          if (detail.resource === 'public-profile') void loadProfile();
        }
      }),
    [loadFollowCounts, loadProfile, username],
  );

  useEffect(() => {
    let active = true;
    setFollowing(false);
    setConversationId(null);

    if (!profile || !auth.user || auth.user.id === profile.id) {
      return () => {
        active = false;
      };
    }

    void tokenApi
      .mine()
      .then(async (holdings) => {
        if (active) {
          const ownsToken = holdings.some(
            (token) => token.owner.id === profile.id,
          );
          setFollowing(ownsToken);
          if (ownsToken) {
            const conversation = await messengerApi.findConversationWithUser(
              profile.id,
            );
            if (active) setConversationId(conversation?.id ?? null);
          }
        }
      })
      .catch((cause) => {
        if (active) {
          setActionError(
            cause instanceof Error
              ? cause.message
              : 'Your subscription status could not be loaded.',
          );
        }
      });

    return () => {
      active = false;
    };
  }, [auth.user, profile]);

  async function follow() {
    if (!profile || !auth.user || followingBusy) return;
    setFollowingBusy(true);
    setActionError(null);
    try {
      const result = await tokenApi.purchase(profile.username);
      setFollowing(true);
      setConversationId(result.conversation.id);
      invalidateData({ resource: 'follow-counts', username: profile.username });
      invalidateData({ resource: 'owned-tokens' });
      invalidateData({ resource: 'conversations' });
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : 'This profile could not be followed.',
      );
    } finally {
      setFollowingBusy(false);
    }
  }

  async function shareProfile(profileUrl: string) {
    const url = `${window.location.origin}/u/${profile?.username ?? username}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `@${username} on BeSeen`, url });
        return;
      } catch {
        return;
      }
    }
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (profileLoading) {
    return <SecureLoadingScreen label="Loading public profile…" />;
  }
  if (profileError && !profile) {
    return (
      <main className="min-h-svh bg-ice p-6">
        <div className="mx-auto max-w-[1480px]">
          <Link href="/login" aria-label="Go to BeSeen sign in">
            <BrandLogo />
          </Link>
          <ErrorState message={profileError} retry={() => void loadProfile()} />
        </div>
      </main>
    );
  }
  if (!profile) return null;

  const ownProfile = auth.user?.id === profile.id;
  const bannerGradient = `linear-gradient(135deg, ${bannerPrimary}, ${bannerSecondary})`;
  const joined = new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(profile.createdAt));
  const profileUrl = `app.beseen.fi/u/${profile.username}`;
  const followingLabel = following ? 'Subscribed' : 'Subscribe to broadcasts';
  const siteCta = !auth.user
    ? { href: '/login', label: 'Join BeSeen', icon: LogIn }
    : ownProfile
      ? { href: '/dashboard', label: 'Go to dashboard', icon: LayoutGrid }
      : {
          href: `/u/${auth.user.username}`,
          label: 'My profile',
          icon: UserRound,
        };
  const SiteCtaIcon = siteCta.icon;
  const messengerHref = conversationId
    ? `/dashboard/messenger?conversation=${encodeURIComponent(conversationId)}`
    : '/dashboard/messenger';

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-[#f3f7fa] px-4 py-5 text-navy sm:px-7 sm:py-6 lg:px-[clamp(32px,5vw,80px)]">
      <div className="relative mx-auto flex w-full max-w-[1000px] flex-col">
        <header className="flex min-h-11 shrink-0 items-center justify-between gap-4 px-1 sm:px-2">
          <div className="flex min-w-0 items-center gap-2.5 max-sm:gap-1.5">
            <Link
              className="shrink-0"
              href={auth.user ? '/dashboard' : '/login'}
              aria-label="Go to BeSeen"
            >
              <BrandLogo className="w-[146px] max-sm:w-[90px]" />
            </Link>
            <span className="shrink-0 text-[34px] font-semibold leading-none tracking-[-0.03em] text-brand max-sm:text-[21px]">
              Profile
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`${HEADER_ACTION} cursor-pointer`}
              onClick={() => void shareProfile(profileUrl)}
              type="button"
              aria-label={copied ? 'Profile link copied' : 'Share profile'}
            >
              {copied ? (
                <Check size={18} aria-hidden="true" />
              ) : (
                <Share2 size={18} aria-hidden="true" />
              )}
              <span className="max-sm:hidden">
                {copied ? 'Copied' : 'Share'}
              </span>
            </button>
            {/* The label is hidden on the narrowest screens, so the link carries its own name. */}
            <Link
              className={HEADER_ACTION}
              href={siteCta.href}
              aria-label={siteCta.label}
            >
              <SiteCtaIcon size={18} aria-hidden="true" />
              <span className="max-[430px]:hidden">{siteCta.label}</span>
            </Link>
          </div>
        </header>

        <section className="public-profile-card relative mt-4 min-w-0 rounded-[24px] border border-[#d9e1f0] bg-white p-3 shadow-[0_14px_40px_-6px_rgba(35,58,115,0.10)] sm:p-4">
          {/* Hero band generated from the profile photo itself: blurred into atmosphere over the extracted palette, inset like the Aura card's cover. */}
          <div
            className="public-profile-banner relative h-[clamp(128px,14vw,152px)] overflow-hidden rounded-[14px] shadow-[inset_0_0_0_1px_rgba(11,11,63,0.05)] sm:rounded-[16px]"
            style={{ backgroundImage: bannerGradient }}
            aria-hidden="true"
          >
            {profile.avatar ? (
              <img
                className="size-full scale-125 object-cover opacity-75 blur-2xl saturate-150"
                src={profile.avatar}
                alt=""
              />
            ) : null}
            <span className="absolute inset-0 bg-white/15" />
            <span className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.12),transparent_45%,rgba(11,11,63,0.10))]" />
            <SignalMark className="absolute right-5 top-5 bg-white/90 drop-shadow-sm" />
          </div>

          <div className="relative grid min-w-0 px-2 pb-6 pt-0 sm:px-6 sm:pb-7 xl:grid-cols-[minmax(0,1fr)_248px] xl:gap-8 xl:px-11 xl:pb-7">
            <div className="public-profile-main relative z-10 min-w-0">
              <div className="public-profile-identity relative min-w-0">
                <div className="relative z-10 -mt-13 w-fit sm:-mt-15 xl:-mt-17">
                  <span className="inline-flex w-fit shrink-0 overflow-hidden rounded-full bg-white p-1.5 leading-none">
                    <Avatar
                      username={profile.username}
                      src={profile.avatar}
                      size="xxl"
                      className="public-profile-avatar size-28 text-[34px] sm:size-30 sm:text-[36px] xl:size-34 xl:text-[40px]"
                    />
                  </span>
                  {profile.verification?.isVerified ? (
                    <span className="absolute bottom-0 right-0 grid size-10 place-items-center rounded-full bg-white shadow-raised max-sm:size-8">
                      <VerificationBadge
                        verification={profile.verification}
                        size={22}
                        className="max-sm:size-4.5"
                      />
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 min-w-0">
                  <h1 className="public-profile-name min-w-0 text-[clamp(40px,5vw,60px)] font-semibold leading-[0.96] tracking-[-0.035em] [overflow-wrap:anywhere]">
                    @{profile.username}
                  </h1>

                  {profile.bio?.trim() ? (
                    <p className="public-profile-tagline mt-3 max-w-[38ch] break-words text-[18px] leading-[1.5] text-secondary">
                      {profile.bio}
                    </p>
                  ) : null}

                  <p className="public-profile-followers mt-3.5 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-[15px] font-medium leading-6 text-secondary">
                    <InlineStat
                      label="Followers"
                      value={followCounts?.followerCount}
                      loading={countsLoading}
                    />
                    <span aria-hidden="true" className="text-[#a3b1c6]">
                      ·
                    </span>
                    <InlineStat
                      label="Following"
                      value={followCounts?.followingCount}
                      loading={countsLoading}
                    />
                  </p>

                  {countsError && (
                    <p
                      className="mt-3 flex flex-wrap items-center gap-2 text-sm text-error"
                      role="alert"
                    >
                      {countsError}
                      <button
                        className="font-semibold underline underline-offset-3"
                        onClick={() => void loadFollowCounts()}
                        type="button"
                      >
                        Retry
                      </button>
                    </p>
                  )}

                  {actionError && (
                    <p className="mt-4 text-sm text-error" role="alert">
                      {actionError}
                    </p>
                  )}

                  <div className="public-profile-actions mt-5 flex flex-wrap items-center gap-2 max-sm:grid max-sm:grid-cols-1">
                    {!auth.user ? (
                      <Link className={PRIMARY_ACTION} href="/login">
                        <Send
                          className="text-aqua transition-colors group-hover:text-white"
                          size={18}
                          strokeWidth={1.9}
                          aria-hidden="true"
                        />{' '}
                        Sign in to message
                      </Link>
                    ) : ownProfile ? (
                      <Link
                        className={PRIMARY_ACTION}
                        href="/dashboard/messenger"
                      >
                        <Send
                          className="text-aqua transition-colors group-hover:text-white"
                          size={18}
                          strokeWidth={1.9}
                          aria-hidden="true"
                        />{' '}
                        Send message
                      </Link>
                    ) : following ? (
                      <Link className={PRIMARY_ACTION} href={messengerHref}>
                        <Send
                          className="text-aqua transition-colors group-hover:text-white"
                          size={18}
                          strokeWidth={1.9}
                          aria-hidden="true"
                        />{' '}
                        Open conversation
                      </Link>
                    ) : (
                      <button
                        className={`${PRIMARY_ACTION} cursor-pointer disabled:cursor-wait disabled:opacity-65`}
                        disabled={followingBusy}
                        onClick={() => void follow()}
                        type="button"
                      >
                        <Send
                          className="text-aqua transition-colors group-hover:text-white"
                          size={18}
                          strokeWidth={1.9}
                          aria-hidden="true"
                        />
                        {followingBusy
                          ? 'Preparing conversation…'
                          : 'Purchase token to message'}
                      </button>
                    )}

                    {!ownProfile && auth.user ? (
                      <button
                        className={`${SECONDARY_ACTION} cursor-pointer disabled:cursor-default disabled:opacity-65`}
                        disabled={following || followingBusy}
                        onClick={() => void follow()}
                        type="button"
                      >
                        <RadioTower
                          size={18}
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                        {followingBusy ? 'Subscribing…' : followingLabel}
                      </button>
                    ) : ownProfile ? (
                      <OwnProfileEditor onUpdated={() => void loadProfile()} />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <aside className="public-profile-aside relative z-10 mt-7 min-w-0 border-t border-hairline/45 px-2 pb-1 pt-6 sm:max-w-[520px] sm:px-0 xl:mt-0 xl:flex xl:max-w-none xl:flex-col xl:justify-start xl:border-t-0 xl:px-0 xl:pb-0 xl:pt-21">
              <section className="public-profile-stats min-w-0">
                <div>
                  <h2 className="text-[18px] font-semibold tracking-[-0.02em]">
                    Activity
                  </h2>
                </div>

                <div className="mt-3">
                  <ActivityRegisterRow
                    label="Total messages"
                    value={formatCount(profile.messageCount)}
                    isEmpty={profile.messageCount === 0}
                  />
                  <ActivityRegisterRow
                    label="Broadcasts"
                    value={formatCount(profile.broadcastCount)}
                    isEmpty={profile.broadcastCount === 0}
                  />
                  <ActivityRegisterRow
                    label="Bounty earned"
                    value={profile.totalBountyReceivedUsdc ?? '—'}
                    unit={
                      profile.totalBountyReceivedUsdc !== undefined
                        ? 'USDC'
                        : undefined
                    }
                    isEmpty={Number(profile.totalBountyReceivedUsdc) === 0}
                  />
                  <ActivityRegisterRow label="Joined" value={joined} />
                </div>
              </section>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
