'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { IdentitySecurity } from '@/components/profile/identity-security';
import { ProfileLink } from '@/components/profile/profile-link';
import { PublicPreview } from '@/components/profile/public-preview';
import { PublicProfileEditor } from '@/components/profile/public-profile-editor';
import { LoadingState } from '@/components/ui/states';
import { profileApi } from '@/lib/api';
import { useAuth } from '@/lib/blux';
import { APP_URL } from '@/lib/constants';
import { bytesToBase64 } from '@/lib/encoding';
import { useToast } from '@/providers/toast-provider';

export default function ProfilePage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showAvatarInput, setShowAvatarInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = auth.user;

  useEffect(() => {
    if (!user) return;
    setUsername(user.username);
    setAvatarUrl(user.avatar);
  }, [user]);

  if (!user) return <LoadingState label="Loading your profile…" />;

  async function save() {
    if (!user) return;
    setError(null);
    setSaving(true);
    try {
      const changes = {
        ...(username !== user.username ? { username } : {}),
        ...(avatarUrl !== user.avatar ? { avatar: avatarUrl } : {}),
      };
      if (Object.keys(changes).length === 0) {
        toast(
          'Nothing to update',
          'Your profile already matches these values.',
        );
        return;
      }
      const updated = await profileApi.update(changes);
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

  const visibleUsername = username || user.username;
  const profileUrl = `${APP_URL}/${visibleUsername}`;
  const publicKey = auth.keys
    ? bytesToBase64(auth.keys.signingPublicKey)
    : null;

  return (
    <div className="mx-auto w-full max-w-[1180px] px-6 pb-12 pt-8 2xl:max-w-[1320px] 2xl:px-10 max-[1100px]:px-5 max-sm:px-4 max-sm:pb-8 max-sm:pt-6">
      <PageHeader
        eyebrow="Your account"
        title="Profile"
        description="Manage how people appear on BeSeen."
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(340px,.78fr)_minmax(0,1.22fr)]">
        <div className="grid gap-5">
          <PublicProfileEditor
            username={username}
            avatarUrl={avatarUrl}
            showAvatarInput={showAvatarInput}
            saving={saving}
            error={error}
            onUsernameChange={setUsername}
            onAvatarUrlChange={setAvatarUrl}
            onToggleAvatarInput={() => setShowAvatarInput((value) => !value)}
            onSave={() => void save()}
          />

          <ProfileLink profileUrl={profileUrl} />
        </div>

        <div className="grid gap-5">
          <PublicPreview
            username={visibleUsername}
            avatarUrl={avatarUrl}
            profileUrl={profileUrl}
          />

          <IdentitySecurity publicKey={publicKey} />
        </div>
      </div>
    </div>
  );
}
