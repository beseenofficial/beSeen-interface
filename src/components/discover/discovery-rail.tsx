import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import type { PublicUserProfile } from '@/types';

export function DiscoveryRail({ title, description, people, detail }: {
  title: string;
  description: string;
  people: PublicUserProfile[];
  detail: (profile: PublicUserProfile) => string;
}) {
  const titleId = `discover-${title.toLowerCase().replaceAll(' ', '-')}`;
  if (people.length === 0) return null;

  return (
    <section className="mt-7" aria-labelledby={titleId}>
      <div className="flex items-end justify-between gap-4 px-1">
        <div>
          <h2 id={titleId} className="text-xl font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-secondary">{description}</p>
        </div>
        <span className="hidden text-xs font-semibold text-muted sm:block">Scroll to explore</span>
      </div>
      <div className="discover-rail mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3" tabIndex={0}>
        {people.map((profile) => (
          <Link
            className="group relative flex aspect-square w-36 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-[#e3e8f4] bg-white p-3 shadow-[0_8px_24px_rgba(35,58,115,0.06)] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-[#c7d2f5] hover:shadow-[0_14px_32px_rgba(35,58,115,0.11)] sm:w-38"
            href={`/u/${encodeURIComponent(profile.username)}`}
            key={profile.id}
            aria-label={`View ${profile.username} in ${title}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="rounded-full bg-gradient-to-br from-[#55d6e7] via-[#8391ff] to-[#ffb2d8] p-0.5"><Avatar className="size-13 rounded-full border-2 border-white text-base" username={profile.username} src={profile.avatar} size="md" /></div>
              <ArrowUpRight className="text-muted transition-colors group-hover:text-brand" size={17} aria-hidden="true" />
            </div>
            <strong className="mt-3 truncate text-[15px] font-semibold tracking-[-0.02em]">{profile.username}</strong>
            <span className="mt-auto flex min-h-8 items-center rounded-lg bg-white/65 px-2.5 text-xs font-semibold text-brand">
              {detail(profile)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
