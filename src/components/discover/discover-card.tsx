'use client';

import { ArrowUpRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { formatAuraPrice } from '@/lib/decimal';
import type { DiscoverUser } from '@/types';
import { formatCompactCount } from './format-compact-count';
import { useAvatarPalette } from './use-avatar-palette';

export function DiscoverCard({ user, preview = false }: { user: DiscoverUser; preview?: boolean }) {
  const bio = user.bio?.trim();
  const [primaryColor, secondaryColor] = useAvatarPalette(user.avatar, user.id || user.username);
  const gradient = `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`;

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
        <p className={`line-clamp-2 text-secondary ${preview ? 'mt-1 text-xs leading-4' : 'mt-2 text-sm leading-5'}`}>
          {bio || 'No bio yet — open this profile to learn more.'}
        </p>
      </div>

      <div className={`mt-auto flex items-end justify-between gap-4 px-4 ${preview ? 'pb-2 pt-2' : 'pb-3 pt-4'}`}>
        <dl>
          <div className="flex items-center gap-2.5">
            <span className={`grid shrink-0 place-items-center rounded-full bg-brand/10 text-brand ${preview ? 'size-8' : 'size-10'}`} aria-hidden="true">
              <Sparkles size={preview ? 15 : 18} />
            </span>
            <div>
              <dd className={`${preview ? 'text-lg' : 'text-xl'} font-semibold leading-none tabular-nums text-navy`}>{formatCompactCount(user.followerCount)}</dd>
              <dt className="mt-1 text-xs leading-none text-secondary">Aura holders</dt>
            </div>
          </div>
          <div className={`${preview ? 'mt-1.5' : 'mt-2.5'} flex items-baseline gap-1.5`}>
            <dd className={`${preview ? 'text-xs' : 'text-sm'} font-semibold leading-none tabular-nums text-navy`}>
              {formatAuraPrice(user.auraPrice) ?? '—'}
            </dd>
            <dt className={`${preview ? 'text-[10px]' : 'text-xs'} leading-none text-secondary`}>
              {user.auraPrice === null ? 'Price unavailable' : 'USDC / Aura'}
            </dt>
          </div>
        </dl>
        <span className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#22252a] font-semibold text-white transition-colors group-hover:bg-brand ${preview ? 'size-10' : 'min-h-11 px-4 text-sm'}`}>
          {!preview && 'Open profile'} <ArrowUpRight size={16} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
