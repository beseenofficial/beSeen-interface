import { CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { BrandLogo } from '@/components/ui/brand-logo';

function CreatorReplyVisual() {
  return (
    <div className="relative hidden h-[330px] min-[1280px]:block" aria-hidden="true">
      <div className="absolute inset-x-0 top-1 overflow-hidden rounded-2xl bg-white shadow-floating">
        <div className="flex items-center gap-3 border-b border-hairline px-4 py-3.5">
          <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-peach">
            <Image className="object-cover" src="/images/avatars/maya.webp" fill sizes="40px" alt="" />
          </span>
          <span className="min-w-0">
            <strong className="block truncate text-sm font-semibold text-navy">@maya</strong>
            <span className="block text-[10px] text-secondary">Creator</span>
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-[10px] font-medium text-success">
            <span className="size-1.5 rounded-full bg-success" />
            Available
          </span>
        </div>

        <div className="space-y-3 px-4 py-4">
          <div className="ml-auto w-[82%] rounded-[16px] rounded-br-md bg-brand px-3.5 py-2.5 text-white">
            <span className="block text-[9px] font-medium uppercase tracking-[0.12em] text-white/65">Message delivered</span>
            <span className="mt-1.5 block h-1.5 w-[82%] rounded-full bg-white/70" />
            <span className="mt-1.5 block h-1.5 w-[58%] rounded-full bg-white/35" />
          </div>
          <div className="w-[82%] rounded-[16px] rounded-bl-md bg-[#f1f4f5] px-3.5 py-2.5 text-navy">
            <span className="block text-[9px] font-medium uppercase tracking-[0.12em] text-secondary">Creator replied</span>
            <span className="mt-1.5 block h-1.5 w-[88%] rounded-full bg-navy/20" />
            <span className="mt-1.5 block h-1.5 w-[64%] rounded-full bg-navy/10" />
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[#fffcf5] px-4 py-3 text-navy">
          <span className="relative size-8 shrink-0 overflow-hidden rounded-full bg-white">
            <Image className="object-cover" src="/images/circle-usdc-logo.webp" fill sizes="32px" alt="" />
          </span>
          <span>
            <strong className="block text-xs font-semibold">25 USDC</strong>
            <span className="block text-[10px] text-secondary">Reply reward claimed</span>
          </span>
          <CheckCircle2 className="ml-auto text-success" size={18} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

export function LoginBrandPanel() {
  return (
    <section className="relative isolate order-2 m-3 flex min-w-0 flex-col overflow-hidden rounded-[22px] bg-[#e8edff] px-6 pb-8 pt-7 sm:m-4 sm:px-9 sm:pb-10 sm:pt-9 min-[901px]:order-none min-[901px]:m-5 min-[901px]:rounded-[26px] min-[901px]:px-[clamp(42px,5vw,78px)] min-[901px]:py-[clamp(38px,6vh,72px)]" aria-labelledby="login-promise">
      <Image className="pointer-events-none absolute inset-0 z-0 size-full select-none object-cover object-[52%_center] -hue-rotate-10 contrast-125" src="/images/beseen-login-panel-bg-v2.jpg" fill sizes="(min-width: 901px) 60vw, 100vw" priority alt="" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(100deg,rgba(247,249,252,0.97)_0%,rgba(238,242,247,0.9)_48%,rgba(12,20,38,0.36)_100%)]" aria-hidden="true" />
      <BrandLogo className="relative z-10 w-[126px] sm:w-[140px] min-[901px]:w-[154px]" />

      <div className="relative z-10 mt-9 sm:mt-12 min-[901px]:my-auto min-[901px]:py-12 min-[1280px]:grid min-[1280px]:grid-cols-[minmax(300px,1fr)_240px] min-[1280px]:items-center min-[1280px]:gap-8">
        <div className="max-w-[650px] min-[1280px]:max-w-[470px]">
          <h1 id="login-promise" className="text-[clamp(34px,9vw,48px)] font-semibold leading-[0.98] tracking-[-0.04em] text-navy min-[901px]:text-[clamp(46px,4.6vw,72px)]">
            <span className="block">Pay creators</span>
            <span className="block">for replies.</span>
            <em className="mt-2 block font-semibold not-italic text-brand min-[901px]:mt-3">Guaranteed, or refunded.</em>
          </h1>
          <p className="mt-5 max-w-[450px] text-[15px] leading-6 text-[#35405f] sm:text-base min-[901px]:mt-8 min-[901px]:text-lg min-[901px]:leading-7">
            Access creators, build your Aura, and turn attention into clear outcomes.
          </p>
          <span className="mt-9 block h-px w-24 bg-navy/35 min-[901px]:mt-12" aria-hidden="true" />
        </div>
        <CreatorReplyVisual />
      </div>

      <footer className="relative z-10 mt-12 hidden items-center text-xs text-[#465172] min-[901px]:flex">
        <span>© 2026 BeSeen</span>
      </footer>
    </section>
  );
}
