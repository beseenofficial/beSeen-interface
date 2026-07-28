'use client';

import { ArrowLeft, Sparkles, UserRound, WandSparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { OnboardingShell } from '@/components/layout/onboarding-shell';
import { Avatar } from '@/components/ui/avatar';
import { AuraRipple } from '@/components/ui/aura-ripple';
import { Button } from '@/components/ui/button';
import { APP_URL } from '@/lib/constants';
import { ApiError } from '@/lib/api-client';
import { signSep10Challenge } from '@/lib/blux-signing';
import { beseenApi } from '@/lib/beseen-api';
import {
  clearLocalBeSeenKeys,
  loadLocalBeSeenKeys,
  localPublicKeys,
} from '@/lib/crypto/messaging-keys';
import { validateUsername } from '@/lib/onboarding';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/providers/toast-provider';
import type { AccountType, RegistrationProfileInput } from '@/types';

type Availability = 'idle' | 'checking' | 'available' | 'unavailable';

const fieldClass =
  'min-h-12 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-navy outline-none transition-[border,box-shadow] placeholder:text-[#969db0] focus:border-brand focus:shadow-[0_0_0_3px_rgb(16_69_245/10%)]';

function commaList(value: string) {
  const seen = new Set<string>();
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => {
      const key = item.toLowerCase();
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function validHttpUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('creator');
  const [headline, setHeadline] = useState('');
  const [categoriesText, setCategoriesText] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isAvailableForWork, setIsAvailableForWork] = useState(false);
  const [availability, setAvailability] = useState<Availability>('idle');
  const [availabilityReason, setAvailabilityReason] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const categories = useMemo(() => commaList(categoriesText), [categoriesText]);
  const skills = useMemo(() => commaList(skillsText), [skillsText]);

  useEffect(() => {
    let active = true;
    if (!validateUsername(username)) {
      setAvailability('idle');
      setAvailabilityReason(null);
      return;
    }
    setAvailability('checking');
    const timer = window.setTimeout(async () => {
      try {
        const result = await beseenApi.checkUsername(username);
        if (!active) return;
        setAvailability(result.available ? 'available' : 'unavailable');
        setAvailabilityReason(result.reason);
      } catch {
        if (active) {
          setAvailability('idle');
          setAvailabilityReason(null);
        }
      }
    }, 350);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [username]);

  function validateForm() {
    if (!validateUsername(username)) {
      return 'Use 3–30 lowercase letters, numbers, or underscores.';
    }
    if (availability === 'unavailable') {
      return availabilityReason === 'reserved'
        ? 'That username is reserved.'
        : 'That username is unavailable.';
    }
    if (!displayName.trim() || displayName.trim().length > 50) {
      return 'Display name must contain 1–50 characters.';
    }
    if (bio.trim().length > 300) return 'Bio can contain up to 300 characters.';
    if (avatarUrl.length > 2_048 || !validHttpUrl(avatarUrl.trim())) {
      return 'Avatar URL must be a valid http or https URL.';
    }
    if (accountType === 'creator') {
      if (!headline.trim() || headline.trim().length > 100) {
        return 'Creator headline must contain 1–100 characters.';
      }
      if (
        categories.length < 1 ||
        categories.length > 5 ||
        categories.some((item) => item.length > 32)
      ) {
        return 'Add 1–5 categories, each no longer than 32 characters.';
      }
      if (skills.length > 20 || skills.some((item) => item.length > 50)) {
        return 'Add at most 20 skills, each no longer than 50 characters.';
      }
      if (!validHttpUrl(websiteUrl.trim())) {
        return 'Website must be a valid http or https URL.';
      }
    }
    return null;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!auth.address) {
      setError(
        "We couldn't read your connected Stellar account. Reconnect through Blux and try again.",
      );
      return;
    }

    setSubmitting(true);
    let localKeys: Awaited<ReturnType<typeof loadLocalBeSeenKeys>> = null;
    try {
      localKeys = await loadLocalBeSeenKeys(auth.address);
      if (!localKeys) {
        router.replace('/onboarding/security');
        return;
      }
      const publicKeys = localPublicKeys(localKeys);
      const config = await beseenApi.getAuthConfig();
      const challenge = await beseenApi.createRegistrationChallenge(
        auth.address,
        publicKeys,
      );
      const signedTransactionXdr = await signSep10Challenge({
        walletAddress: auth.address,
        challenge,
        config,
        signTransaction: auth.signTransaction,
      });
      const profile: RegistrationProfileInput = {
        username: username.trim().toLowerCase(),
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim() || null,
        accountType,
        ...(accountType === 'creator'
          ? {
              creatorProfile: {
                headline: headline.trim(),
                categories,
                skills,
                websiteUrl: websiteUrl.trim() || null,
                isAvailableForWork,
              },
            }
          : {}),
      };
      const registered = await beseenApi.register(
        challenge.challengeId,
        signedTransactionXdr,
        profile,
      );
      await auth.completeRegistration(registered);
      toast(
        'Your BeSeen profile is live',
        `${APP_URL}/${registered.user.username} is ready to share.`,
      );
      router.replace('/dashboard');
    } catch (cause) {
      if (cause instanceof ApiError && cause.issues.length) {
        setError(cause.issues.map((issue) => issue.message).join(' '));
      } else {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Your BeSeen account could not be created.',
        );
      }
    } finally {
      if (localKeys) clearLocalBeSeenKeys(localKeys);
      setSubmitting(false);
    }
  }

  return (
    <OnboardingShell step={2}>
      <section className="mx-auto grid min-h-155 w-full max-w-320 grid-cols-[minmax(0,1.2fr)_minmax(340px,0.65fr)] overflow-hidden rounded-3xl border border-border bg-white shadow-elevated max-[980px]:grid-cols-1">
        <form className="p-14 max-sm:p-6 max-sm:py-9" onSubmit={submit}>
          <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.09em] text-brand">
            BeSeen identity
          </span>
          <h1 className="text-[clamp(38px,5vw,56px)] font-semibold">
            Create your profile
          </h1>
          <p className="mt-4 max-w-170 text-secondary">
            Choose how you want to show up on BeSeen. Create a simple profile or
            unlock creator tools and broadcasts.
          </p>

          <div className="mt-7 grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <label className="grid gap-2 text-[13px] font-semibold">
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
            <label className="grid gap-2 text-[13px] font-semibold">
              Display name
              <input
                className={fieldClass}
                value={displayName}
                onChange={(event) =>
                  setDisplayName(event.target.value.slice(0, 50))
                }
                placeholder="Your public name"
                maxLength={50}
              />
              <small className="font-normal text-muted">
                {displayName.length}/50
              </small>
            </label>
          </div>

          <label className="mt-5 grid gap-2 text-[13px] font-semibold">
            Bio <span className="font-normal text-muted">Optional</span>
            <textarea
              className={`${fieldClass} min-h-24 resize-y py-3`}
              value={bio}
              onChange={(event) => setBio(event.target.value.slice(0, 300))}
              placeholder="A short introduction"
              maxLength={300}
            />
            <small className="text-right font-normal text-muted">
              {bio.length}/300
            </small>
          </label>

          <label className="mt-5 grid gap-2 text-[13px] font-semibold">
            Avatar URL <span className="font-normal text-muted">Optional</span>
            <input
              className={fieldClass}
              type="url"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://cdn.example/avatar.webp"
            />
          </label>

          <fieldset className="mt-6">
            <legend className="text-[13px] font-semibold">Account type</legend>
            <div className="mt-2 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              {(['creator', 'regular'] as const).map((type) => (
                <label
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    accountType === type
                      ? 'border-brand bg-info-bg'
                      : 'border-border bg-white hover:bg-subtle'
                  }`}
                  key={type}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="accountType"
                    checked={accountType === type}
                    onChange={() => setAccountType(type)}
                  />
                  <strong className="capitalize">{type}</strong>
                  <span className="mt-1 block text-xs font-normal text-muted">
                    {type === 'creator'
                      ? 'Publish encrypted broadcasts and show creator details.'
                      : 'Receive encrypted broadcasts with a public profile.'}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {accountType === 'creator' && (
            <section className="mt-6 rounded-2xl border border-[#d9d1ff] bg-[#faf9ff] p-5">
              <div className="flex items-center gap-2">
                <WandSparkles className="text-[#6555bd]" size={19} />
                <h2 className="text-lg">Creator details</h2>
              </div>
              <div className="mt-4 grid gap-4">
                <label className="grid gap-2 text-[13px] font-semibold">
                  Headline
                  <input
                    className={fieldClass}
                    value={headline}
                    onChange={(event) =>
                      setHeadline(event.target.value.slice(0, 100))
                    }
                    placeholder="Visual storyteller"
                    maxLength={100}
                  />
                </label>
                <label className="grid gap-2 text-[13px] font-semibold">
                  Categories
                  <input
                    className={fieldClass}
                    value={categoriesText}
                    onChange={(event) => setCategoriesText(event.target.value)}
                    placeholder="Photography, Art"
                  />
                  <small className="font-normal text-muted">
                    1–5 unique comma-separated categories ({categories.length}
                    /5)
                  </small>
                </label>
                <label className="grid gap-2 text-[13px] font-semibold">
                  Skills{' '}
                  <span className="font-normal text-muted">Optional</span>
                  <input
                    className={fieldClass}
                    value={skillsText}
                    onChange={(event) => setSkillsText(event.target.value)}
                    placeholder="Editing, Direction"
                  />
                </label>
                <label className="grid gap-2 text-[13px] font-semibold">
                  Website{' '}
                  <span className="font-normal text-muted">Optional</span>
                  <input
                    className={fieldClass}
                    type="url"
                    value={websiteUrl}
                    onChange={(event) => setWebsiteUrl(event.target.value)}
                    placeholder="https://creator.example"
                  />
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-white p-3 text-[13px] font-semibold">
                  <input
                    className="size-4 accent-brand"
                    type="checkbox"
                    checked={isAvailableForWork}
                    onChange={(event) =>
                      setIsAvailableForWork(event.target.checked)
                    }
                  />
                  Available for work
                </label>
              </div>
            </section>
          )}

          {error && (
            <p
              className="mt-5 rounded-xl bg-error-bg p-3 text-xs text-error"
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
              icon={<ArrowLeft size={18} />}
              onClick={() => router.push('/onboarding/security')}
            >
              Back
            </Button>
          </div>
        </form>

        <aside
          className="relative flex min-h-125 flex-col items-center justify-center overflow-hidden bg-[#fff6f3] p-10 text-center max-[980px]:order-first max-[980px]:min-h-100 max-sm:min-h-85 max-sm:p-6"
          aria-label="Public profile preview"
        >
          <AuraRipple
            className="absolute -right-25 -top-25 size-115"
            tone="peach"
          />
          <span className="relative z-1 mb-5 text-[10px] font-bold uppercase tracking-[0.09em] text-[#b65d48]">
            Your public identity
          </span>
          <Avatar
            username={username || null}
            src={avatarUrl || null}
            size="xl"
          />
          <h2 className="relative z-1 mt-4 text-[28px] font-semibold">
            {displayName || 'Your name'}
          </h2>
          <p className="relative z-1 mt-1 text-xs text-muted">
            @{username || 'yourname'} · {accountType}
          </p>
          {accountType === 'creator' && headline && (
            <p className="relative z-1 mt-3 max-w-70 text-sm text-secondary">
              {headline}
            </p>
          )}
          <div className="relative z-1 mt-6 max-w-full break-words rounded-xl border border-white/70 bg-white/80 px-4 py-3 text-sm font-semibold shadow-[0_8px_20px_rgb(11_11_63/6%)]">
            {APP_URL.replace(/^https?:\/\//, '')}/{username || 'yourname'}
          </div>
          <span className="relative z-1 mt-5 flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-[10px] font-semibold text-muted">
            <UserRound size={14} /> Stellar Testnet identity
          </span>
        </aside>
      </section>
    </OnboardingShell>
  );
}
