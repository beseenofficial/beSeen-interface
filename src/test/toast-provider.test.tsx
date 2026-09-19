import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  ToastProvider,
  toastDurationForContent,
  useToast,
} from '@/providers/toast-provider';

function ToastHarness({ action }: { action?: () => void }) {
  const { toast } = useToast();
  return (
    <>
      <button
        onClick={() =>
          toast('Saved', 'Your changes are live.', {
            variant: 'success',
            action: action ? { label: 'View', onClick: action } : undefined,
          })
        }
        type="button"
      >
        Show success
      </button>
      <button
        onClick={() => toast('Could not save', 'Check your connection and try again.', { variant: 'error' })}
        type="button"
      >
        Show error
      </button>
    </>
  );
}

describe('toast provider', () => {
  it('gives longer messages enough reading time within a bounded range', () => {
    expect(toastDurationForContent('Saved')).toBe(4_800);
    expect(toastDurationForContent('Update', 'x'.repeat(1_000))).toBe(8_000);
  });

  it('renders semantic status and dismisses after its action runs', async () => {
    const action = vi.fn();
    render(
      <ToastProvider>
        <ToastHarness action={action} />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Show success' }));
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    await userEvent.click(screen.getByRole('button', { name: 'View' }));
    expect(action).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.queryByText('Your changes are live.')).not.toBeInTheDocument(),
    );
  });

  it('uses an assertive alert for errors and keeps dismissal accessible', async () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Show error' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save');
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    await waitFor(() =>
      expect(screen.queryByText('Check your connection and try again.')).not.toBeInTheDocument(),
    );
  });
});
