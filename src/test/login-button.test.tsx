import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoginButton } from '@/components/features/auth/login-button';

describe('Blux login trigger', () => {
  it('calls the supplied Blux login flow', () => {
    const login = vi.fn();
    render(<LoginButton onLogin={login} loading={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Blux' }));
    expect(login).toHaveBeenCalledTimes(1);
  });
});
