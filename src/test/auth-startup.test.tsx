import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  AuthStartupBoundary,
  useAuthStartup,
} from '@/providers/auth-startup';

function Probe({ marker }: { marker: string }) {
  const { complete } = useAuthStartup();
  return (
    <>
      <span data-testid="startup-content">{marker}</span>
      <button type="button" onClick={complete}>Finish startup</button>
    </>
  );
}

describe('auth startup boundary', () => {
  it('keeps one loading screen mounted until startup completes', async () => {
    const view = render(
      <AuthStartupBoundary>
        <Probe marker="config" />
      </AuthStartupBoundary>,
    );
    const loader = screen.getByRole('status');

    view.rerender(
      <AuthStartupBoundary>
        <Probe marker="session" />
      </AuthStartupBoundary>,
    );

    expect(screen.getByRole('status')).toBe(loader);
    expect(screen.getAllByRole('status')).toHaveLength(1);

    fireEvent.click(screen.getByText('Finish startup'));

    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    expect(screen.getByTestId('startup-content')).toHaveTextContent('session');
  });
});
