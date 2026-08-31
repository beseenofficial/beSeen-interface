'use client';

import {
  CalendarDays,
  Check,
  CircleDollarSign,
  LayoutDashboard,
  LogIn,
  MessageCircleMore,
  RadioTower,
  Send,
  Share2,
  UserRound,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { BrandLogo } from '@/components/ui/brand-logo';
import { OwnProfileEditor } from '@/components/profile/own-profile-editor';
import { ErrorState, SecureLoadingScreen } from '@/components/ui/states';
import { ApiError, messengerApi, profileApi, tokenApi } from '@/lib/api';
import { useAuth } from '@/lib/blux';
import { invalidateData, subscribeToInvalidation } from '@/lib/data-invalidation';
import { formatUsdc } from '@/lib/decimal';
import type { FollowCounts, PublicUser } from '@/types';

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
  const formatCount = (value: number | undefined) => value === undefined ? '—' : value.toLocaleString();

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
        cause instanceof ApiError && (cause.status === 404 || cause.code === 'USER_NOT_FOUND')
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
        cause instanceof ApiError && (cause.status === 404 || cause.code === 'USER_NOT_FOUND')
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
          const ownsToken = holdings.some((token) => token.owner.id === profile.id);
          setFollowing(ownsToken);
          if (ownsToken) {
            const conversation = await messengerApi.findConversationWithUser(profile.id);
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
  const joined = new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(profile.createdAt));
  const profileUrl = `app.beseen.fi/u/${profile.username}`;
  const followingLabel = following ? 'Subscribed' : 'Subscribe to broadcasts';
  const siteCta = !auth.user
    ? { href: '/login', label: 'Join BeSeen', icon: LogIn }
    : ownProfile
      ? { href: '/dashboard', label: 'Go to dashboard', icon: LayoutDashboard }
      : { href: `/u/${auth.user.username}`, label: 'My profile', icon: UserRound };
  const SiteCtaIcon = siteCta.icon;
  const messengerHref = conversationId
    ? `/dashboard/messenger?conversation=${encodeURIComponent(conversationId)}`
    : '/dashboard/messenger';

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-[#f6fafc] px-4 py-5 text-navy sm:px-7 lg:px-[clamp(42px,6.5vw,112px)] lg:py-[clamp(18px,3vh,36px)]">
      <Image
        className="pointer-events-none absolute -bottom-28 -left-28 w-[360px] select-none opacity-10 max-md:hidden"
        src="/brand/beseen-brand-rays.svg"
        width={460}
        height={310}
        alt=""
      />

      <div className="relative mx-auto flex min-h-[calc(100svh-40px)] w-full max-w-[1480px] flex-col lg:min-h-[calc(100svh-clamp(36px,6vh,72px))]">
        <header className="flex min-h-14 shrink-0 items-center justify-between gap-4">
          <Link
            href={auth.user ? '/dashboard' : '/login'}
            aria-label="Go to BeSeen"
          >
            <BrandLogo className="w-[146px] max-sm:w-[128px]" />
          </Link>
          <div className="flex items-center gap-2.5">
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full bg-brand px-5 text-[14px] font-semibold text-white shadow-[0_8px_22px_rgb(16_69_245/18%)] transition hover:-translate-y-px hover:bg-[#0c3bd6] max-sm:px-4"
              href={siteCta.href}
            >
              <SiteCtaIcon size={18} aria-hidden="true" />
              <span className="max-[430px]:hidden">{siteCta.label}</span>
            </Link>
            <button
              className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-3 rounded-full border border-border bg-white px-5 text-[15px] font-semibold shadow-[0_7px_22px_rgb(11_11_63/5%)] transition hover:-translate-y-px hover:border-[#becfd6] max-sm:px-4"
              onClick={() => void shareProfile(profileUrl)}
              type="button"
              aria-label={copied ? 'Profile link copied' : 'Share profile'}
            >
              {copied ? (
                <Check size={20} aria-hidden="true" />
              ) : (
                <Share2 size={20} aria-hidden="true" />
              )}
              <span className="max-sm:hidden">{copied ? 'Copied' : 'Share'}</span>
            </button>
          </div>
        </header>

        <section className="public-profile-card relative mt-7 grid min-w-0 overflow-hidden rounded-[28px] border border-white bg-white/90 shadow-[0_22px_65px_rgb(25_58_87/10%)] backdrop-blur-sm min-[1000px]:min-h-0 min-[1000px]:flex-1 min-[1000px]:grid-cols-[minmax(0,1fr)_minmax(300px,38%)] min-[1000px]:gap-[clamp(24px,3vw,64px)] min-[1000px]:px-[clamp(28px,3.5vw,68px)] min-[1000px]:py-[clamp(30px,5vh,62px)] max-[999px]:gap-10 max-[999px]:px-7 max-[999px]:py-9 max-sm:mt-5 max-sm:gap-8 max-sm:rounded-[22px] max-sm:px-5 max-sm:py-7">
          <Image
            className="pointer-events-none absolute -top-[278px] left-[24%] w-[640px] max-w-none select-none opacity-75 max-[999px]:-top-[330px] max-[999px]:left-[8%] max-sm:-top-[350px] max-sm:-left-24"
            src="/brand/beseen-aura-ripple-signature.svg"
            width={640}
            height={640}
            priority
            alt=""
          />

          <div className="public-profile-main relative z-10 flex min-w-0 flex-col justify-end pb-1 min-[1000px]:pt-2 max-[999px]:pt-12 max-sm:pt-16">
            <span className="inline-flex w-fit shrink-0 overflow-hidden rounded-full border-4 border-white bg-white leading-none shadow-[0_13px_30px_rgb(11_11_63/12%)]">
              <Avatar
                username={profile.username}
                src={profile.avatar}
                size="xxl"
                className="public-profile-avatar size-[158px] text-[45px] max-sm:size-[118px] max-sm:text-[36px]"
              />
            </span>

            <div className="public-profile-name mt-7 flex min-w-0 flex-wrap items-center gap-3">
              <h1 className="min-w-0 break-all text-[clamp(38px,4.7vw,61px)] font-semibold tracking-[-0.05em]">
                @{profile.username}
              </h1>
              <VerificationBadge verification={profile.verification} size={28} />
            </div>

            {profile.bio?.trim() ? (
              <p className="public-profile-tagline mt-3 max-w-[65ch] break-words text-[18px] font-medium text-secondary max-sm:text-base">
                {profile.bio}
              </p>
            ) : null}

            <dl className="public-profile-followers mt-7 grid max-w-155 grid-cols-3 overflow-hidden rounded-2xl border border-border bg-white/75 text-center">
              <div className="min-w-0 px-3 py-4">
                <dt className="text-xs text-muted">Followers</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">{countsLoading ? '—' : followCounts?.followerCount.toLocaleString() ?? '—'}</dd>
              </div>
              <div className="min-w-0 border-x border-border px-3 py-4">
                <dt className="text-xs text-muted">Following</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">{countsLoading ? '—' : followCounts?.followingCount.toLocaleString() ?? '—'}</dd>
              </div>
              <div className="min-w-0 px-3 py-4">
                <dt className="text-xs text-muted">Broadcasts</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">{formatCount(profile.broadcastCount)}</dd>
              </div>
            </dl>

            {countsError && (
              <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-error" role="alert">
                {countsError}
                <button className="font-semibold underline underline-offset-3" onClick={() => void loadFollowCounts()} type="button">Retry</button>
              </p>
            )}

            {actionError && (
              <p className="mt-4 text-sm text-error" role="alert">
                {actionError}
              </p>
            )}

            <div className="public-profile-actions mt-8 flex flex-wrap gap-5 max-sm:grid max-sm:grid-cols-1">
              {!auth.user ? (
                <Link
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-brand px-7 text-[16px] font-semibold text-white shadow-[0_10px_24px_rgb(16_69_245/18%)] transition hover:-translate-y-px hover:bg-[#0c3bd6]"
                  href="/login"
                >
                  <Send size={20} aria-hidden="true" /> Sign in to message
                </Link>
              ) : ownProfile ? (
                <Link
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-brand px-7 text-[16px] font-semibold text-white shadow-[0_10px_24px_rgb(16_69_245/18%)] transition hover:-translate-y-px hover:bg-[#0c3bd6]"
                  href="/dashboard/messenger"
                >
                  <Send size={20} aria-hidden="true" /> Open Messenger
                </Link>
              ) : following ? (
                <Link
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-brand px-7 text-[16px] font-semibold text-white shadow-[0_10px_24px_rgb(16_69_245/18%)] transition hover:-translate-y-px hover:bg-[#0c3bd6]"
                  href={messengerHref}
                >
                  <Send size={20} aria-hidden="true" /> Open conversation
                </Link>
              ) : (
                <button
                  className="inline-flex min-h-14 cursor-pointer items-center justify-center gap-3 rounded-xl border-0 bg-brand px-7 text-[16px] font-semibold text-white shadow-[0_10px_24px_rgb(16_69_245/18%)] transition hover:-translate-y-px hover:bg-[#0c3bd6] disabled:cursor-wait disabled:opacity-65"
                  disabled={followingBusy}
                  onClick={() => void follow()}
                  type="button"
                >
                  <Send size={20} aria-hidden="true" />
                  {followingBusy ? 'Preparing conversation…' : 'Purchase token to message'}
                </button>
              )}

              {!ownProfile && auth.user ? (
                <button
                  className="inline-flex min-h-14 cursor-pointer items-center justify-center gap-3 rounded-xl border border-border bg-white px-7 text-[16px] font-semibold transition hover:-translate-y-px hover:border-[#b7cbd3] hover:bg-subtle disabled:cursor-default disabled:opacity-65 disabled:hover:translate-y-0"
                  disabled={following || followingBusy}
                  onClick={() => void follow()}
                  type="button"
                >
                  <RadioTower size={20} aria-hidden="true" />
                  {followingBusy ? 'Subscribing…' : followingLabel}
                </button>
              ) : ownProfile ? (
                <OwnProfileEditor onUpdated={() => void loadProfile()} />
              ) : (
                <Link
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-border bg-white px-7 text-[16px] font-semibold transition hover:-translate-y-px hover:bg-subtle"
                  href="/login"
                >
                  <RadioTower size={20} aria-hidden="true" /> Subscribe to
                  broadcasts
                </Link>
              )}
            </div>
          </div>

          <aside className="public-profile-aside relative z-10 flex min-h-0 flex-col justify-end gap-6">
            <section className="public-profile-details rounded-[20px] border border-border/90 bg-white/76 p-8 shadow-[0_10px_28px_rgb(21_47_68/3%)] backdrop-blur-md max-sm:p-5">
              <h2 className="text-xl font-semibold">Profile details</h2>
              <dl className="mt-5">
                <div className="grid grid-cols-[34px_minmax(0,1fr)] items-center gap-3 pt-2">
                  <CalendarDays
                    className="text-secondary"
                    size={23}
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="text-sm text-muted">Joined</dt>
                    <dd className="text-sm font-semibold">{joined}</dd>
                  </div>
                </div>
              </dl>
            </section>

            <section className="public-profile-stats grid grid-cols-2 rounded-[20px] border border-border/90 bg-white/76 p-2 shadow-[0_10px_28px_rgb(21_47_68/3%)] backdrop-blur-md">
              <div className="grid justify-items-center gap-2 px-3 text-center">
                <span className="grid size-10 place-items-center rounded-full bg-info-bg text-brand">
                  <MessageCircleMore size={20} aria-hidden="true" />
                </span>
                <strong className="text-xl tabular-nums">{formatCount(profile.messageCount)}</strong>
                <span className="text-xs text-muted">Total messages</span>
              </div>
              <div className="grid justify-items-center gap-2 px-3 text-center">
                <span className="grid size-10 place-items-center rounded-full bg-info-bg text-brand">
                  <Send size={20} aria-hidden="true" />
                </span>
                <strong className="text-xl tabular-nums">{formatCount(profile.sentMessageCount)}</strong>
                <span className="text-xs text-muted">Sent messages</span>
              </div>
              <div className="mt-2 grid justify-items-center gap-2 border-t border-border px-3 pt-4 text-center">
                <span className="grid size-10 place-items-center rounded-full bg-aqua/20 text-[#168d99]">
                  <MessageCircleMore size={20} aria-hidden="true" />
                </span>
                <strong className="text-xl tabular-nums">{formatCount(profile.receivedMessageCount)}</strong>
                <span className="text-xs text-muted">Received messages</span>
              </div>
              <div className="mt-2 grid justify-items-center gap-2 border-t border-border px-3 pt-4 text-center">
                <span className="grid size-10 place-items-center rounded-full bg-success-bg text-success">
                  <CircleDollarSign size={20} aria-hidden="true" />
                </span>
                <strong className="max-w-full break-words text-base tabular-nums">{profile.totalBountyReceivedUsdc === undefined ? '—' : formatUsdc(profile.totalBountyReceivedUsdc)}</strong>
                <span className="text-xs text-muted">Bounty earned</span>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
