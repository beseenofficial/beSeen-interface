'use client';

import { CheckCircle2, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { LoginButton } from '@/components/features/auth/login-button';
import { RouteGuard } from '@/components/layout/route-guard';
import { AuraRipple } from '@/components/ui/aura-ripple';
import { BrandLogo } from '@/components/ui/brand-logo';
import { useAuth } from '@/providers/auth-provider';

function LoginContent() {
  const auth = useAuth();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login() {
    setOpening(true);
    setError(null);
    try {
      await auth.login();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'The sign-in window could not be opened. Please try again.',
      );
    } finally {
      setOpening(false);
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
            <LockKeyhole size={22} />
          </span>
          <h2 className="text-[30px] font-semibold" id="welcome-title">
            Welcome to BeSeen
          </h2>
          <p className="mt-3 text-sm text-secondary">
            Sign in to create your Aura and manage your creator presence.
          </p>
          <LoginButton
            onLogin={() => void login()}
            loading={opening}
          />
          {error && (
            <p className="mt-2 text-xs text-error" role="alert">
              {error}
            </p>
          )}
          <div className="mt-5 grid grid-cols-3 gap-2">
            {["Wallet", "Email", "Google"].map((method) => (
              <span
                className="rounded-lg bg-subtle px-1.5 py-2 text-center text-[10px] font-semibold text-muted"
                key={method}
              >
                {method}
              </span>
            ))}
          </div>
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
