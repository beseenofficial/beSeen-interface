'use client';

import { Camera, Pencil, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AvatarCropDialog } from '@/components/profile/avatar-crop-dialog';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { profileApi, profileUpdateErrorMessage, validateUsername } from '@/lib/api';
import type { ProfileUpdate } from '@/lib/api';
import { AVATAR_ALLOWED_TYPES, validateAvatar } from '@/lib/avatar';
import { useAuth } from '@/lib/blux';
import type { User } from '@/types';
import { useToast } from '@/providers/toast-provider';

export function OwnProfileEditor({ onUpdated }: { onUpdated: (user: User) => void }) {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const user = auth.user;
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarValidating, setAvatarValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const avatarPreviewRef = useRef<string | null>(null);
  const validationId = useRef(0);
  const saveInProgress = useRef(false);

  useEffect(() => () => {
    if (avatarPreviewRef.current) URL.revokeObjectURL(avatarPreviewRef.current);
  }, []);

  if (!user) return null;

  function clearPreview() {
    validationId.current += 1;
    if (avatarPreviewRef.current) URL.revokeObjectURL(avatarPreviewRef.current);
    avatarPreviewRef.current = null;
    setAvatarFile(null);
    setCropSourceFile(null);
    setAvatarPreviewUrl(null);
    setAvatarValidating(false);
  }

  function startEditing() {
    clearPreview();
    setUsername(user!.username);
    setRemoveAvatar(false);
    setAvatarError(null);
    setError(null);
    setOpen(true);
  }

  function cancelEditing() {
    clearPreview();
    setOpen(false);
  }

  async function selectAvatar(file: File) {
    validationId.current += 1;
    const currentValidation = validationId.current;
    setAvatarError(null);
    setAvatarValidating(true);
    try {
      await validateAvatar(file);
      if (currentValidation === validationId.current) setCropSourceFile(file);
    } catch (cause) {
      if (currentValidation === validationId.current) {
        setAvatarError(cause instanceof Error ? cause.message : 'The selected profile image is invalid.');
      }
    } finally {
      if (currentValidation === validationId.current) setAvatarValidating(false);
    }
  }

  async function applyCroppedAvatar(file: File) {
    setAvatarError(null);
    setAvatarValidating(true);
    try {
      await validateAvatar(file);
      clearPreview();
      const previewUrl = URL.createObjectURL(file);
      avatarPreviewRef.current = previewUrl;
      setAvatarFile(file);
      setAvatarPreviewUrl(previewUrl);
      setRemoveAvatar(false);
    } catch (cause) {
      setAvatarError(cause instanceof Error ? cause.message : 'The cropped image is invalid.');
    } finally {
      setAvatarValidating(false);
    }
  }

  function removeProfileAvatar() {
    clearPreview();
    setAvatarError(null);
    setRemoveAvatar(Boolean(user!.avatar));
  }

  async function save() {
    if (saveInProgress.current || avatarValidating || avatarError) return;
    setError(null);
    if (!validateUsername(username)) {
      setError('Use 3–30 English letters or numbers, starting with a letter.');
      return;
    }
    saveInProgress.current = true;
    setSaving(true);
    try {
      const changes: ProfileUpdate = {};
      if (username !== user!.username) changes.username = username;
      if (avatarFile) changes.avatarFile = avatarFile;
      else if (removeAvatar) changes.removeAvatar = true;
      if (Object.keys(changes).length === 0) {
        setOpen(false);
        return;
      }
      const updated = await profileApi.update(changes);
      clearPreview();
      auth.setUser(updated);
      onUpdated(updated);
      setOpen(false);
      toast('Profile updated', 'Your latest changes are now live.');
      if (updated.username !== user!.username) router.replace(`/u/${updated.username}`);
    } catch (cause) {
      setError(profileUpdateErrorMessage(cause));
    } finally {
      saveInProgress.current = false;
      setSaving(false);
    }
  }

  const visibleAvatar = avatarPreviewUrl ?? (removeAvatar ? null : user.avatar);

  return (
    <>
      <button className="inline-flex min-h-14 cursor-pointer items-center justify-center gap-3 rounded-xl border border-border bg-white px-7 text-[16px] font-semibold transition hover:-translate-y-px hover:bg-subtle" type="button" onClick={startEditing}>
        <Pencil size={19} aria-hidden="true" /> Edit profile
      </button>

      {cropSourceFile && <AvatarCropDialog file={cropSourceFile} onCancel={() => setCropSourceFile(null)} onConfirm={(file) => void applyCroppedAvatar(file)} />}

      {open && (
        <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-navy/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
          <form className="my-auto w-full max-w-145 overflow-hidden rounded-3xl bg-white shadow-[0_28px_90px_rgb(11_11_63/28%)]" onSubmit={(event) => { event.preventDefault(); void save(); }}>
            <header className="flex min-h-17 items-center gap-4 border-b border-border px-5">
              <button className="grid size-10 cursor-pointer place-items-center rounded-full hover:bg-subtle" type="button" onClick={cancelEditing} aria-label="Close profile editor"><X size={20} /></button>
              <h2 id="edit-profile-title" className="flex-1 text-xl font-semibold">Edit profile</h2>
              <Button className="min-h-10 rounded-full px-5" type="submit" loading={saving} disabled={avatarValidating || Boolean(avatarError)}>Save</Button>
            </header>

            <div className="max-h-[calc(100svh-7rem)] overflow-y-auto px-6 py-7 max-sm:px-5">
              <div className="flex items-center gap-5">
                <div className="relative shrink-0 rounded-full">
                  <Avatar username={username || user.username} src={visibleAvatar} size="xl" className="size-28 text-3xl" />
                  <label className="absolute inset-0 grid cursor-pointer place-items-center rounded-full bg-navy/45 text-white opacity-0 transition hover:opacity-100 focus-within:opacity-100" aria-label="Choose a new profile image">
                    <Camera size={24} />
                    <input className="sr-only" type="file" accept={AVATAR_ALLOWED_TYPES.join(',')} disabled={saving || avatarValidating} onChange={async (event) => { const file = event.target.files?.[0]; if (file) await selectAvatar(file); event.target.value = ''; }} />
                  </label>
                </div>
                <button className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-error hover:bg-error-bg disabled:opacity-50" type="button" disabled={!visibleAvatar || saving} onClick={removeProfileAvatar}><Trash2 size={16} /> Remove photo</button>
              </div>

              <label className="mt-7 grid gap-2 text-sm font-semibold">
                Username
                <div className="flex min-h-13 items-center rounded-xl border border-border px-4 focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/10">
                  <span className="text-muted">@</span>
                  <input className="min-w-0 flex-1 border-0 bg-transparent px-1 outline-none" value={username} minLength={3} maxLength={30} pattern="[A-Za-z][A-Za-z0-9]{2,29}" onChange={(event) => { const next = event.target.value.replace(/[^a-z0-9]/gi, '').replace(/^[0-9]+/, '').toLowerCase(); setUsername(next.slice(0, 30)); }} />
                </div>
                <small className="font-normal text-muted">English letters and numbers · must start with a letter</small>
              </label>

              <label className="mt-5 grid gap-2 text-sm font-semibold">
                Profile image
                <span className="flex min-h-12 cursor-pointer items-center overflow-hidden rounded-xl border border-border bg-white text-sm font-normal focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/10">
                  <span className="m-1.5 shrink-0 rounded-lg bg-info-bg px-3 py-1.5 font-semibold text-brand">Choose file</span>
                  <span className="min-w-0 flex-1 truncate px-2 text-secondary">{avatarFile?.name ?? 'No file chosen'}</span>
                  <input className="sr-only" type="file" accept={AVATAR_ALLOWED_TYPES.join(',')} disabled={saving || avatarValidating} onChange={async (event) => { const file = event.target.files?.[0]; if (file) await selectAvatar(file); event.target.value = ''; }} />
                </span>
              </label>

              {avatarValidating && <p className="mt-3 text-sm text-muted">Checking profile image…</p>}
              {avatarError && <p className="mt-3 text-sm text-error" role="alert">{avatarError}</p>}
              {error && <p className="mt-4 rounded-xl bg-error-bg p-3 text-sm text-error" role="alert">{error}</p>}
            </div>
          </form>
        </div>
      )}
    </>
  );
}
