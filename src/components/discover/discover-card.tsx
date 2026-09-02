import { ArrowUpRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { VerificationBadge } from '@/components/ui/verification-badge';
import type { DiscoverUser } from '@/types';
import { formatCompactCount } from './format-compact-count';

export function DiscoverCard({ user }: { user: DiscoverUser }) {
  const bio = user.bio?.trim();

  return (
    <Link
      className="discover-person group relative grid min-h-40 min-w-0 grid-cols-[88px_minmax(0,1fr)_96px] items-center gap-3 overflow-hidden rounded-[24px] border border-[#d9e1f0] bg-white p-3 text-navy shadow-[0_12px_34px_rgba(35,58,115,0.08)] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-[#bfcdf0] hover:shadow-[0_18px_42px_rgba(35,58,115,0.13)] max-[390px]:grid-cols-[76px_minmax(0,1fr)_76px] max-[390px]:gap-2 max-[390px]:rounded-2xl max-[390px]:p-2.5"
      href={`/u/${encodeURIComponent(user.username)}`}
      aria-label={`View @${user.username}'s profile`}
    >
      <div className="relative grid size-22 place-items-center justify-self-center rounded-full bg-[linear-gradient(135deg,#64ddea_40%,#0b0b3f_100%,#1045f5_70%)] p-[3px] shadow-[0_8px_22px_rgba(16,69,245,0.16)] max-[390px]:size-19">
        <Avatar
          className="!size-full !rounded-full border-[3px] border-white bg-[#f3b19f] text-xl text-navy ring-0 transition-transform duration-500 group-hover:scale-[1.025]"
          username={user.username}
          src={user.avatar}
          size="lg"
        />
      </div>
      <div className="relative z-10 min-w-0 py-1">
        <div className="flex max-w-full items-center gap-1.5">
          <strong className="truncate text-xl font-semibold tracking-[-0.035em] text-navy max-[390px]:text-base">
            @{user.username}
          </strong>
          <VerificationBadge verification={user.verification} size={16} />
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-navy max-[390px]:text-xs">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-aqua/25 text-brand">
            <Sparkles size={13} aria-hidden="true" />
          </span>
          Holds{' '}
          <strong className="font-semibold tabular-nums text-brand">
            {formatCompactCount(user.followerCount)} Aura
          </strong>
        </p>
        <p className="mt-3 line-clamp-2 text-xs leading-5 text-secondary max-[390px]:mt-2 max-[390px]:leading-4">
          {bio || 'Open this profile to learn more.'}
        </p>
      </div>
      <div className="relative z-10 flex h-24 items-center border-l border-[#dfe5f1] pl-3 max-[390px]:h-20 max-[390px]:pl-2">
        <span className="flex min-h-10 w-full items-center justify-center rounded-xl bg-brand px-2 text-xs font-semibold text-white transition-colors group-hover:bg-[#3153ff]">
          View <ArrowUpRight className="ml-1" size={14} aria-hidden="true" />
        </span>
      </div>
      <img
        className="pointer-events-none absolute -left-16 top-1/2 size-48 -translate-y-1/2 opacity-75"
        src="/brand/discover-card-aura-side-arc.svg"
        alt=""
        aria-hidden="true"
      />
      <img
        className="pointer-events-none absolute right-4 top-2 h-12 w-auto opacity-70"
        src="/brand/discover-card-dot-grid.svg"
        alt=""
        aria-hidden="true"
      />
    </Link>
  );
}
