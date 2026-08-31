import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  class ApiError extends Error {
    constructor(message: string, public status: number, public code: string) { super(message); }
  }
  return { ApiError, create: vi.fn(), loadPending: vi.fn(), retry: vi.fn(), discard: vi.fn() };
});
vi.mock('@/lib/api', () => ({ ApiError: mocks.ApiError }));
vi.mock('@/lib/messenger-workflow', () => ({
  createAndSendMessengerMessage: mocks.create,
  loadPendingMessengerAttempt: mocks.loadPending,
  retryPendingMessengerMessage: mocks.retry,
  discardPendingMessengerAttempt: mocks.discard,
}));

import { useMessageComposer } from '@/components/messenger/use-message-composer';
import type { DecryptedMessengerMessage, MessengerConversation } from '@/types';

function Harness({ balance, refresh }: { balance?: string; refresh: () => Promise<unknown> }) {
  const [, setConversations] = useState<MessengerConversation[]>([]);
  const [, setMessages] = useState<DecryptedMessengerMessage[]>([]);
  const composer = useMessageComposer({
    activeConversationId: 'conversation',
    keys: { signingPublicKey: new Uint8Array(), signingPrivateKey: new Uint8Array(), encryptionPublicKey: new Uint8Array(), encryptionPrivateKey: new Uint8Array() },
    setActiveConversationId: () => undefined,
    setConversations,
    setMessages,
    refreshHistory: async () => undefined,
    refreshConversationList: async () => undefined,
    toast: () => undefined,
    demoUsdcBalance: balance,
    refreshCurrentUser: refresh,
  });
  return (
    <form onSubmit={composer.sendMessage}>
      <textarea aria-label="Draft" value={composer.draft} onChange={(event) => composer.setDraft(event.target.value)} />
      <button type="button" onClick={() => composer.setShowBounty(true)}>Add bounty</button>
      <input aria-label="Amount" value={composer.bountyAmount} onChange={(event) => composer.setBountyAmount(event.target.value)} />
      {composer.sendError && <p>{composer.sendError}</p>}
      {composer.bountyError && <p>{composer.bountyError}</p>}
      <button type="submit">Send</button>
    </form>
  );
}

const sentMessage = {
  id: 'message', conversationId: 'conversation', sequence: 1, clientMessageId: 'client', senderId: 'sender', recipientId: 'recipient', replyToMessageId: null,
  bounty: { id: 'bounty', assetCode: 'USDC', amount: '10', durationSeconds: 3600, status: 'offered', expiresAt: '2026-09-01T00:00:00.000Z', replyMessageId: null, claimableAt: null, claimedAt: null },
  unlockedBounty: null, createdAt: '2026-08-29T00:00:00.000Z',
};

describe('message composer demo USDC bounty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadPending.mockResolvedValue(null);
  });

  it('blocks an amount above the exact demo balance without discarding the draft', async () => {
    render(<Harness balance="9.9999999" refresh={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Draft'), 'encrypted later');
    await userEvent.click(screen.getByRole('button', { name: 'Add bounty' }));
    expect(screen.getByText('Your demo USDC balance is not sufficient for this bounty.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(mocks.create).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Draft')).toHaveValue('encrypted later');
  });

  it('preserves the draft after the server returns insufficient balance', async () => {
    mocks.create.mockRejectedValueOnce(new mocks.ApiError('insufficient', 409, 'INSUFFICIENT_DEMO_USDC_BALANCE'));
    render(<Harness balance="20" refresh={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Draft'), 'keep this draft');
    await userEvent.click(screen.getByRole('button', { name: 'Add bounty' }));
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Your demo USDC balance is not sufficient for this bounty.')).toBeInTheDocument();
    expect(screen.getByLabelText('Draft')).toHaveValue('keep this draft');
  });

  it('refetches the current user balance after a successful bounty send', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    mocks.create.mockResolvedValueOnce({ message: sentMessage, created: true });
    render(<Harness balance="20" refresh={refresh} />);
    await userEvent.type(screen.getByLabelText('Draft'), 'rewarded reply');
    await userEvent.click(screen.getByRole('button', { name: 'Add bounty' }));
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(refresh).toHaveBeenCalledOnce();
  });
});
