import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Check, Share2 } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';
import { HEADER_ACTION } from '../../lib/public-profile-actions';

export function PublicProfileHeader({
  copied,
  authUser,
  onShare,
  siteCta,
}: {
  copied: boolean;
  authUser: { username?: string } | null | undefined;
  onShare: () => Promise<void> | void;
  siteCta: {
    href: string;
    label: string;
    icon: LucideIcon;
  };
}) {
  const SiteCtaIcon = siteCta.icon;

  return (
    <header className="flex min-h-11 shrink-0 items-center justify-between gap-4 px-1 sm:px-2">
      <div className="flex min-w-0 items-center gap-2.5 max-sm:gap-1.5">
        <Link
          className="shrink-0"
          href={authUser ? '/dashboard' : '/login'}
          aria-label="Go to BeSeen"
        >
          <BrandLogo className="w-36.5 max-sm:w-22.5" />
        </Link>
        <span className="shrink-0 text-[34px] font-semibold leading-none tracking-[-0.03em] text-brand max-sm:text-[21px]">
          Profile
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          className={`${HEADER_ACTION} cursor-pointer`}
          onClick={() => void onShare()}
          type="button"
          aria-label={copied ? 'Profile link copied' : 'Share profile'}
        >
          {copied ? (
            <Check size={18} aria-hidden="true" />
          ) : (
            <Share2 size={18} aria-hidden="true" />
          )}
          <span className="max-sm:hidden">{copied ? 'Copied' : 'Share'}</span>
        </button>
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
  );
}
