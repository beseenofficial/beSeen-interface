'use client';

import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  PenLine,
  ShieldCheck,
} from 'lucide-react';
import Image from 'next/image';
import { useState, type ReactNode } from 'react';
import { RouteGuard } from '@/components/layout/route-guard';
import { BrandLogo } from '@/components/ui/brand-logo';
import { useAuth } from '@/lib/blux';
import { shortenAddress } from '@/lib/utils';

function SecurityFeature({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-4 [@media(min-height:900px)]:grid-cols-[60px_minmax(0,1fr)] [@media(min-height:900px)]:gap-5">
      <span className="grid size-12 place-items-center rounded-[13px] bg-info-bg text-brand [@media(min-height:900px)]:size-15 [@media(min-height:900px)]:rounded-[15px]" aria-hidden="true">
        {icon}
      </span>
      <span className="grid min-w-0 gap-0.5">
        <strong className="text-[13px] leading-5 [@media(min-height:900px)]:text-[15px]">{title}</strong>
        <span className="text-xs leading-4.5 text-secondary [@media(min-height:900px)]:text-sm">{children}</span>
      </span>
    </li>
  );
}

function LoginContent() {
  const auth = useAuth();
  const [working, setWorking] = useState(false);
  const needsSignature = auth.status === 'sign-required';
  const stellarNetwork = auth.config.stellarNetwork ?? 'Testnet';

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
      <div className="mx-auto grid w-full max-w-[1536px] gap-5 px-4 py-5 min-[901px]:h-full min-[901px]:grid-cols-[minmax(0,1.45fr)_minmax(390px,.82fr)] min-[901px]:items-center min-[901px]:gap-[clamp(24px,3vw,52px)] min-[901px]:px-[clamp(36px,4.6vw,72px)] min-[901px]:py-[clamp(18px,3.5vh,42px)]">
        <section className="relative isolate flex min-h-[560px] min-w-0 flex-col overflow-hidden rounded-3xl p-5 min-[901px]:h-full min-[901px]:min-h-0 min-[901px]:overflow-visible min-[901px]:rounded-none min-[901px]:p-0" aria-labelledby="login-promise">
          <Image
            className="pointer-events-none absolute left-[25%] top-[27%] -z-10 w-[720px] max-w-none select-none opacity-65 min-[901px]:left-[38%] min-[901px]:top-[30%] min-[901px]:w-[min(760px,58vw)] min-[901px]:opacity-80"
            src="/brand/beseen-attention-rings.svg"
            width={760}
            height={760}
            priority
            alt=""
          />
          <Image
            className="pointer-events-none absolute -bottom-4 -left-16 -z-10 w-[360px] max-w-none select-none min-[901px]:-bottom-2 min-[901px]:-left-10 min-[901px]:w-[min(420px,34vw)]"
            src="/brand/beseen-brand-rays.svg"
            width={460}
            height={310}
            priority
            alt=""
          />

          <BrandLogo className="relative z-10 w-[150px] [@media(max-height:780px)]:w-32 min-[901px]:w-[clamp(128px,10vw,158px)]" />

          <div className="relative z-10 mt-14 max-w-[690px] min-[901px]:mt-[clamp(34px,9vh,116px)] min-[901px]:pl-1.5">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.04em] text-brand [@media(min-height:900px)]:mb-5 [@media(min-height:900px)]:text-base">
              Outcome-based attention
            </p>
            <h1 id="login-promise" className="text-[clamp(43px,11vw,62px)] font-semibold leading-[1.02] tracking-[-0.047em] text-navy min-[901px]:text-[clamp(46px,5vw,76px)]">
              <span className="block">Pay creators for</span>
              <span className="block">replies.</span>
              <em className="block font-semibold not-italic text-[#2852ed]">Guaranteed, or</em>
              <em className="block font-semibold not-italic text-[#2852ed]">refunded.</em>
            </h1>
            <p className="mt-5 text-base leading-7 text-secondary [@media(min-height:900px)]:mt-7 [@media(min-height:900px)]:text-xl [@media(min-height:900px)]:leading-8">
              Access creators, build your Aura,
              <br />
              and turn attention into clear outcomes.
            </p>
          </div>

          <div className="absolute bottom-[12%] left-[34%] z-10 hidden min-h-14 items-center gap-3 rounded-full border border-white/90 bg-white/90 px-5 text-sm font-semibold shadow-[0_12px_32px_rgb(8_8_55/6%)] backdrop-blur min-[1100px]:flex [@media(max-height:760px)]:bottom-9 [@media(max-height:760px)]:min-h-12 [@media(max-height:760px)]:text-xs">
            <CheckCircle2 className="text-success" size={21} aria-hidden="true" />
            <span>No reply means a full refund.</span>
          </div>

          <footer className="relative z-10 mt-auto hidden items-center gap-4 text-xs text-[#657096] min-[901px]:flex [@media(min-height:900px)]:text-sm">
            <span>© 2026 BeSeen</span>
            <i className="font-normal not-italic text-[#8f98b9]" aria-hidden="true">•</i>
            <a className="hover:text-brand" href="#terms">Terms</a>
            <i className="font-normal not-italic text-[#8f98b9]" aria-hidden="true">•</i>
            <a className="hover:text-brand" href="#privacy">Privacy</a>
            <i className="font-normal not-italic text-[#8f98b9]" aria-hidden="true">•</i>
            <a className="hover:text-brand" href="#help">Help</a>
          </footer>
        </section>

        <section className="relative z-20 flex w-full flex-col rounded-[26px] border border-white/90 bg-white/95 px-6 py-6 shadow-[0_22px_60px_rgb(20_55_92/10%)] backdrop-blur-xl min-[901px]:h-[calc(100svh-2.25rem)] min-[901px]:max-h-[48.625rem] min-[901px]:max-w-[524px] min-[901px]:justify-self-end min-[901px]:px-[clamp(28px,3.2vw,48px)] min-[901px]:py-[clamp(24px,3.7vh,42px)] max-sm:rounded-3xl">
          <span className="grid size-12 place-items-center rounded-[13px] bg-info-bg text-brand [@media(min-height:900px)]:size-15 [@media(min-height:900px)]:rounded-[15px]">
            {needsSignature ? <PenLine size={25} aria-hidden="true" /> : <LockKeyhole size={25} aria-hidden="true" />}
          </span>

          <h2 id="welcome-title" className="mt-4 text-[27px] font-semibold tracking-[-0.035em] [@media(min-height:900px)]:mt-6 [@media(min-height:900px)]:text-[31px]">
            {needsSignature ? 'One signature to go' : 'Welcome to BeSeen'}
          </h2>
          <p className="mt-2 max-w-[400px] text-[13px] leading-5 text-secondary [@media(min-height:900px)]:mt-3 [@media(min-height:900px)]:text-[17px] [@media(min-height:900px)]:leading-6.5">
            {needsSignature
              ? `You're connected as ${shortenAddress(auth.address ?? '')}. Approve one small signature in your wallet to unlock your BeSeen keys — it changes nothing on the Stellar network.`
              : 'Sign in to create your Aura and manage your creator presence.'}
          </p>

          <button
            className="mt-5 grid min-h-14 w-full cursor-pointer grid-cols-[76px_1px_minmax(0,1fr)_22px] items-center rounded-[13px] border-0 bg-brand px-5 text-white shadow-[0_10px_22px_rgb(35_70_238/18%)] transition hover:-translate-y-px hover:bg-[#183cdf] disabled:cursor-wait disabled:opacity-70 [@media(min-height:900px)]:mt-7 [@media(min-height:900px)]:min-h-17.5 [@media(min-height:900px)]:grid-cols-[100px_1px_minmax(0,1fr)_25px] [@media(min-height:900px)]:px-7"
            onClick={() => void continueWithBlux()}
            disabled={working}
            type="button"
            aria-busy={working}
          >
            <span className="justify-self-start text-[30px] font-semibold leading-none tracking-[-0.07em] [@media(min-height:900px)]:text-[37px]" aria-hidden="true">blux</span>
            <span className="h-8 w-px bg-white/45" aria-hidden="true" />
            <span className="justify-self-center whitespace-nowrap px-2 text-sm font-semibold [@media(min-height:900px)]:text-[17px]">
              {working ? 'Waiting for Blux…' : needsSignature ? 'Sign to continue' : 'Sign in with Blux'}
            </span>
            <ArrowRight size={22} aria-hidden="true" />
          </button>

          {auth.error && <p className="mt-2 text-xs leading-4 text-error" role="alert">{auth.error}</p>}
          {needsSignature && (
            <button className="mt-2 w-fit cursor-pointer border-0 bg-transparent p-0 text-xs font-semibold text-muted underline underline-offset-3" onClick={() => auth.logout()} type="button">
              Use a different account
            </button>
          )}

          <div className="mt-5 grid grid-cols-[minmax(30px,1fr)_auto_minmax(30px,1fr)] items-center gap-3 text-[#7d8be4] [@media(min-height:900px)]:mt-8 [@media(min-height:900px)]:gap-4">
            <span className="h-px bg-[#cdd5fa]" aria-hidden="true" />
            <strong className="text-[10px] font-bold uppercase tracking-[0.15em] [@media(min-height:900px)]:text-[13px]">Secure by default</strong>
            <span className="h-px bg-[#cdd5fa]" aria-hidden="true" />
          </div>

          <ul className="mt-5 grid gap-3 [@media(min-height:900px)]:mt-8 [@media(min-height:900px)]:gap-4.5">
            <SecurityFeature icon={<ShieldCheck size={25} />} title="One secure account">Access with email, wallet, or passkey.</SecurityFeature>
            <SecurityFeature icon={<KeyRound size={25} />} title="No seed phrases">Blux handles keys securely.</SecurityFeature>
            <SecurityFeature icon={<LockKeyhole size={25} />} title="Never share private keys">Your assets and identity stay protected.</SecurityFeature>
          </ul>

          <p className="mt-auto pt-4 text-[10px] leading-4 text-muted [@media(min-height:900px)]:pt-7 [@media(min-height:900px)]:text-[13px] [@media(min-height:900px)]:leading-5">
            Secure sign-in is handled by Blux on Stellar {stellarNetwork}.<br />
            BeSeen never receives your wallet seed or private signing keys.
          </p>
        </section>
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
