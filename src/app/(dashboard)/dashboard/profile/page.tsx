'use client';

import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { AvatarCropDialog } from '@/components/profile/avatar-crop-dialog';
import { PublicPreview } from '@/components/profile/public-preview';
import { PublicProfileEditor } from '@/components/profile/public-profile-editor';
import { LoadingState } from '@/components/ui/states';
import { profileApi, profileUpdateErrorMessage } from '@/lib/api';
import type { ProfileUpdate } from '@/lib/api';
import { validateAvatar } from '@/lib/avatar';
import { useAuth } from '@/lib/blux';
import { useToast } from '@/providers/toast-provider';

export default function ProfilePage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarValidating, setAvatarValidating] = useState(false);
  const [showAvatarInput, setShowAvatarInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const avatarPreviewRef = useRef<string | null>(null);
  const avatarValidationId = useRef(0);
  const saveInProgress = useRef(false);
  const user = auth.user;

  useEffect(() => {
    if (!user) return;
    avatarValidationId.current += 1;
    if (avatarPreviewRef.current) URL.revokeObjectURL(avatarPreviewRef.current);
    avatarPreviewRef.current = null;
    setUsername(user.username);
    setAvatarUrl(user.avatar);
    setAvatarFile(null);
    setCropSourceFile(null);
    setAvatarPreviewUrl(null);
    setRemoveAvatar(false);
    setAvatarError(null);
    setAvatarValidating(false);
  }, [user]);

  useEffect(
    () => () => {
      if (avatarPreviewRef.current)
        URL.revokeObjectURL(avatarPreviewRef.current);
    },
    [],
  );

  if (!user || !auth.keys) {
    return <LoadingState label="Preparing your secure profile…" />;
  }

  function discardPendingAvatar() {
    avatarValidationId.current += 1;
    if (avatarPreviewRef.current) URL.revokeObjectURL(avatarPreviewRef.current);
    avatarPreviewRef.current = null;
    setAvatarFile(null);
    setCropSourceFile(null);
    setAvatarPreviewUrl(null);
    setAvatarValidating(false);
  }

  async function selectAvatar(file: File) {
    avatarValidationId.current += 1;
    setAvatarError(null);
    const validationId = avatarValidationId.current;
    setAvatarValidating(true);
    try {
      await validateAvatar(file);
      if (validationId !== avatarValidationId.current) return;
      setCropSourceFile(file);
    } catch (cause) {
      if (validationId !== avatarValidationId.current) return;
      setAvatarError(
        cause instanceof Error
          ? cause.message
          : 'The selected profile image is invalid.',
      );
    } finally {
      if (validationId === avatarValidationId.current)
        setAvatarValidating(false);
    }
  }

  async function applyCroppedAvatar(file: File) {
    setAvatarError(null);
    setAvatarValidating(true);
    try {
      await validateAvatar(file);
      discardPendingAvatar();
      const previewUrl = URL.createObjectURL(file);
      avatarPreviewRef.current = previewUrl;
      setAvatarFile(file);
      setAvatarPreviewUrl(previewUrl);
      setRemoveAvatar(false);
      setCropSourceFile(null);
    } catch (cause) {
      setAvatarError(
        cause instanceof Error
          ? cause.message
          : 'The cropped image is invalid.',
      );
    } finally {
      setAvatarValidating(false);
    }
  }

  function removeProfileAvatar() {
    discardPendingAvatar();
    setAvatarError(null);
    setRemoveAvatar(Boolean(user?.avatar));
  }

  async function save() {
    if (!user || saveInProgress.current || avatarValidating || avatarError)
      return;
    setError(null);
    saveInProgress.current = true;
    setSaving(true);
    try {
      const changes: ProfileUpdate = {};
      if (username !== user.username) changes.username = username;
      if (avatarFile) changes.avatarFile = avatarFile;
      else if (removeAvatar) changes.removeAvatar = true;
      if (Object.keys(changes).length === 0) {
        toast(
          'Nothing to update',
          'Your profile already matches these values.',
        );
        return;
      }
      const updated = await profileApi.update(changes);
      discardPendingAvatar();
      setAvatarUrl(updated.avatar);
      setRemoveAvatar(false);
      auth.setUser(updated);
      toast('Profile updated', 'Your latest changes are now live.');
    } catch (cause) {
      setError(profileUpdateErrorMessage(cause));
    } finally {
      saveInProgress.current = false;
      setSaving(false);
    }
  }

  const visibleUsername = username || user.username;
  const visibleAvatarUrl =
    avatarPreviewUrl ?? (removeAvatar ? null : avatarUrl);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-6 pb-12 pt-8 2xl:max-w-[1320px] 2xl:px-10 max-[1100px]:px-5 max-sm:px-4 max-sm:pb-8 max-sm:pt-6">
      {cropSourceFile && (
        <AvatarCropDialog
          file={cropSourceFile}
          onCancel={() => setCropSourceFile(null)}
          onConfirm={(file) => void applyCroppedAvatar(file)}
        />
      )}
      <PageHeader
        eyebrow="Your account"
        title="Profile"
        description="Manage how people appear on BeSeen."
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(340px,.78fr)_minmax(0,1.22fr)]">
        <div>
          <PublicProfileEditor
            username={username}
            avatarUrl={visibleAvatarUrl}
            showAvatarInput={showAvatarInput}
            avatarFileName={avatarFile?.name ?? null}
            avatarError={avatarError}
            avatarValidating={avatarValidating}
            saving={saving}
            error={error}
            onUsernameChange={setUsername}
            onAvatarFileChange={selectAvatar}
            onRemoveAvatar={removeProfileAvatar}
            onToggleAvatarInput={() => setShowAvatarInput((value) => !value)}
            onSave={() => void save()}
          />
        </div>

        <div>
          <PublicPreview
            username={visibleUsername}
            avatarUrl={visibleAvatarUrl}
            profileUrl={`app.beseen.fi/u/${visibleUsername}`}
          />
        </div>
      </div>
    </div>
  );
}
