'use client';

import { ImageUp, KeyRound, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { LoadingState } from '@/components/ui/states';
import { StatusBadge } from '@/components/ui/status-badge';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/blux';
import { APP_URL } from '@/lib/constants';
import { readLogoFile } from '@/lib/utils';
import { useToast } from '@/providers/toast-provider';

export default function ProfilePage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = auth.user;

  useEffect(() => {
    if (!user) return;
    setUsername(user.username);
    setAvatarUrl(user.avatarUrl);
  }, [user]);

  if (!user) return <LoadingState label="Loading your profile…" />;

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

  async function save() {
    if (!user) return;
    setError(null);
    setSaving(true);
    try {
      const changes = {
        ...(username !== user.username ? { username } : {}),
        ...(avatarUrl !== user.avatarUrl ? { avatarUrl } : {}),
      };
      if (Object.keys(changes).length === 0) {
        toast('Nothing to update', 'Your profile already matches these values.');
        return;
      }
      const updated = await api.updateUser(user.walletAddress, changes);
      auth.setUser(updated);
      toast('Profile updated', 'Your latest changes are now live.');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Your profile could not be updated.',
      );
    } finally {
      setSaving(false);
    }
  }

  const profileUrl = `${APP_URL}/${username || user.username}`;

  return (
    <div className="mx-auto w-full max-w-300 px-12 pb-16 pt-12 max-[1180px]:px-8 max-[1180px]:pb-14 max-[1180px]:pt-10 max-sm:px-4 max-sm:pb-12 max-sm:pt-7.5">
      <PageHeader
        eyebrow="Your account"
        title="Profile"
        description="Your public profile is just a username and a logo."
      />

      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(300px,0.65fr)] gap-5 max-[900px]:grid-cols-1">
        <section className="rounded-2xl border border-border bg-white p-7 max-sm:p-5">
          <label className="grid max-w-100 gap-2 text-[13px] font-semibold">
            Username
            <div className="flex min-h-12 items-center rounded-xl border border-border bg-white px-3.5 focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgb(16_69_245/10%)]">
              <span className="text-muted">@</span>
              <input
                className="min-w-0 flex-1 border-0 bg-transparent px-2 outline-none"
                value={username}
                maxLength={30}
                onChange={(event) =>
                  setUsername(event.target.value.toLowerCase())
                }
              />
            </div>
          </label>

          <div className="mt-5 grid gap-2 text-[13px] font-semibold">
            Logo
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
            <p className="mt-5 rounded-xl bg-error-bg p-3 text-xs text-error" role="alert">
              {error}
            </p>
          )}
          <Button
            className="mt-6"
            loading={saving}
            icon={<Save size={18} />}
            onClick={() => void save()}
          >
            Save profile
          </Button>
        </section>

        <aside className="h-fit rounded-2xl border border-border bg-white p-7 max-sm:p-5">
          <span className="text-xs font-bold uppercase tracking-[0.09em] text-brand">
            Public preview
          </span>
          <div className="mt-5 flex items-center gap-4">
            <Avatar username={username || user.username} src={avatarUrl} size="lg" />
            <div>
              <strong className="text-lg">@{username || user.username}</strong>
              <p className="text-xs text-muted">on BeSeen</p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between gap-2 rounded-xl bg-subtle p-3">
            <span className="min-w-0 truncate text-xs font-semibold">
              {profileUrl}
            </span>
            <CopyButton value={profileUrl} label="Copy profile link" />
          </div>
          <div className="mt-6 border-t border-border pt-5">
            <StatusBadge tone="success">
              <KeyRound size={13} /> Sign-in key active
            </StatusBadge>
            <p className="mt-3 break-all text-[11px] leading-5 text-muted">
              {user.derivedPublicKey}
            </p>
            <p className="mt-2 text-[11px] leading-5 text-muted">
              This public key was derived from your wallet signature and is the
              only key the server knows. The secret half stays on your devices.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
