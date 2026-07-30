import {
  HandCoins,
  Share2,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import Image from 'next/image';
import { Avatar } from '@/components/ui/avatar';
import { CopyButton } from '@/components/ui/copy-button';

interface IdentityCardProps {
  username: string;
  avatar: string | null;
  profileUrl: string;
  onShare: () => void;
  onOpenWallet: () => void;
  onFundWallet: () => void;
}

export function IdentityCard({
  username,
  avatar,
  profileUrl,
  onShare,
  onOpenWallet,
  onFundWallet,
}: IdentityCardProps) {
  return (
    <section className="relative grid min-h-[340px] overflow-hidden rounded-2xl bg-[#071648] px-9 py-8 text-white shadow-[0_18px_40px_rgb(9_26_83/18%)] lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-center lg:gap-8 2xl:min-h-[380px] 2xl:px-11 max-sm:rounded-[18px] max-sm:px-5 max-sm:py-6">
      <Image
        className="pointer-events-none absolute inset-0 size-full select-none object-cover object-center opacity-80"
        src="/brand/beseen-aura-orbits-background.svg"
        width={1717}
        height={916}
        priority
        alt=""
      />
      <div className="relative z-10 max-w-[570px]">
        <span className="inline-flex min-h-8 items-center gap-2 rounded-lg bg-emerald-400/15 px-3 text-xs font-semibold text-emerald-300">
          <ShieldCheck size={16} /> Identity secured
        </span>
        <h2 className="mt-4 text-[clamp(30px,3vw,38px)] font-semibold tracking-[-0.035em]">
          Your BeSeen identity is ready.
        </h2>
        <p className="mt-2.5 max-w-[520px] text-[15px] leading-6 text-white/80">
          Signed in with Blux, verified with a wallet signature, and secured by
          keys that only exist on your device.
        </p>
        <div className="mt-5 flex max-w-[540px] items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/12 px-4 py-2.5 backdrop-blur-sm max-sm:flex-col max-sm:items-stretch">
          <span className="min-w-0 truncate text-sm font-semibold max-sm:break-all max-sm:whitespace-normal">
            {profileUrl}
          </span>
          <CopyButton value={profileUrl} className="text-[#0B0B3F]" />
        </div>
        <div className="mt-4 flex flex-wrap gap-3 max-sm:grid max-sm:grid-cols-1">
          <button
            className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-transparent bg-brand px-5 text-sm font-semibold text-white transition hover:bg-[#0c3bd6]"
            onClick={onShare}
            type="button"
          >
            <Share2 size={18} /> Share profile
          </button>
          <button
            className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/35 bg-transparent px-5 text-sm font-semibold text-white transition hover:bg-white/10"
            onClick={onOpenWallet}
            type="button"
          >
            <WalletCards size={18} /> Wallet profile
          </button>
          <button
            className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/35 bg-transparent px-5 text-sm font-semibold text-white transition hover:bg-white/10"
            onClick={onFundWallet}
            type="button"
          >
            <HandCoins size={18} /> Fund wallet
          </button>
        </div>
      </div>

      <div className="relative z-10 mt-8 flex flex-col items-center text-center lg:mt-0">
        <Avatar
          username={username}
          src={avatar}
          size="xxl"
          className="ring-8 ring-[#203582]/80 shadow-[0_15px_35px_rgb(0_0_0/22%)]"
        />
        <strong className="mt-4 text-[27px]">@{username}</strong>
        <span className="mt-1 flex items-center gap-2 text-sm text-white/85">
          <i className="size-2.5 rounded-full bg-emerald-400" /> Active
        </span>
      </div>
    </section>
  );
}
