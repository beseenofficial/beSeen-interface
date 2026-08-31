import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VerificationBadge } from '@/components/ui/verification-badge';

describe('VerificationBadge', () => {
  it('shows only when the server says the account is verified', () => {
    const view = render(<VerificationBadge verification={{ isVerified: true, grantedAt: null, expiresAt: null }} />);
    expect(screen.getByLabelText('Verified account')).toBeInTheDocument();
    view.rerender(<VerificationBadge verification={{ isVerified: false, grantedAt: '2026-01-01', expiresAt: null }} />);
    expect(screen.queryByLabelText('Verified account')).toBeNull();
    view.rerender(<VerificationBadge verification={undefined} />);
    expect(screen.queryByLabelText('Verified account')).toBeNull();
  });
});
