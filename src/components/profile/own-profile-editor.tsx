'use client';

import { Pencil } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AvatarCropModal } from '@/components/profile/avatar-crop-dialog';
import { EditProfileModal } from '@/components/profile/edit-profile-modal';
import { profileApi, profileUpdateErrorMessage, validateUsername } from '@/lib/api';
import type { ProfileUpdate } from '@/lib/api';
import { validateAvatar } from '@/lib/avatar';
import { invalidateData } from '@/lib/data-invalidation';
import { useAuth } from '@/lib/blux';
import { bioValidationError, normalizeBio } from '@/lib/profile-validation';
import type { User } from '@/types';
import { useToast } from '@/providers/toast-provider';

export function OwnProfileEditor({ onUpdated }: { onUpdated: (user: User) => void }) {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const user = auth.user;
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
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
    setBio(user!.bio ?? '');
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
    const bioError = bioValidationError(bio);
    if (bioError) {
      setError(bioError);
      return;
    }
    saveInProgress.current = true;
    setSaving(true);
    try {
      const changes: ProfileUpdate = {};
      if (username !== user!.username) changes.username = username;
      const normalizedBio = normalizeBio(bio);
      if (normalizedBio !== (user!.bio ?? null)) changes.bio = normalizedBio;
      if (avatarFile) changes.avatarFile = avatarFile;
      else if (removeAvatar) changes.removeAvatar = true;
      if (Object.keys(changes).length === 0) {
        setOpen(false);
        return;
      }
      const updated = await profileApi.update(changes);
      clearPreview();
      auth.setUser(updated);
      invalidateData({ resource: 'current-user' });
      invalidateData({ resource: 'public-profile', username: user!.username });
      if (updated.username !== user!.username) {
        invalidateData({ resource: 'public-profile', username: updated.username });
        invalidateData({ resource: 'follow-counts', username: updated.username });
      }
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

      <EditProfileModal
        open={open}
        user={user}
        username={username}
        bio={bio}
        visibleAvatar={visibleAvatar}
        avatarFile={avatarFile}
        saving={saving}
        avatarValidating={avatarValidating}
        avatarError={avatarError}
        error={error}
        onClose={cancelEditing}
        onSave={() => void save()}
        onUsernameChange={setUsername}
        onBioChange={setBio}
        onSelectAvatar={selectAvatar}
        onRemoveAvatar={removeProfileAvatar}
      />

      {cropSourceFile && (
        <AvatarCropModal
          file={cropSourceFile}
          onCancel={() => setCropSourceFile(null)}
          onConfirm={(file) => void applyCroppedAvatar(file)}
        />
      )}
    </>
  );
}
