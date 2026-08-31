import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { EditProfileModal } from '@/components/profile/edit-profile-modal';
import type { User } from '@/types';

const user: User = {
  id: 'user', username: 'alice', avatar: null, bio: null,
  verification: { isVerified: false, grantedAt: null, expiresAt: null },
  demoUsdcBalance: '20', createdAt: '2026-01-01T00:00:00.000Z',
};

function Harness({ onSave = vi.fn() }: { onSave?: () => void }) {
  const [bio, setBio] = useState('');
  return <EditProfileModal open user={user} username="alice" bio={bio} visibleAvatar={null} avatarFile={null} saving={false} avatarValidating={false} avatarError={null} error={null} onClose={() => undefined} onSave={onSave} onUsernameChange={() => undefined} onBioChange={setBio} onSelectAvatar={async () => undefined} onRemoveAvatar={() => undefined} />;
}

describe('bio editor', () => {
  it('shows a live Unicode-aware counter and disables save beyond 64 code points', () => {
    render(<Harness />);
    const bio = screen.getByRole('textbox', { name: /^Bio/ });
    fireEvent.change(bio, { target: { value: '🙂'.repeat(64) } });
    expect(screen.getByText('64/64')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    fireEvent.change(bio, { target: { value: '🙂'.repeat(65) } });
    expect(screen.getByText('65/64')).toBeInTheDocument();
    expect(screen.getByText(/64 characters or fewer/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('uses a single-line control that strips injected line breaks and allows a cleared bio', () => {
    render(<Harness />);
    const bio = screen.getByRole('textbox', { name: /^Bio/ });
    fireEvent.change(bio, { target: { value: 'first\nsecond' } });
    expect(bio).toHaveValue('firstsecond');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    fireEvent.change(bio, { target: { value: '' } });
    expect(screen.getByText('0/64')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });
});
