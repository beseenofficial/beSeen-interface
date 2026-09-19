import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState, type FormEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BroadcastComposer } from '@/components/messenger/broadcast/broadcast-composer';
import type { BroadcastChatState } from '@/components/messenger/broadcast/use-broadcast-chat';

function Harness({ sending = false }: { sending?: boolean }) {
  const [draft, setDraft] = useState('');
  const input = useRef<HTMLTextAreaElement>(null);
  const publish = vi.fn((event: FormEvent) => event.preventDefault());
  const state = {
    draft,
    draftBytes: new TextEncoder().encode(draft).length,
    handleKeyDown: vi.fn(),
    input,
    publish,
    sending,
    setDraft,
  } as unknown as BroadcastChatState;
  return <BroadcastComposer state={state} />;
}

describe('broadcast composer', () => {
  it('supports the same emoji-picker interaction as the messenger composer', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Choose emoji' }));
    await userEvent.click(screen.getByRole('menuitem', { name: '🔥' }));
    expect(screen.getByRole('textbox', { name: 'Write a broadcast' })).toHaveValue('🔥');
  });

  it('keeps send disabled for an empty draft and while publishing', async () => {
    const view = render(<Harness />);
    const send = screen.getByRole('button', { name: 'Send broadcast' });
    expect(send).toBeDisabled();

    await userEvent.type(screen.getByRole('textbox', { name: 'Write a broadcast' }), 'Update');
    expect(send).toBeEnabled();

    view.rerender(<Harness sending />);
    expect(screen.getByRole('button', { name: 'Send broadcast' })).toBeDisabled();
  });
});
