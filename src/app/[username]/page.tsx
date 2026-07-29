'use client';

import {
  BadgeCheck,
  CalendarDays,
  Check,
  Copy,
  Flame,
  Globe2,
  MessageCircleMore,
  RadioTower,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { BrandLogo } from '@/components/ui/brand-logo';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { profileApi, tokenApi } from '@/lib/api';
import { useAuth } from '@/lib/blux';
import type { PublicUser } from '@/types';

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const auth = useAuth();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const [followingBusy, setFollowingBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [loadedProfile, count] = await Promise.all([
        profileApi.public(username),
        tokenApi.followerCount(username),
        tokenApi.profileToken(username),
      ]);
      setProfile(loadedProfile);
      setFollowerCount(count);
      if (auth.user && auth.user.id !== loadedProfile.id) {
        const holdings = await tokenApi.mine();
        setFollowing(
          holdings.some((token) => token.owner.id === loadedProfile.id),
        );
      } else {
        setFollowing(false);
      }
    } catch (cause) {
      setProfile(null);
      setError(
        cause instanceof Error
          ? cause.message
          : 'This BeSeen profile could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [auth.user, username]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function follow() {
    if (!profile || !auth.user || followingBusy) return;
    setFollowingBusy(true);
    setError(null);
    try {
      const result = await tokenApi.purchase(profile.username);
      setFollowing(true);
      if (result.created) setFollowerCount((count) => count + 1);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'This profile could not be followed.',
      );
    } finally {
      setFollowingBusy(false);
    }
  }

  async function shareProfile(profileUrl: string) {
    const url = `${window.location.origin}/${profile?.username ?? username}`;
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

  async function copyProfileLink(profileUrl: string) {
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (loading) return <LoadingState label="Loading public profile…" />;
  if (error && !profile) {
    return (
      <main className="min-h-svh bg-ice p-6">
        <div className="mx-auto max-w-[1480px]">
          <Link href="/login" aria-label="Go to BeSeen sign in">
            <BrandLogo />
          </Link>
          <ErrorState message={error} retry={() => void loadProfile()} />
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
  const profileUrl = `beseen.fi/${profile.username}`;
  const followingLabel = following ? 'Subscribed' : 'Subscribe to broadcasts';

  return (
    <main className="relative min-h-svh overflow-hidden bg-[#f6fafc] px-4 py-5 text-navy sm:px-7 lg:px-[clamp(42px,6.5vw,112px)] lg:py-[clamp(24px,4.5vh,46px)]">
      <Image
        className="pointer-events-none absolute -bottom-28 -left-28 w-[360px] select-none opacity-10 max-md:hidden"
        src="/brand/beseen-brand-rays.svg"
        width={460}
        height={310}
        alt=""
      />

      <div className="relative mx-auto w-full max-w-[1480px]">
        <header className="flex min-h-14 items-center justify-between gap-4">
          <Link
            href={auth.user ? '/dashboard' : '/login'}
            aria-label="Go to BeSeen"
          >
            <BrandLogo className="w-[146px] max-sm:w-[128px]" />
          </Link>
          <button
            className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-3 rounded-full border border-border bg-white px-6 text-[15px] font-semibold shadow-[0_7px_22px_rgb(11_11_63/5%)] transition hover:-translate-y-px hover:border-[#becfd6]"
            onClick={() => void shareProfile(profileUrl)}
            type="button"
          >
            {copied ? <Check size={20} aria-hidden="true" /> : <Share2 size={20} aria-hidden="true" />}
            {copied ? 'Copied' : 'Share'}
          </button>
        </header>

        <section className="relative mt-7 grid min-h-[720px] overflow-hidden rounded-[28px] border border-white bg-white/90 shadow-[0_22px_65px_rgb(25_58_87/10%)] backdrop-blur-sm min-[1000px]:grid-cols-[minmax(0,1fr)_486px] min-[1000px]:gap-[clamp(44px,6vw,88px)] min-[1000px]:px-[clamp(52px,4.4vw,68px)] min-[1000px]:py-[62px] max-[999px]:gap-10 max-[999px]:px-7 max-[999px]:py-9 max-sm:mt-5 max-sm:rounded-[22px] max-sm:px-5 max-sm:py-7">
          <Image
            className="pointer-events-none absolute -top-[278px] left-[24%] w-[640px] max-w-none select-none opacity-75 max-[999px]:-top-[330px] max-[999px]:left-[8%] max-sm:-top-[350px] max-sm:-left-24"
            src="/brand/beseen-aura-ripple-signature.svg"
            width={640}
            height={640}
            priority
            alt=""
          />

          <div className="relative z-10 flex min-w-0 flex-col justify-end pb-1 min-[1000px]:pt-2 max-[999px]:pt-12 max-sm:pt-16">
            <span className="w-fit rounded-full border-4 border-white bg-white shadow-[0_13px_30px_rgb(11_11_63/12%)]">
              <Avatar
                username={profile.username}
                src={profile.avatar}
                size="xxl"
                className="size-[158px] text-[45px] max-sm:size-[118px] max-sm:text-[36px]"
              />
            </span>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <h1 className="text-[clamp(42px,4.7vw,61px)] font-semibold tracking-[-0.05em]">
                @{profile.username}
              </h1>
              <BadgeCheck
                className="text-brand"
                size={28}
                aria-label="Verified BeSeen profile"
              />
            </div>

            <p className="mt-3 text-[18px] font-semibold text-secondary max-sm:text-base">
              Building in public. Creating value.
            </p>

            <p className="mt-7 flex flex-wrap items-center gap-3 text-[17px] font-semibold text-secondary">
              <Users size={20} aria-hidden="true" />
              <span>{followerCount} follower{followerCount === 1 ? '' : 's'}</span>
              <span className="text-muted" aria-hidden="true">•</span>
              <span>0 following</span>
            </p>

            <div className="mt-8 max-w-[800px] border-t border-border pt-7 text-[16px] leading-7 text-secondary">
              <p>Exploring ideas, building products, and sharing the journey.</p>
              <p>DM if you&apos;re building something interesting.</p>
            </div>

            {error && (
              <p className="mt-4 text-sm text-error" role="alert">
                {error}
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-5 max-sm:grid max-sm:grid-cols-1">
              <Link
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-brand px-7 text-[16px] font-semibold text-white shadow-[0_10px_24px_rgb(16_69_245/18%)] transition hover:-translate-y-px hover:bg-[#0c3bd6]"
                href={auth.user ? '/dashboard/messenger' : '/login'}
              >
                <Send size={20} aria-hidden="true" /> Send message
              </Link>

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
                <Link
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-border bg-white px-7 text-[16px] font-semibold transition hover:-translate-y-px hover:bg-subtle"
                  href="/dashboard/profile"
                >
                  <RadioTower size={20} aria-hidden="true" /> Manage profile
                </Link>
              ) : (
                <Link
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-border bg-white px-7 text-[16px] font-semibold transition hover:-translate-y-px hover:bg-subtle"
                  href="/login"
                >
                  <RadioTower size={20} aria-hidden="true" /> Subscribe to broadcasts
                </Link>
              )}
            </div>
          </div>

          <aside className="relative z-10 flex flex-col justify-end gap-6">
            <section className="rounded-[20px] border border-border/90 bg-white/76 p-8 shadow-[0_10px_28px_rgb(21_47_68/3%)] backdrop-blur-md max-sm:p-5">
              <h2 className="text-xl font-semibold">Profile details</h2>
              <dl className="mt-5 divide-y divide-border">
                <div className="grid grid-cols-[34px_minmax(0,1fr)_36px] items-center gap-3 py-4 first:pt-2">
                  <Globe2 className="text-brand" size={23} aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-sm font-semibold">Profile link</dt>
                    <dd className="truncate text-sm font-semibold text-brand">{profileUrl}</dd>
                  </div>
                  <button
                    className="grid size-9 cursor-pointer place-items-center rounded-lg text-secondary transition hover:bg-info-bg hover:text-brand"
                    onClick={() => void copyProfileLink(profileUrl)}
                    type="button"
                    aria-label="Copy profile link"
                  >
                    {copied ? <Check size={21} /> : <Copy size={21} />}
                  </button>
                </div>

                <div className="grid grid-cols-[34px_minmax(0,1fr)] items-center gap-3 py-4">
                  <CalendarDays className="text-secondary" size={23} aria-hidden="true" />
                  <div>
                    <dt className="text-sm text-muted">Joined</dt>
                    <dd className="text-sm font-semibold">{joined}</dd>
                  </div>
                </div>

                <div className="grid grid-cols-[34px_minmax(0,1fr)] items-center gap-3 py-4">
                  <ShieldCheck className="text-secondary" size={23} aria-hidden="true" />
                  <div>
                    <dt className="text-sm font-semibold">Verified with Blux</dt>
                    <dd className="text-sm text-muted">Wallet signature verified</dd>
                  </div>
                </div>

                <div className="grid grid-cols-[34px_minmax(0,1fr)] items-center gap-3 pt-4">
                  <Sparkles className="text-brand" size={23} aria-hidden="true" />
                  <div>
                    <dt className="text-sm font-semibold">BeSeen token</dt>
                    <dd className="text-sm text-muted">Following controls future broadcasts</dd>
                  </div>
                </div>
              </dl>
            </section>

            <section className="grid grid-cols-3 divide-x divide-border rounded-[20px] border border-border/90 bg-white/76 px-5 py-7 shadow-[0_10px_28px_rgb(21_47_68/3%)] backdrop-blur-md max-sm:px-2">
              <div className="grid justify-items-center gap-2 px-3 text-center">
                <span className="grid size-10 place-items-center rounded-full bg-info-bg text-brand">
                  <MessageCircleMore size={20} aria-hidden="true" />
                </span>
                <strong className="text-xl">0</strong>
                <span className="text-xs text-muted">Messages sent</span>
              </div>
              <div className="grid justify-items-center gap-2 px-3 text-center">
                <span className="grid size-10 place-items-center rounded-full bg-aqua/20 text-[#20b9c6]">
                  <RadioTower size={20} aria-hidden="true" />
                </span>
                <strong className="text-xl">0</strong>
                <span className="text-xs text-muted">Broadcasts</span>
              </div>
              <div className="grid justify-items-center gap-2 px-3 text-center">
                <span className="grid size-10 place-items-center rounded-full bg-peach/20 text-[#ff806b]">
                  <Flame size={20} aria-hidden="true" />
                </span>
                <strong className="text-xl">0</strong>
                <span className="text-xs text-muted">Replies earned</span>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
