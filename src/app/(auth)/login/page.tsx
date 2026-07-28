'use client';

import { ArrowRight, CheckCircle2, LockKeyhole, PenLine } from 'lucide-react';
import { useState } from 'react';
import { RouteGuard } from '@/components/layout/route-guard';
import { AuraRipple } from '@/components/ui/aura-ripple';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/blux';
import { shortenAddress } from '@/lib/utils';

function LoginContent() {
  const auth = useAuth();
  const [working, setWorking] = useState(false);

  // `sign-required` means Blux is connected but the deterministic ownership
  // signature is still missing (it failed or was dismissed) — offer a retry.
  const needsSignature = auth.status === 'sign-required';

  async function continueWithBlux() {
    setWorking(true);
    try {
      // Both calls end with the RouteGuard auto-advancing this page.
      await (needsSignature ? auth.completeSignIn() : auth.login());
    } catch {
      // The provider already turned the failure into auth.error.
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center overflow-hidden bg-ice p-8 max-sm:block max-sm:p-0">
      <section className="grid min-h-172.5 w-full max-w-290 grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)] items-stretch max-[900px]:min-h-0 max-[900px]:grid-cols-1">
        <div className="relative flex flex-col overflow-hidden py-10.5 pl-6 pr-16 max-[900px]:min-h-130 max-[900px]:p-8 max-sm:min-h-110 max-sm:p-6">
          <BrandLogo />
          <div className="relative z-1 mt-27 max-w-165 max-[900px]:mt-17 max-sm:mt-12.5">
            <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.09em] text-brand">
              Outcome-based attention
            </span>
            <h1 className="text-[clamp(52px,6vw,78px)] font-semibold max-sm:text-[43px]">
              Pay creators for replies.
              <em className="block font-semibold text-brand not-italic">
                Guaranteed, or refunded.
              </em>
            </h1>
            <p className="mt-7 max-w-130 text-lg text-secondary max-sm:mt-5 max-sm:text-base">
              Access creators, build your Aura, and turn attention into clear
              outcomes.
            </p>
          </div>
          <div className="absolute -bottom-27 -right-20 max-[900px]:opacity-70 max-sm:-bottom-37.5 max-sm:-right-42.5">
            <AuraRipple className="size-130 [&_i:nth-child(2)]:size-55 [&_i:nth-child(3)]:size-125" />
            <div className="absolute bottom-34 right-35 flex items-center gap-2 rounded-xl border border-white/70 bg-white/80 px-4 py-3 text-sm font-semibold shadow-elevated backdrop-blur max-sm:hidden">
              <CheckCircle2 className="text-success" size={19} />
              <span>No reply means a full refund.</span>
            </div>
          </div>
        </div>
        <section
          className="relative z-2 my-auto rounded-3xl border border-border bg-white p-12 shadow-elevated max-[900px]:mx-auto max-[900px]:-mt-7.5 max-[900px]:mb-7.5 max-[900px]:w-full max-[900px]:max-w-135 max-sm:mx-3 max-sm:-mt-4.5 max-sm:mb-4.5 max-sm:w-[calc(100%-24px)] max-sm:p-6"
          aria-labelledby="welcome-title"
        >
          <span className="mb-6 grid size-12 place-items-center rounded-[14px] bg-info-bg text-brand">
            {needsSignature ? <PenLine size={22} /> : <LockKeyhole size={22} />}
          </span>
          <h2 className="text-[30px] font-semibold" id="welcome-title">
            {needsSignature ? 'One signature to go' : 'Welcome to BeSeen'}
          </h2>
          <p className="mt-3 text-sm text-secondary">
            {needsSignature
              ? `You're connected as ${shortenAddress(auth.address ?? '')}. Approve one small signature in your wallet to unlock your BeSeen keys — it changes nothing on the Stellar network.`
              : 'Sign in to create your Aura and manage your creator presence.'}
          </p>
          <Button
            className="mt-7 w-full"
            onClick={() => void continueWithBlux()}
            loading={working}
            icon={<ArrowRight size={19} />}
          >
            {working
              ? 'Waiting for Blux…'
              : needsSignature
                ? 'Sign to continue'
                : 'Login'}
          </Button>
          {auth.error && (
            <p className="mt-2 text-xs text-error" role="alert">
              {auth.error}
            </p>
          )}
          {needsSignature && (
            <button
              className="mt-4 cursor-pointer border-0 bg-transparent p-0 text-xs font-semibold text-muted underline-offset-2 hover:underline"
              onClick={() => auth.logout()}
              type="button"
            >
              Use a different account
            </button>
          )}
          <p className="mt-6 border-t border-border pt-5 text-[11px] leading-[1.55] text-muted">
            Secure sign-in is handled by Blux on Stellar Testnet. BeSeen never
            receives your wallet seed or private signing keys.
          </p>
        </section>
      </section>
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
