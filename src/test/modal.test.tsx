import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from '@/components/ui/modal';

function NestedModalFixture() {
  const [parentOpen, setParentOpen] = useState(false);
  const [childOpen, setChildOpen] = useState(false);
  return (
    <>
      <button onClick={() => setParentOpen(true)} type="button">Open parent</button>
      <Modal open={parentOpen} onClose={() => setParentOpen(false)} ariaLabel="Parent modal">
        <button onClick={() => setChildOpen(true)} type="button">Open child</button>
        <button type="button">Parent last action</button>
      </Modal>
      <Modal open={childOpen} onClose={() => setChildOpen(false)} ariaLabel="Child modal">
        <button type="button">Child action</button>
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('locks scroll, traps focus, closes with Escape, and restores trigger focus', async () => {
    const user = userEvent.setup();
    render(<NestedModalFixture />);

    const trigger = screen.getByRole('button', { name: 'Open parent' });
    await user.click(trigger);
    const firstAction = await screen.findByRole('button', { name: 'Open child' });
    const lastAction = screen.getByRole('button', { name: 'Parent last action' });
    await waitFor(() => expect(firstAction).toHaveFocus());
    expect(document.body.style.overflow).toBe('hidden');

    lastAction.focus();
    await user.tab();
    expect(firstAction).toHaveFocus();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Parent modal' })).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  it('closes only the topmost nested modal and keeps the body locked', async () => {
    const user = userEvent.setup();
    render(<NestedModalFixture />);
    await user.click(screen.getByRole('button', { name: 'Open parent' }));
    await user.click(await screen.findByRole('button', { name: 'Open child' }));

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Child modal' })).not.toBeInTheDocument());
    expect(screen.getByRole('dialog', { name: 'Parent modal' })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('closes from the backdrop but not from panel interaction', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} ariaLabel="Example modal">
        <button type="button">Inside</button>
      </Modal>,
    );

    await user.click(screen.getByRole('button', { name: 'Inside' }));
    expect(onClose).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog', { name: 'Example modal' });
    await user.click(dialog.parentElement!);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
