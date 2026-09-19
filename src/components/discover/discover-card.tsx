'use client';

import { ArrowUpRight, Check, Compass, Copy, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { APP_URL } from '@/lib/constants';
import { formatAuraPrice } from '@/lib/decimal';
import type { DiscoverUser } from '@/types';
import { formatCompactCount } from './format-compact-count';
import { useAvatarPalette } from './use-avatar-palette';

export function DiscoverCard({
  user,
  preview = false,
  compact = false,
}: {
  user: DiscoverUser;
  preview?: boolean;
  compact?: boolean;
}) {
  const bio = user.bio?.trim();
  const [copied, setCopied] = useState(false);
  const [primaryColor, secondaryColor] = useAvatarPalette(user.avatar, user.id || user.username);
  const gradient = `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`;
  const auraPrice = formatAuraPrice(user.auraPrice);
  const profilePath = `/u/${encodeURIComponent(user.username)}`;
  const profileUrl = `${APP_URL}${profilePath}`;

  async function copyProfileUrl() {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  if (compact) {
    return (
      <article className="discover-person flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-white p-5 text-navy">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold">Featured profile</h2>
            <p className="overview-card-description mt-0.5 truncate text-xs text-secondary">Someone worth discovering</p>
          </div>
          <span className="shrink-0 rounded-full bg-info-bg px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-brand">For you</span>
        </div>

        <Link
          className="group relative mt-3 flex min-h-24 flex-1 items-center overflow-hidden rounded-2xl px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          href={profilePath}
          aria-label={`View @${user.username}'s profile`}
          style={{ backgroundImage: gradient }}
        >
          {user.avatar && <img className="absolute inset-0 size-full scale-110 object-cover opacity-60 blur-2xl saturate-150" src={user.avatar} alt="" aria-hidden="true" />}
          <span className="absolute inset-0 bg-[linear-gradient(110deg,rgba(7,16,58,0.52),rgba(7,16,58,0.18)_65%,rgba(7,16,58,0.38))]" aria-hidden="true" />
          <div className="relative z-10 flex min-w-0 flex-1 items-center gap-3">
            <div className="grid size-16 shrink-0 place-items-center rounded-full bg-white/95 p-1 shadow-lg">
              <Avatar className="!size-full !rounded-full bg-[#f3b19f] text-xl text-navy ring-0" username={user.username} src={user.avatar} size="lg" />
            </div>
            <div className="min-w-0 text-white">
              <div className="flex min-w-0 items-center gap-1.5">
                <strong className="truncate text-xl font-semibold tracking-[-0.035em] text-white drop-shadow-sm">@{user.username}</strong>
                <VerificationBadge verification={user.verification} size={16} />
              </div>
              <p className="line-clamp-1 text-[13px] leading-5 text-white/80">{bio || 'Open this profile to learn more.'}</p>
            </div>
            <span className="ml-auto grid size-9 shrink-0 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition group-hover:bg-white group-hover:text-brand" aria-hidden="true">
              <ArrowUpRight size={16} />
            </span>
          </div>
        </Link>

        <div className="mt-2 flex min-w-0 items-center gap-2 rounded-xl border border-border bg-white py-1 pl-3 pr-1">
          <Link className="min-w-0 flex-1 truncate text-[11px] font-medium text-secondary transition hover:text-brand" href={profilePath} title={profileUrl}>
            {profileUrl.replace(/^https?:\/\//, '')}
          </Link>
          <button
            className="inline-grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-secondary transition hover:bg-info-bg hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            type="button"
            onClick={() => void copyProfileUrl()}
            aria-label={copied ? 'Profile link copied' : 'Copy profile link'}
            title={copied ? 'Copied' : 'Copy profile link'}
          >
            {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          </button>
        </div>

        <dl className="mt-3 grid grid-cols-2 divide-x divide-border rounded-xl bg-subtle px-4 py-3">
          <div className="min-w-0 pr-4">
            <dt className="truncate text-[11px] font-medium leading-none text-secondary">Aura holders</dt>
            <dd className="mt-2 truncate text-xl font-semibold leading-none tabular-nums text-navy" title={(user.followerCount ?? 0).toLocaleString()}>{formatCompactCount(user.followerCount)}</dd>
          </div>
          <div className="min-w-0 pl-4">
            <dt className="truncate text-[11px] font-medium leading-none text-secondary">Aura price</dt>
            <dd className="mt-2 flex min-w-0 items-baseline gap-1.5 font-semibold leading-none tabular-nums text-navy">
              <span className="truncate text-xl" title={auraPrice ? `${auraPrice} USDC` : 'Price unavailable'}>{auraPrice ?? '—'}</span>
              <span className="shrink-0 text-[10px] font-bold text-secondary">{auraPrice ? 'USDC' : 'Unavailable'}</span>
            </dd>
          </div>
        </dl>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 text-xs font-semibold text-navy transition hover:border-[#bdc9df] hover:bg-subtle" href="/dashboard/profile">
            <Pencil size={14} aria-hidden="true" /> Edit profile
          </Link>
          <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-brand px-3 text-xs font-semibold text-white transition hover:bg-[#0c3bd6]" href="/dashboard/discover">
            <Compass size={15} aria-hidden="true" /> Discover
          </Link>
        </div>
      </article>
    );
  }

  return (
    <Link
      className={`discover-person group relative flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-[#d9e1f0] bg-white p-3 text-navy shadow-[0_12px_34px_rgba(35,58,115,0.08)] ${preview ? 'pointer-events-none min-h-[250px] select-none' : 'min-h-[330px]'}`}
      href={preview ? '/discover' : `/u/${encodeURIComponent(user.username)}`}
      aria-hidden={preview || undefined}
      aria-label={preview ? undefined : `View @${user.username}'s profile`}
      tabIndex={preview ? -1 : undefined}
    >
      <div
        className={`relative w-full overflow-hidden rounded-[16px] ${preview ? 'h-20' : 'h-28'}`}
        style={{ backgroundImage: gradient }}
        aria-hidden="true"
      >
        {user.avatar && (
          <img
            className="size-full scale-125 object-cover opacity-75 blur-2xl saturate-150"
            src={user.avatar}
            alt=""
          />
        )}
        <span className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.12),transparent_45%,rgba(11,11,63,0.12))]" />
      </div>

      <div className={`relative z-10 ml-4 grid place-items-center rounded-full bg-white p-1 ${preview ? '-mt-8 size-17' : '-mt-10 size-21'}`}>
        <Avatar
          className="!size-full !rounded-full bg-[#f3b19f] text-xl text-navy ring-0"
          username={user.username}
          src={user.avatar}
          size="lg"
        />
      </div>

      <div className={`min-w-0 px-4 ${preview ? 'mt-2' : 'mt-3'}`}>
        <div className="flex max-w-full items-center gap-1.5">
          <strong className={`${preview ? 'text-lg' : 'text-2xl'} truncate font-semibold tracking-[-0.035em] text-navy`}>
            @{user.username}
          </strong>
          <VerificationBadge verification={user.verification} size={16} />
        </div>
        <p className={`text-secondary ${preview ? 'mt-1 line-clamp-1 text-xs leading-4' : 'mt-2 line-clamp-2 text-sm leading-5'}`}>
          {bio || 'No bio yet — open this profile to learn more.'}
        </p>
      </div>

      <div className={`mt-auto flex items-center gap-3 px-4 ${preview ? 'pb-2 pt-2' : 'pb-3 pt-4'}`}>
        <dl className="grid min-w-0 flex-1 grid-cols-2 divide-x divide-border">
          <div className="min-w-0 pr-3">
            <dt className={`${preview ? 'text-[10px]' : 'text-xs'} truncate leading-none text-secondary`}>Aura holders</dt>
            <dd className={`${preview ? 'mt-1.5 text-lg' : 'mt-2 text-xl'} truncate font-semibold leading-none tabular-nums text-navy`} title={(user.followerCount ?? 0).toLocaleString()}>
              {formatCompactCount(user.followerCount)}
            </dd>
          </div>
          <div className="min-w-0 pl-3">
            <dt className={`${preview ? 'text-[10px]' : 'text-xs'} truncate leading-none text-secondary`}>Aura price</dt>
            <dd className={`${preview ? 'mt-1.5 text-lg' : 'mt-2 text-xl'} flex min-w-0 items-baseline gap-1 font-semibold leading-none tabular-nums text-navy`}>
              <span className="truncate" title={auraPrice ? `${auraPrice} USDC` : 'Price unavailable'}>{auraPrice ?? '—'}</span>
              <span className="shrink-0 text-[9px] font-bold text-secondary">{auraPrice ? 'USDC' : 'Unavailable'}</span>
            </dd>
          </div>
        </dl>
        <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#22252a] font-semibold text-white transition-colors group-hover:bg-brand ${preview ? 'size-10' : 'size-11'}`} aria-hidden="true">
          <ArrowUpRight size={16} />
        </span>
      </div>
    </Link>
  );
}
