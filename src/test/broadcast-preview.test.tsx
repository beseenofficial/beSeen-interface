import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BroadcastPreview } from '@/components/broadcasts/broadcast-preview';
import { ToastProvider } from '@/providers/toast-provider';

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

describe('BroadcastPreview', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(240);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(120);
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('opens the full broadcast, copies it, and closes with Escape', async () => {
    document.body.style.paddingRight = '3px';
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

    render(
      <ToastProvider>
        <BroadcastPreview
          content="A very long broadcast that cannot fit on a single line."
          username="alice"
          avatar={null}
          publishedAt="2026-08-03T09:00:00.000Z"
          isOwn
          recipientCount={3}
        />
      </ToastProvider>,
    );

    await user.click(await screen.findByRole('button', { name: 'View full' }));
    const dialog = screen.getByRole('dialog');
    expect(Number.parseFloat(document.body.style.paddingRight)).toBeGreaterThan(3);
    expect(within(dialog).getByText('A very long broadcast that cannot fit on a single line.')).toBeInTheDocument();
    expect(within(dialog).getByText('Sent to 3 followers')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Copy message' }));
    expect(writeText).toHaveBeenCalledWith('A very long broadcast that cannot fit on a single line.');

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.body.style.paddingRight).toBe('3px');
  });
});
