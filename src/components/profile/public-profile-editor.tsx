import { Pencil, Save, Sparkles, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AVATAR_ALLOWED_TYPES } from '@/lib/avatar';

interface PublicProfileEditorProps {
  username: string;
  avatarUrl: string | null;
  showAvatarInput: boolean;
  avatarFileName: string | null;
  avatarError: string | null;
  avatarValidating: boolean;
  saving: boolean;
  error: string | null;
  onUsernameChange: (username: string) => void;
  onAvatarFileChange: (file: File) => Promise<void>;
  onRemoveAvatar: () => void;
  onToggleAvatarInput: () => void;
  onSave: () => void;
}

export function PublicProfileEditor({
  username,
  avatarUrl,
  showAvatarInput,
  avatarFileName,
  avatarError,
  avatarValidating,
  saving,
  error,
  onUsernameChange,
  onAvatarFileChange,
  onRemoveAvatar,
  onToggleAvatarInput,
  onSave,
}: PublicProfileEditorProps) {
  const avatarInputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="rounded-2xl border border-border bg-white p-6 max-sm:p-5">
      <h2 className="text-xl font-semibold">Public profile</h2>
      <p className="mt-1.5 text-sm text-secondary">
        This is how others will see and recognize you on BeSeen.
      </p>

      <label className="mt-7 grid gap-2 text-xs font-semibold">
        Username
        <div className="flex min-h-12 items-center rounded-xl border border-border bg-white px-3.5 focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/10">
          <span className="font-semibold text-navy">@</span>
          <input
            className="min-w-0 flex-1 border-0 bg-transparent px-1 outline-none"
            value={username}
            maxLength={30}
            onChange={(event) =>
              onUsernameChange(
                event.target.value.toLowerCase().replace(/^@/, ''),
              )
            }
          />
        </div>
      </label>

      <div className="mt-6">
        <span className="text-xs font-semibold">Profile image</span>
        <div className="mt-3 flex justify-center">
          <Avatar
            username={username}
            src={avatarUrl}
            size="xl"
            className="size-25 text-3xl"
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-semibold transition hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onToggleAvatarInput}
            type="button"
            disabled={saving}
          >
            <Pencil size={17} /> Change image
          </button>
          <button
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-semibold text-error transition hover:bg-error-bg disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => {
              if (avatarInputRef.current) avatarInputRef.current.value = '';
              onRemoveAvatar();
            }}
            type="button"
            disabled={saving || !avatarUrl}
          >
            <Trash2 size={17} /> Remove
          </button>
        </div>
        {showAvatarInput && (
          <label className="mt-3 grid gap-2 text-xs font-semibold">
            Select profile image
            <input
              ref={avatarInputRef}
              className="min-h-11 w-full rounded-xl border border-border px-3.5 py-2 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-info-bg file:px-3 file:py-2 file:font-semibold file:text-brand focus:border-brand"
              type="file"
              accept={AVATAR_ALLOWED_TYPES.join(',')}
              aria-describedby={avatarError ? 'profile-avatar-help profile-avatar-error' : 'profile-avatar-help'}
              aria-invalid={avatarError ? true : undefined}
              disabled={saving || avatarValidating}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) await onAvatarFileChange(file);
                event.target.value = '';
              }}
            />
            <small id="profile-avatar-help" className="font-normal text-muted">
              JPEG, PNG, or WebP · max 5 MB · minimum 128×128 pixels
            </small>
            {avatarValidating && (
              <small className="font-normal text-muted">Checking profile image…</small>
            )}
            {avatarFileName && !avatarValidating && !avatarError && (
              <small className="font-normal text-success">Selected: {avatarFileName}</small>
            )}
            {avatarError && (
              <small id="profile-avatar-error" className="font-normal text-error" role="alert">
                {avatarError}
              </small>
            )}
          </label>
        )}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#d5dcff] bg-[#f7f8ff] p-4">
        <Sparkles className="mt-0.5 shrink-0 text-brand" size={21} />
        <p className="text-xs leading-5 text-secondary">
          <strong className="block text-navy">
            Tip: Keep it simple and recognizable.
          </strong>
          Your profile image helps others notice and trust your presence.
        </p>
      </div>

      {error && (
        <p
          className="mt-4 rounded-xl bg-error-bg p-3 text-xs text-error"
          role="alert"
        >
          {error}
        </p>
      )}
      <Button
        className="mt-5"
        loading={saving}
        disabled={avatarValidating || Boolean(avatarError)}
        icon={<Save size={18} />}
        onClick={onSave}
      >
        Save changes
      </Button>
    </section>
  );
}
