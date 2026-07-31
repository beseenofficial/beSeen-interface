'use client';

import { Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { OnboardingShell } from '@/components/layout/onboarding-shell';
import { AuraRipple } from '@/components/ui/aura-ripple';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  ApiError,
  authApi,
  profileApi,
  registrationErrorMessage,
  validateUsername,
} from '@/lib/api';
import { AVATAR_ALLOWED_TYPES, validateAvatar } from '@/lib/avatar';
import { useAuth } from '@/lib/blux';
import { APP_URL } from '@/lib/constants';
import { useToast } from '@/providers/toast-provider';

type Availability = 'idle' | 'checking' | 'available' | 'unavailable';

export default function OnboardingPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarValidating, setAvatarValidating] = useState(false);
  const [availability, setAvailability] = useState<Availability>('idle');
  const [availabilityReason, setAvailabilityReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const avatarPreviewRef = useRef<string | null>(null);
  const avatarValidationId = useRef(0);
  const submissionInProgress = useRef(false);

  useEffect(
    () => () => {
      if (avatarPreviewRef.current) URL.revokeObjectURL(avatarPreviewRef.current);
    },
    [],
  );

  useEffect(() => {
    let active = true;
    if (!validateUsername(username)) {
      setAvailability('idle');
      setAvailabilityReason(null);
      return;
    }
    setAvailability('checking');
    const timer = window.setTimeout(async () => {
      const result = await profileApi.availability(username);
      if (!active) return;
      setAvailability(result.available ? 'available' : 'unavailable');
      setAvailabilityReason(result.reason);
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [username]);

  function clearAvatar(resetInput = true) {
    avatarValidationId.current += 1;
    if (avatarPreviewRef.current) URL.revokeObjectURL(avatarPreviewRef.current);
    avatarPreviewRef.current = null;
    setAvatarFile(null);
    setAvatarPreviewUrl(null);
    setAvatarValidating(false);
    if (resetInput && avatarInputRef.current) avatarInputRef.current.value = '';
  }

  async function selectAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    clearAvatar(false);
    setAvatarError(null);
    if (!file) return;

    const validationId = avatarValidationId.current;
    setAvatarValidating(true);
    try {
      await validateAvatar(file);
      if (validationId !== avatarValidationId.current) return;
      const previewUrl = URL.createObjectURL(file);
      avatarPreviewRef.current = previewUrl;
      setAvatarFile(file);
      setAvatarPreviewUrl(previewUrl);
    } catch (cause) {
      if (validationId !== avatarValidationId.current) return;
      setAvatarError(
        cause instanceof Error ? cause.message : 'The selected profile image is invalid.',
      );
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    } finally {
      if (validationId === avatarValidationId.current) setAvatarValidating(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submissionInProgress.current) return;
    setError(null);
    if (avatarValidating) return;
    if (avatarError) return;
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
    if (!auth.address || !auth.keys) {
      setError('Your session expired. Sign in again to continue.');
      return;
    }

    submissionInProgress.current = true;
    setSubmitting(true);
    try {
      const user = await authApi.register({
        walletAddress: auth.address,
        username,
        avatarFile: avatarFile ?? undefined,
        keys: auth.keys,
      });
      auth.setUser(user);
      toast(
        'Your BeSeen profile is live',
        `${APP_URL}/${user.username} is ready to share.`,
      );
      // RouteGuard sees status "ready" and moves us to /dashboard.
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'WALLET_ALREADY_REGISTERED') {
        await auth.completeSignIn();
        return;
      }
      setError(registrationErrorMessage(cause));
    } finally {
      submissionInProgress.current = false;
      setSubmitting(false);
    }
  }

  return (
    <OnboardingShell>
      <section className="mx-auto grid h-full min-h-0 w-full max-w-295 grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] overflow-hidden rounded-3xl border border-border bg-white shadow-elevated max-[900px]:h-auto max-[900px]:grid-cols-1">
        <form className="min-w-0 p-[clamp(32px,5vh,56px)] max-sm:p-6 max-sm:py-9" onSubmit={submit}>
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
            <label htmlFor="avatar-input">Profile image</label>
            <span className="-mt-1 font-normal text-muted">
              Optional · JPEG, PNG, or WebP · max 5 MB
            </span>
            <div className="flex items-center gap-4">
              <Avatar username={username || null} src={avatarPreviewUrl} size="lg" />
              <input
                ref={avatarInputRef}
                id="avatar-input"
                className="min-h-12 min-w-0 flex-1 rounded-xl border border-border px-3.5 py-2 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-info-bg file:px-3 file:py-2 file:font-semibold file:text-brand focus:border-brand"
                type="file"
                accept={AVATAR_ALLOWED_TYPES.join(',')}
                aria-describedby={avatarError ? 'avatar-help avatar-error' : 'avatar-help'}
                aria-invalid={avatarError ? true : undefined}
                disabled={submitting}
                onChange={selectAvatar}
              />
            </div>
            <small id="avatar-help" className="font-normal text-muted">
              Minimum dimensions: 128×128 pixels.
            </small>
            {avatarValidating && (
              <small className="font-normal text-muted">Checking profile image…</small>
            )}
            {avatarError && (
              <small id="avatar-error" className="font-normal text-error" role="alert">
                {avatarError}
              </small>
            )}
            {avatarFile && !avatarValidating && (
              <button
                className="w-fit text-xs font-semibold text-brand hover:underline"
                type="button"
                disabled={submitting}
                onClick={() => {
                  clearAvatar();
                  setAvatarError(null);
                }}
              >
                Remove profile image
              </button>
            )}
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
              loading={submitting || avatarValidating}
              disabled={Boolean(avatarError)}
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
          className="relative flex min-h-0 min-w-0 flex-col items-center justify-center overflow-hidden bg-[#fff6f3] p-10 text-center max-[900px]:order-first max-[900px]:min-h-95 max-sm:min-h-75 max-sm:p-6"
          aria-label="Public profile preview"
        >
          <AuraRipple
            className="absolute -right-25 -top-25 size-115"
            tone="peach"
          />
          <span className="relative z-1 mb-5 text-[10px] font-bold uppercase tracking-[0.09em] text-[#b65d48]">
            Your public identity
          </span>
          <Avatar username={username || null} src={avatarPreviewUrl} size="xl" />
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
