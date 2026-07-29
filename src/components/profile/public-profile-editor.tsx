import { Pencil, Save, Sparkles, Trash2 } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface PublicProfileEditorProps {
  username: string;
  avatarUrl: string | null;
  showAvatarInput: boolean;
  saving: boolean;
  error: string | null;
  onUsernameChange: (username: string) => void;
  onAvatarUrlChange: (url: string | null) => void;
  onToggleAvatarInput: () => void;
  onSave: () => void;
}

export function PublicProfileEditor({
  username,
  avatarUrl,
  showAvatarInput,
  saving,
  error,
  onUsernameChange,
  onAvatarUrlChange,
  onToggleAvatarInput,
  onSave,
}: PublicProfileEditorProps) {
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
        <span className="text-xs font-semibold">Profile logo</span>
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
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-semibold transition hover:bg-subtle"
            onClick={onToggleAvatarInput}
            type="button"
          >
            <Pencil size={17} /> Change logo
          </button>
          <button
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-semibold text-error transition hover:bg-error-bg"
            onClick={() => onAvatarUrlChange(null)}
            type="button"
          >
            <Trash2 size={17} /> Remove
          </button>
        </div>
        {showAvatarInput && (
          <label className="mt-3 grid gap-2 text-xs font-semibold">
            Image URL
            <input
              className="min-h-11 w-full rounded-xl border border-border px-3.5 text-sm outline-none focus:border-brand"
              type="url"
              value={avatarUrl ?? ''}
              placeholder="https://…"
              onChange={(event) =>
                onAvatarUrlChange(event.target.value || null)
              }
            />
          </label>
        )}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#d5dcff] bg-[#f7f8ff] p-4">
        <Sparkles className="mt-0.5 shrink-0 text-brand" size={21} />
        <p className="text-xs leading-5 text-secondary">
          <strong className="block text-navy">
            Tip: Keep it simple and recognizable.
          </strong>
          Your logo helps others notice and trust your presence.
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
        icon={<Save size={18} />}
        onClick={onSave}
      >
        Save changes
      </Button>
    </section>
  );
}
