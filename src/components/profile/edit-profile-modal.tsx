'use client';

import { Camera, Trash2, X } from 'lucide-react';
import { useId, useRef, type ChangeEvent } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { AVATAR_ALLOWED_TYPES } from '@/lib/avatar';
import { BIO_MAX_CODE_POINTS, bioCodePointLength, bioValidationError } from '@/lib/profile-validation';
import type { User } from '@/types';

type EditProfileModalProps = {
  open: boolean;
  user: User;
  username: string;
  bio: string;
  visibleAvatar: string | null;
  avatarFile: File | null;
  saving: boolean;
  avatarValidating: boolean;
  avatarError: string | null;
  error: string | null;
  onClose: () => void;
  onSave: () => void;
  onUsernameChange: (username: string) => void;
  onBioChange: (bio: string) => void;
  onSelectAvatar: (file: File) => Promise<void>;
  onRemoveAvatar: () => void;
};

export function EditProfileModal({
  open,
  user,
  username,
  bio,
  visibleAvatar,
  avatarFile,
  saving,
  avatarValidating,
  avatarError,
  error,
  onClose,
  onSave,
  onUsernameChange,
  onBioChange,
  onSelectAvatar,
  onRemoveAvatar,
}: EditProfileModalProps) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bioError = bioValidationError(bio);
  const bioLength = bioCodePointLength(bio.trim());

  const chooseAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await onSelectAvatar(file);
    event.target.value = '';
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeOnBackdrop={false}
      initialFocusRef={closeButton}
      ariaLabelledBy={titleId}
      className="w-full max-w-145 overflow-hidden rounded-2xl bg-white shadow-[0_28px_90px_rgb(11_11_63/28%)] sm:rounded-3xl"
    >
      <form onSubmit={(event) => { event.preventDefault(); onSave(); }}>
        <header className="flex min-h-17 min-w-0 items-center gap-2 border-b border-border px-3 min-[380px]:gap-4 min-[380px]:px-5">
          <button ref={closeButton} className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-subtle" type="button" onClick={onClose} aria-label="Close profile editor"><X size={20} /></button>
          <h2 id={titleId} className="min-w-0 flex-1 truncate text-lg font-semibold min-[380px]:text-xl">Edit profile</h2>
          <Button className="min-h-10 shrink-0 rounded-full px-4 min-[380px]:px-5" type="submit" loading={saving} disabled={avatarValidating || Boolean(avatarError) || Boolean(bioError)}>Save</Button>
        </header>

        <div className="max-h-[calc(100svh-5.75rem)] overflow-y-auto px-4 py-6 min-[380px]:px-5 sm:max-h-[calc(100svh-7rem)] sm:px-6 sm:py-7">
          <div className="flex min-w-0 flex-col items-start gap-4 min-[420px]:flex-row min-[420px]:items-center min-[420px]:gap-5">
            <div className="relative size-24 shrink-0 overflow-hidden rounded-full leading-none min-[380px]:size-28">
              <Avatar username={username || user.username} src={visibleAvatar} size="xl" className="block size-24 text-3xl min-[380px]:size-28" />
              <label className="absolute inset-0 grid size-full cursor-pointer place-items-center overflow-hidden rounded-full bg-navy/45 text-white opacity-0 transition hover:opacity-100 focus-within:opacity-100" aria-label="Choose a new profile image">
                <Camera size={24} />
                <input className="sr-only" type="file" accept={AVATAR_ALLOWED_TYPES.join(',')} disabled={saving || avatarValidating} onChange={(event) => void chooseAvatar(event)} />
              </label>
            </div>
            <button className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-error hover:bg-error-bg disabled:opacity-50" type="button" disabled={!visibleAvatar || saving} onClick={onRemoveAvatar}><Trash2 size={16} /> Remove photo</button>
          </div>

          <label className="mt-7 grid gap-2 text-sm font-semibold">
            Username
            <div className="flex min-h-13 items-center rounded-xl border border-border px-4 focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/10">
              <span className="text-muted">@</span>
              <input className="min-w-0 flex-1 border-0 bg-transparent px-1 outline-none" value={username} minLength={3} maxLength={30} pattern="[A-Za-z][A-Za-z0-9]{2,29}" onChange={(event) => onUsernameChange(event.target.value.replace(/[^a-z0-9]/gi, '').replace(/^[0-9]+/, '').toLowerCase().slice(0, 30))} />
            </div>
            <small className="font-normal text-muted">English letters and numbers · must start with a letter</small>
          </label>

          <label className="mt-5 grid gap-2 text-sm font-semibold">
            Bio
            <input
              className="min-h-13 rounded-xl border border-border bg-white px-4 outline-none focus:border-brand focus:ring-3 focus:ring-brand/10"
              value={bio}
              onChange={(event) => onBioChange(event.target.value)}
              aria-invalid={bioError ? true : undefined}
              aria-describedby="profile-bio-help"
              placeholder="What are you building?"
            />
            <span id="profile-bio-help" className="flex justify-between gap-3 font-normal">
              <small className={bioError ? 'text-error' : 'text-muted'}>{bioError ?? 'Single line · optional'}</small>
              <small className={bioLength > BIO_MAX_CODE_POINTS ? 'tabular-nums text-error' : 'tabular-nums text-muted'}>{bioLength}/{BIO_MAX_CODE_POINTS}</small>
            </span>
          </label>

          <label className="mt-5 grid gap-2 text-sm font-semibold">
            Profile image
            <span className="flex min-h-12 cursor-pointer items-center overflow-hidden rounded-xl border border-border bg-white text-sm font-normal focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/10">
              <span className="m-1.5 shrink-0 rounded-lg bg-info-bg px-3 py-1.5 font-semibold text-brand">Choose file</span>
              <span className="min-w-0 flex-1 truncate px-2 text-secondary">{avatarFile?.name ?? 'No file chosen'}</span>
              <input className="sr-only" type="file" accept={AVATAR_ALLOWED_TYPES.join(',')} disabled={saving || avatarValidating} onChange={(event) => void chooseAvatar(event)} />
            </span>
          </label>

          {avatarValidating && <p className="mt-3 text-sm text-muted">Checking profile image…</p>}
          {avatarError && <p className="mt-3 text-sm text-error" role="alert">{avatarError}</p>}
          {error && <p className="mt-4 rounded-xl bg-error-bg p-3 text-sm text-error" role="alert">{error}</p>}
        </div>
      </form>
    </Modal>
  );
}
