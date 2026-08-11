import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RecentMessages } from '@/components/dashboard/recent-messages';

describe('RecentMessages', () => {
  it('renders loading and empty states', () => {
    const { rerender } = render(<RecentMessages messages={[]} loading />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading recent messages');

    rerender(<RecentMessages messages={[]} />);
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });

  it('links a decrypted preview and unread count to its conversation', () => {
    render(
      <RecentMessages
        messages={[{
          conversationId: 'conversation-123',
          username: 'alice',
          avatar: null,
          content: 'Your encrypted message was delivered.',
          timestamp: 'Just now',
          unreadCount: 3,
          isOwn: false,
        }]}
      />,
    );

    const conversation = screen.getByRole('link', { name: 'Open conversation with @alice' });
    expect(conversation).toHaveAttribute('href', '/dashboard/messenger?conversation=conversation-123');
    expect(conversation).toHaveTextContent('Your encrypted message was delivered.');
    expect(conversation).toHaveTextContent('3');
    expect(conversation).toHaveTextContent('Just now');
  });
});
