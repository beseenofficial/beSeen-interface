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
import type { DecryptedMessengerMessage, MessengerConversation, MessengerBountyLockTerms } from '@/types';

function Harness({ activeConversationId = 'conversation', lockBounty = vi.fn().mockResolvedValue('1') }: { activeConversationId?: string; lockBounty?: (bounty: MessengerBountyLockTerms) => Promise<string> }) {
  const [, setConversations] = useState<MessengerConversation[]>([]);
  const [, setMessages] = useState<DecryptedMessengerMessage[]>([]);
  const composer = useMessageComposer({
    activeConversationId,
    keys: { signingPublicKey: new Uint8Array(), signingPrivateKey: new Uint8Array(), encryptionPublicKey: new Uint8Array(), encryptionPrivateKey: new Uint8Array() },
    setActiveConversationId: () => undefined,
    setConversations,
    setMessages,
    refreshHistory: async () => undefined,
    refreshConversationList: async () => undefined,
    toast: () => undefined,
    lockBounty,
  });
  return (
    <form onSubmit={composer.sendMessage}>
      <textarea aria-label="Draft" value={composer.draft} onChange={(event) => composer.setDraft(event.target.value)} />
      <button type="button" onClick={() => composer.setShowBounty(true)}>Add bounty</button>
      <input aria-label="Amount" value={composer.bountyAmount} onChange={(event) => composer.setBountyAmount(event.target.value)} />
      <input aria-label="Duration value" value={composer.bountyDurationValue} onChange={(event) => composer.setBountyDurationValue(event.target.value)} />
      <select aria-label="Duration unit" value={composer.bountyDurationUnit} onChange={(event) => composer.setBountyDurationUnit(event.target.value as 'minute' | 'hour' | 'day')}>
        <option value="minute">Minutes</option>
        <option value="hour">Hours</option>
        <option value="day">Days</option>
      </select>
      {composer.sendError && <p>{composer.sendError}</p>}
      {composer.bountyError && <p>{composer.bountyError}</p>}
      <button type="submit">Send</button>
    </form>
  );
}

const sentMessage = {
  id: 'message', conversationId: 'conversation', sequence: 1, clientMessageId: 'client', senderId: 'sender', recipientId: 'recipient', replyToMessageId: null,
  bounty: { id: 'bounty', contractBountyId: '1', assetCode: 'USDC', amount: '10', durationSeconds: 3600, status: 'offered', settlementStatus: 'pending', settlementTransactionHash: null, expiresAt: '2026-09-01T00:00:00.000Z', replyMessageId: null, claimableAt: null, claimedAt: null },
  unlockedBounty: null, createdAt: '2026-08-29T00:00:00.000Z',
};

describe('message composer contract bounty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadPending.mockResolvedValue(null);
  });

  it.each([
    ['0', 'zero'],
    ['1.12345678', 'more than 7 decimal places'],
    ['1e3', 'scientific notation'],
    ['1,000', 'a comma'],
  ])('rejects %s (%s) before any contract call', async (amount) => {
    const lockBounty = vi.fn().mockResolvedValue('1');
    render(<Harness lockBounty={lockBounty} />);
    await userEvent.type(screen.getByLabelText('Draft'), 'encrypted later');
    await userEvent.click(screen.getByRole('button', { name: 'Add bounty' }));
    await userEvent.clear(screen.getByLabelText('Amount'));
    await userEvent.type(screen.getByLabelText('Amount'), amount);
    expect(screen.getByText('Enter a positive amount with up to 7 decimal places.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(lockBounty).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Draft')).toHaveValue('encrypted later');
  });

  it('locks the bounty on-chain before the message payload is built', async () => {
    const lockBounty = vi.fn().mockResolvedValue('42');
    mocks.create.mockResolvedValueOnce({ message: sentMessage, created: true });
    render(<Harness lockBounty={lockBounty} />);
    await userEvent.type(screen.getByLabelText('Draft'), 'rewarded reply');
    await userEvent.click(screen.getByRole('button', { name: 'Add bounty' }));
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(lockBounty).toHaveBeenCalledOnce();
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(lockBounty.mock.invocationCallOrder[0]).toBeLessThan(mocks.create.mock.invocationCallOrder[0]);
  });

  it('sends the contract bounty ID as a string with the exact duration used for the deadline', async () => {
    const lockBounty = vi.fn().mockResolvedValue('42');
    mocks.create.mockResolvedValueOnce({ message: sentMessage, created: true });
    render(<Harness lockBounty={lockBounty} />);
    await userEvent.type(screen.getByLabelText('Draft'), 'reply in four days');
    await userEvent.click(screen.getByRole('button', { name: 'Add bounty' }));
    await userEvent.clear(screen.getByLabelText('Duration value'));
    await userEvent.type(screen.getByLabelText('Duration value'), '4');
    await userEvent.selectOptions(screen.getByLabelText('Duration unit'), 'day');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    // The on-chain lock receives only the terms; the ID comes back from it.
    expect(lockBounty).toHaveBeenCalledWith({
      assetCode: 'USDC',
      amount: '10',
      durationSeconds: 4 * 86400,
    });
    // The signed/sent payload carries the contract-generated ID as a string.
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      bounty: expect.objectContaining({
        contractBountyId: '42',
        durationSeconds: 4 * 86400,
      }),
    }));
    expect(typeof mocks.create.mock.calls[0][0].bounty.contractBountyId).toBe('string');
  });

  it('keeps bounty IDs beyond the safe-integer range as exact strings', async () => {
    const lockBounty = vi.fn().mockResolvedValue('9007199254740993');
    mocks.create.mockResolvedValueOnce({ message: sentMessage, created: true });
    render(<Harness lockBounty={lockBounty} />);
    await userEvent.type(screen.getByLabelText('Draft'), 'big id');
    await userEvent.click(screen.getByRole('button', { name: 'Add bounty' }));
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(mocks.create.mock.calls[0][0].bounty.contractBountyId).toBe('9007199254740993');
  });

  it('does not send the message when the on-chain lock fails', async () => {
    const lockBounty = vi.fn().mockRejectedValue(new Error('Wallet signature was rejected.'));
    render(<Harness lockBounty={lockBounty} />);
    await userEvent.type(screen.getByLabelText('Draft'), 'keep this message');
    await userEvent.click(screen.getByRole('button', { name: 'Add bounty' }));
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Wallet signature was rejected.')).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Draft')).toHaveValue('keep this message');
  });

  it('does not send the message when the lock returns no valid bounty ID', async () => {
    const lockBounty = vi.fn().mockRejectedValue(new Error('The contract did not return a valid u64 identifier.'));
    render(<Harness lockBounty={lockBounty} />);
    await userEvent.type(screen.getByLabelText('Draft'), 'keep this message');
    await userEvent.click(screen.getByRole('button', { name: 'Add bounty' }));
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('The contract did not return a valid u64 identifier.')).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Draft')).toHaveValue('keep this message');
  });

  it('sends a bounty-less message without touching the contract', async () => {
    const lockBounty = vi.fn().mockResolvedValue('1');
    mocks.create.mockResolvedValueOnce({ message: { ...sentMessage, bounty: null }, created: true });
    render(<Harness lockBounty={lockBounty} />);
    await userEvent.type(screen.getByLabelText('Draft'), 'plain message');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(lockBounty).not.toHaveBeenCalled();
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ bounty: null }));
  });

  it('keeps a separate draft for each conversation', async () => {
    const view = render(<Harness activeConversationId="first" />);
    await userEvent.type(screen.getByLabelText('Draft'), 'first draft');
    view.rerender(<Harness activeConversationId="second" />);
    expect(screen.getByLabelText('Draft')).toHaveValue('');
    await userEvent.type(screen.getByLabelText('Draft'), 'second draft');
    view.rerender(<Harness activeConversationId="first" />);
    expect(screen.getByLabelText('Draft')).toHaveValue('first draft');
  });
});
