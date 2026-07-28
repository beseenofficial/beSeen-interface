'use client';

import { ImageUp, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { OnboardingShell } from '@/components/layout/onboarding-shell';
import { AuraRipple } from '@/components/ui/aura-ripple';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { api, validateUsername } from '@/lib/api';
import { useAuth } from '@/lib/blux';
import { APP_URL } from '@/lib/constants';
import { readLogoFile } from '@/lib/utils';
import { useToast } from '@/providers/toast-provider';

type Availability = 'idle' | 'checking' | 'available' | 'unavailable';

export default function OnboardingPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Availability>('idle');
  const [availabilityReason, setAvailabilityReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    if (!validateUsername(username)) {
      setAvailability('idle');
      setAvailabilityReason(null);
      return;
    }
    setAvailability('checking');
    const timer = window.setTimeout(async () => {
      const result = await api.checkUsername(username);
      if (!active) return;
      setAvailability(result.available ? 'available' : 'unavailable');
      setAvailabilityReason(result.reason);
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [username]);

  async function chooseLogo(file: File | undefined) {
    setError(null);
    if (!file) return;
    try {
      setAvatarUrl(await readLogoFile(file));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'The logo could not be read.',
      );
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!validateUsername(username)) {
      setError('Use 3–30 lowercase letters, numbers, or underscores.');
      return;
    }
    if (availability === 'unavailable') {
      setError(
        availabilityReason === 'reserved'
          ? 'That username is reserved.'
          : 'That username is unavailable.',
      );
      return;
    }
    if (!auth.address || !auth.keypair) {
      setError('Your session expired. Sign in again to continue.');
      return;
    }

    setSubmitting(true);
    try {
      // The only things the server learns about this account: the wallet
      // address, the derived public key, and the profile below.
      const user = await api.register({
        walletAddress: auth.address,
        derivedPublicKey: auth.keypair.publicKey(),
        username,
        avatarUrl,
      });
      auth.setUser(user);
      toast(
        'Your BeSeen profile is live',
        `${APP_URL}/${user.username} is ready to share.`,
      );
      // RouteGuard sees status "ready" and moves us to /dashboard.
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Your BeSeen account could not be created.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <OnboardingShell>
      <section className="mx-auto grid min-h-155 w-full max-w-295 grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] overflow-hidden rounded-3xl border border-border bg-white shadow-elevated max-[900px]:grid-cols-1 max-sm:min-h-0">
        <form className="p-14 max-sm:p-6 max-sm:py-9" onSubmit={submit}>
          <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.09em] text-brand">
            BeSeen identity
          </span>
          <h1 className="text-[clamp(38px,5vw,56px)] font-semibold">
            Pick your name
          </h1>
          <p className="mt-4 max-w-155 text-secondary">
            A username and an optional logo — that&apos;s all your public
            BeSeen profile needs.
          </p>

          <label className="mt-8 grid max-w-120 gap-2 text-[13px] font-semibold">
            Username
            <div className="flex min-h-12 items-center rounded-xl border border-border bg-white px-3.5 focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgb(16_69_245/10%)]">
              <span className="text-muted">@</span>
              <input
                className="min-w-0 flex-1 border-0 bg-transparent px-2 outline-none"
                autoComplete="username"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value.toLowerCase().slice(0, 30))
                }
                placeholder="yourname"
              />
            </div>
            <small
              className={
                availability === 'unavailable'
                  ? 'font-normal text-error'
                  : 'font-normal text-success'
              }
            >
              {availability === 'checking' && 'Checking availability…'}
              {availability === 'available' && 'Username is available'}
              {availability === 'unavailable' &&
                `Username is ${availabilityReason ?? 'unavailable'}`}
              {availability === 'idle' &&
                '3–30 lowercase letters, numbers, or _'}
            </small>
          </label>

          <div className="mt-6 grid max-w-120 gap-2 text-[13px] font-semibold">
            Logo <span className="-mt-1 font-normal text-muted">Optional</span>
            <div className="flex items-center gap-4">
              <Avatar username={username || null} src={avatarUrl} size="lg" />
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-semibold transition hover:border-[#a9c2ca] hover:bg-subtle">
                <ImageUp size={17} />
                {avatarUrl ? 'Change logo' : 'Upload logo'}
                <input
                  className="sr-only"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    void chooseLogo(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />
              </label>
              {avatarUrl && (
                <button
                  className="inline-flex size-10 cursor-pointer items-center justify-center rounded-[10px] border-0 bg-transparent text-muted hover:bg-subtle hover:text-error"
                  type="button"
                  aria-label="Remove logo"
                  onClick={() => setAvatarUrl(null)}
                >
                  <X size={17} />
                </button>
              )}
            </div>
          </div>

          {error && (
            <p
              className="mt-6 max-w-120 rounded-xl bg-error-bg p-3 text-xs text-error"
              role="alert"
            >
              {error}
            </p>
          )}
          <div className="mt-8 flex items-center gap-3 max-sm:flex-col max-sm:items-stretch max-sm:[&_button]:w-full">
            <Button
              type="submit"
              loading={submitting}
              icon={<Sparkles size={18} />}
            >
              Create BeSeen account
            </Button>
            <Button
              type="button"
              variant="tertiary"
              onClick={() => auth.logout()}
            >
              Sign out
            </Button>
          </div>
        </form>

        <aside
          className="relative flex min-h-125 flex-col items-center justify-center overflow-hidden bg-[#fff6f3] p-10 text-center max-[900px]:order-first max-[900px]:min-h-95 max-sm:min-h-75 max-sm:p-6"
          aria-label="Public profile preview"
        >
          <AuraRipple
            className="absolute -right-25 -top-25 size-115"
            tone="peach"
          />
          <span className="relative z-1 mb-5 text-[10px] font-bold uppercase tracking-[0.09em] text-[#b65d48]">
            Your public identity
          </span>
          <Avatar username={username || null} src={avatarUrl} size="xl" />
          <h2 className="relative z-1 mt-4 text-[28px] font-semibold">
            @{username || 'yourname'}
          </h2>
          <div className="relative z-1 mt-6 max-w-full break-words rounded-xl border border-white/70 bg-white/80 px-4 py-3 text-sm font-semibold shadow-[0_8px_20px_rgb(11_11_63/6%)]">
            {APP_URL.replace(/^https?:\/\//, '')}/{username || 'yourname'}
          </div>
        </aside>
      </section>
    </OnboardingShell>
  );
}
