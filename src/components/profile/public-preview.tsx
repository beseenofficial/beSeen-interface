import { MessageCircleMore, Radio, Sparkles, WalletCards } from 'lucide-react';
import Image from 'next/image';
import { Avatar } from '@/components/ui/avatar';
import { CopyButton } from '@/components/ui/copy-button';

interface PublicPreviewProps {
  username: string;
  avatarUrl: string | null;
  profileUrl: string;
}

export function PublicPreview({
  username,
  avatarUrl,
  profileUrl,
}: PublicPreviewProps) {
  const stats = [
    {
      icon: Radio,
      label: 'Broadcasts',
      value: '12',
      tone: 'bg-lilac/55 text-[#5144bb]',
    },
    {
      icon: MessageCircleMore,
      label: 'Messages',
      value: '28',
      tone: 'bg-aqua/70 text-[#087886]',
    },
    {
      icon: Sparkles,
      label: 'Auras',
      value: '7',
      tone: 'bg-peach/60 text-[#d34d29]',
    },
    {
      icon: WalletCards,
      label: 'Wallets',
      value: '1',
      tone: 'bg-lime/80 text-[#4a6500]',
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-white p-6 max-sm:p-5">
      <Image
        className="absolute inset-0 size-full object-cover object-center opacity-80"
        src="/brand/dashboard-orbit-light.png"
        width={1536}
        height={1024}
        alt=""
      />
      <div className="relative z-10">
        <h2 className="text-xl font-semibold">Public preview</h2>
        <p className="mt-1.5 text-sm text-secondary">
          This is what others see on BeSeen.
        </p>

        <div className="mt-9 flex items-center gap-5 max-sm:mt-7">
          <Avatar
            username={username}
            src={avatarUrl}
            size="xl"
            className="size-24 text-3xl"
          />
          <div>
            <strong className="text-[28px] tracking-[-0.03em]">
              @{username}
            </strong>
            <p className="text-sm text-secondary">on BeSeen</p>
          </div>
        </div>

        <div className="mt-7 flex max-w-[470px] items-center justify-between gap-2 rounded-xl border border-border bg-white/90 pl-4 backdrop-blur-sm max-sm:flex-col max-sm:items-stretch max-sm:p-3">
          <span className="min-w-0 truncate text-sm font-semibold">
            {profileUrl}
          </span>
          <CopyButton value={profileUrl} />
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <article
                className="rounded-xl border border-border bg-white/90 p-4 backdrop-blur-sm"
                key={stat.label}
              >
                <span
                  className={`grid size-9 place-items-center rounded-full ${stat.tone}`}
                >
                  <Icon size={18} />
                </span>
                <span className="mt-3 block text-xs text-secondary">
                  {stat.label}
                </span>
                <strong className="mt-1 block text-[26px]">{stat.value}</strong>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
