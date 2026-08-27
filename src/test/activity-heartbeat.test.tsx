import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  class MockApiError extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly code: string,
    ) {
      super(message);
    }
  }
  return {
    ApiError: MockApiError,
    hasAccessToken: vi.fn(() => true),
    record: vi.fn(),
  };
});

vi.mock('@/lib/api', () => ({
  activityApi: { record: mocks.record },
  ApiError: mocks.ApiError,
  hasAccessToken: mocks.hasAccessToken,
}));

import {
  ACTIVITY_HEARTBEAT_INTERVAL_MS,
  ACTIVITY_RATE_LIMIT_BACKOFF_MS,
  useActivityHeartbeat,
} from '@/lib/use-activity-heartbeat';

function HeartbeatHarness({ enabled, route = '/dashboard' }: { enabled: boolean; route?: string }) {
  useActivityHeartbeat(enabled);
  return <span>{route}</span>;
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('authenticated activity heartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    setVisibility('visible');
    mocks.hasAccessToken.mockReturnValue(true);
    mocks.record.mockResolvedValue({ creditedSeconds: 60, lastActiveAt: '', isOnline: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('does not run while logged out', async () => {
    render(<HeartbeatHarness enabled={false} />);
    await vi.advanceTimersByTimeAsync(ACTIVITY_HEARTBEAT_INTERVAL_MS * 2);
    expect(mocks.record).not.toHaveBeenCalled();
  });

  it('runs immediately and once per 60-second cycle without duplicating on navigation', async () => {
    const view = render(<HeartbeatHarness enabled route="/dashboard" />);
    expect(mocks.record).toHaveBeenCalledTimes(1);

    view.rerender(<HeartbeatHarness enabled route="/dashboard/discover" />);
    expect(mocks.record).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(ACTIVITY_HEARTBEAT_INTERVAL_MS - 1);
    expect(mocks.record).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(mocks.record).toHaveBeenCalledTimes(2);
  });

  it('stops while hidden and resumes immediately when visible', async () => {
    render(<HeartbeatHarness enabled />);
    expect(mocks.record).toHaveBeenCalledTimes(1);

    setVisibility('hidden');
    fireEvent(document, new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(ACTIVITY_HEARTBEAT_INTERVAL_MS * 2);
    expect(mocks.record).toHaveBeenCalledTimes(1);

    setVisibility('visible');
    fireEvent(document, new Event('visibilitychange'));
    expect(mocks.record).toHaveBeenCalledTimes(2);
  });

  it('stops on logout or session removal', async () => {
    const view = render(<HeartbeatHarness enabled />);
    expect(mocks.record).toHaveBeenCalledTimes(1);

    view.rerender(<HeartbeatHarness enabled={false} />);
    await vi.advanceTimersByTimeAsync(ACTIVITY_HEARTBEAT_INTERVAL_MS);
    expect(mocks.record).toHaveBeenCalledTimes(1);

    view.rerender(<HeartbeatHarness enabled />);
    expect(mocks.record).toHaveBeenCalledTimes(2);
    mocks.hasAccessToken.mockReturnValue(false);
    await vi.advanceTimersByTimeAsync(ACTIVITY_HEARTBEAT_INTERVAL_MS * 2);
    expect(mocks.record).toHaveBeenCalledTimes(2);
  });

  it('never overlaps requests', async () => {
    let resolveFirst: (() => void) | undefined;
    mocks.record.mockReturnValueOnce(new Promise<void>((resolve) => {
      resolveFirst = resolve;
    }));
    render(<HeartbeatHarness enabled />);

    await vi.advanceTimersByTimeAsync(ACTIVITY_HEARTBEAT_INTERVAL_MS * 3);
    expect(mocks.record).toHaveBeenCalledTimes(1);

    resolveFirst?.();
    await flushPromises();
    await vi.advanceTimersByTimeAsync(ACTIVITY_HEARTBEAT_INTERVAL_MS);
    expect(mocks.record).toHaveBeenCalledTimes(2);
  });

  it('cleans up timers, listeners, and in-flight work on unmount', async () => {
    const removeDocumentListener = vi.spyOn(document, 'removeEventListener');
    const removeWindowListener = vi.spyOn(window, 'removeEventListener');
    const view = render(<HeartbeatHarness enabled />);
    expect(mocks.record).toHaveBeenCalledTimes(1);

    view.unmount();
    await vi.advanceTimersByTimeAsync(ACTIVITY_HEARTBEAT_INTERVAL_MS * 2);
    fireEvent(window, new Event('focus'));
    expect(mocks.record).toHaveBeenCalledTimes(1);
    expect(removeDocumentListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(removeWindowListener).toHaveBeenCalledWith('pagehide', expect.any(Function));
    expect(removeWindowListener).toHaveBeenCalledWith('pageshow', expect.any(Function));
    expect(removeWindowListener).toHaveBeenCalledWith('focus', expect.any(Function));
  });

  it('stops after a final 401 because shared refresh has already been attempted', async () => {
    mocks.record.mockRejectedValueOnce(new mocks.ApiError('unauthorized', 401, 'UNAUTHORIZED'));
    render(<HeartbeatHarness enabled />);
    await flushPromises();

    await vi.advanceTimersByTimeAsync(ACTIVITY_HEARTBEAT_INTERVAL_MS * 3);
    expect(mocks.record).toHaveBeenCalledTimes(1);
  });

  it('backs off safely after a 429', async () => {
    mocks.record.mockRejectedValueOnce(new mocks.ApiError('limited', 429, 'RATE_LIMITED'));
    render(<HeartbeatHarness enabled />);
    await flushPromises();

    await vi.advanceTimersByTimeAsync(ACTIVITY_HEARTBEAT_INTERVAL_MS);
    expect(mocks.record).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(
      ACTIVITY_RATE_LIMIT_BACKOFF_MS - ACTIVITY_HEARTBEAT_INTERVAL_MS,
    );
    expect(mocks.record).toHaveBeenCalledTimes(2);
  });

  it('fails silently and waits for the next cycle after network or server errors', async () => {
    mocks.record
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new mocks.ApiError('server', 500, 'API_ERROR'));
    render(<HeartbeatHarness enabled />);
    await flushPromises();

    expect(mocks.record).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(ACTIVITY_HEARTBEAT_INTERVAL_MS);
    expect(mocks.record).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(ACTIVITY_HEARTBEAT_INTERVAL_MS);
    expect(mocks.record).toHaveBeenCalledTimes(3);
  });
});
