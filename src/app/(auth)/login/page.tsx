'use client';

import { ArrowRight, CheckCircle2, LockKeyhole, PenLine } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { RouteGuard } from '@/components/layout/route-guard';
import { BrandLogo } from '@/components/ui/brand-logo';
import { useAuth } from '@/lib/blux';
import { shortenAddress } from '@/lib/utils';

function LoginContent() {
  const auth = useAuth();
  const [working, setWorking] = useState(false);
  const needsSignature = auth.status === 'sign-required';

  async function continueWithBlux() {
    setWorking(true);
    try {
      await (needsSignature ? auth.completeSignIn() : auth.login());
    } catch {
      // The provider already exposes the failure through auth.error.
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="min-h-svh overflow-x-hidden bg-[#f5fafc] min-[901px]:h-svh min-[901px]:min-h-0 min-[901px]:overflow-hidden">
      <div className="mx-auto grid w-full max-w-[1536px] gap-6 px-5 py-6 min-[901px]:h-full min-[901px]:grid-cols-[minmax(0,1fr)_auto] min-[901px]:items-center min-[901px]:gap-[clamp(32px,4vw,72px)] min-[901px]:px-[clamp(36px,4.6vw,72px)] min-[901px]:py-[clamp(18px,3.5vh,42px)]">

        {/* LEFT — Brand poster */}
        <section className="relative isolate flex min-w-0 flex-col min-[901px]:h-full min-[901px]:min-h-0" aria-labelledby="login-promise">
          <Image
            className="pointer-events-none absolute -right-[10%] top-[14%] -z-10 hidden w-[min(700px,52vw)] max-w-none select-none opacity-40 min-[901px]:block"
            src="/brand/beseen-attention-rings.svg"
            width={760}
            height={760}
            priority
            alt=""
          />

          <BrandLogo className="relative z-10 w-[132px] min-[901px]:w-[clamp(128px,10vw,158px)]" />

          <div className="relative z-10 mt-8 max-w-[880px] min-[901px]:mt-[clamp(40px,10vh,120px)]">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.12em] text-brand [@media(min-height:900px)]:mb-5 [@media(min-height:900px)]:text-sm">
              Outcome-based attention
            </p>
            <h1 id="login-promise" className="text-[clamp(34px,9vw,44px)] font-semibold leading-[1.04] tracking-[-0.045em] text-navy min-[901px]:text-[clamp(56px,6.2vw,92px)] min-[901px]:leading-[1.0]">
              <span className="block">Pay creators for</span>
              <span className="block">replies.</span>
              <em className="block font-semibold not-italic text-[#2852ed]">Guaranteed, or</em>
              <em className="block font-semibold not-italic text-[#2852ed]">refunded.</em>
            </h1>
            <p className="mt-6 hidden max-w-[420px] text-lg leading-7 text-secondary min-[901px]:block">
              Access creators, build your Aura, and turn attention into clear outcomes.
            </p>
          </div>

          <footer className="relative z-10 mt-auto hidden items-center gap-4 text-xs text-[#657096] min-[901px]:flex">
            <span>© 2026 BeSeen</span>
            <i className="font-normal not-italic text-[#8f98b9]" aria-hidden="true">•</i>
            <a className="hover:text-brand" href="#terms">Terms</a>
            <i className="font-normal not-italic text-[#8f98b9]" aria-hidden="true">•</i>
            <a className="hover:text-brand" href="#privacy">Privacy</a>
            <i className="font-normal not-italic text-[#8f98b9]" aria-hidden="true">•</i>
            <a className="hover:text-brand" href="#help">Help</a>
          </footer>
        </section>

        {/* RIGHT — Access instrument */}
        <section className="relative z-20 w-full rounded-[22px] border border-[#e4eaf3] bg-white px-6 py-7 shadow-[0_22px_60px_rgb(20_55_92/10%)] min-[901px]:w-[420px] min-[901px]:px-10 min-[901px]:py-10" aria-labelledby="welcome-title">
          <span className="grid size-11 place-items-center rounded-[12px] bg-info-bg text-brand">
            {needsSignature ? <PenLine size={22} aria-hidden="true" /> : <LockKeyhole size={22} aria-hidden="true" />}
          </span>

          <h2 id="welcome-title" className="mt-5 text-[26px] font-semibold leading-8 tracking-[-0.03em] text-navy">
            {needsSignature ? 'One signature to go' : 'Welcome to BeSeen'}
          </h2>
          <p className="mt-2 text-[13px] leading-5 text-secondary">
            {needsSignature
              ? `You're connected as ${shortenAddress(auth.address ?? '')}. Approve one small signature in your wallet to unlock your BeSeen keys — it changes nothing on the Stellar network.`
              : 'Sign in to broadcast your message and turn attention into value.'}
          </p>

          <button
            className="mt-6 grid min-h-[52px] w-full cursor-pointer grid-cols-[minmax(0,1fr)_20px] items-center rounded-[13px] border-0 bg-brand px-5 text-white shadow-[0_10px_22px_rgb(35_70_238/18%)] transition hover:-translate-y-px hover:bg-[#183cdf] disabled:cursor-wait disabled:opacity-70"
            onClick={() => void continueWithBlux()}
            disabled={working}
            type="button"
            aria-busy={working}
          >
            <span className="justify-self-center whitespace-nowrap px-2 text-sm font-semibold">
              {working ? 'Opening secure sign-in…' : needsSignature ? 'Sign to continue' : 'Sign in'}
            </span>
            <ArrowRight size={20} aria-hidden="true" />
          </button>

          {auth.error && <p className="mt-2 text-xs leading-4 text-error" role="alert">{auth.error}</p>}
          {needsSignature && (
            <button className="mt-2 w-fit cursor-pointer border-0 bg-transparent p-0 text-xs font-semibold text-muted underline underline-offset-3" onClick={() => auth.logout()} type="button">
              Use a different account
            </button>
          )}

          <div className="mt-5 grid gap-2.5 border-t border-[#eef2f8] pt-5">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-navy">
              <CheckCircle2 size={16} className="shrink-0 text-success" aria-hidden="true" />
              No reply means a full refund.
            </p>
            <p className="text-xs leading-5 text-secondary">
              Continue with email, passkey, or Stellar wallet — no wallet required.
            </p>
          </div>

          <p className="mt-6 text-[11px] leading-4.5 text-muted">
            Built on Stellar for fast, transparent attention payments.
          </p>
        </section>

        <footer className="flex items-center justify-center gap-3 pb-2 text-[11px] text-[#8f98b9] min-[901px]:hidden">
          <span>© 2026 BeSeen</span>
          <i className="font-normal not-italic" aria-hidden="true">•</i>
          <a className="hover:text-brand" href="#terms">Terms</a>
          <i className="font-normal not-italic" aria-hidden="true">•</i>
          <a className="hover:text-brand" href="#privacy">Privacy</a>
        </footer>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <RouteGuard mode="login">
      <LoginContent />
    </RouteGuard>
  );
}
