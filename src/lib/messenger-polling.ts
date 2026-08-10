export type MessengerPoller = { stop: () => void; runNow: () => void };

export function startMessengerPolling(options: {
  task: () => Promise<void>;
  intervalMs?: number;
  maxIntervalMs?: number;
  document?: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
}): MessengerPoller {
  const intervalMs = options.intervalMs ?? 12_000;
  const maxIntervalMs = options.maxIntervalMs ?? 60_000;
  const visibilityDocument = options.document ?? document;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  let inFlight = false;
  let failures = 0;

  const clearTimer = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const schedule = (delay: number) => {
    clearTimer();
    if (!stopped && visibilityDocument.visibilityState === 'visible') {
      timer = setTimeout(run, delay);
    }
  };

  const run = async () => {
    if (stopped || inFlight || visibilityDocument.visibilityState !== 'visible') return;
    inFlight = true;
    try {
      await options.task();
      failures = 0;
    } catch {
      failures += 1;
    } finally {
      inFlight = false;
      const delay = Math.min(intervalMs * 2 ** failures, maxIntervalMs);
      schedule(delay);
    }
  };

  const visibilityChanged = () => {
    if (visibilityDocument.visibilityState === 'visible') void run();
    else clearTimer();
  };
  visibilityDocument.addEventListener('visibilitychange', visibilityChanged);
  schedule(0);

  return {
    runNow: () => void run(),
    stop: () => {
      stopped = true;
      clearTimer();
      visibilityDocument.removeEventListener('visibilitychange', visibilityChanged);
    },
  };
}

export type ReadCursorBatcher = {
  push: (sequence: number) => void;
  flush: () => Promise<void>;
  dispose: () => void;
};

export function createReadCursorBatcher(
  send: (throughSequence: number) => Promise<void>,
  delayMs = 300,
): ReadCursorBatcher {
  let pending = 0;
  let sent = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  let inFlight: Promise<void> | null = null;

  const clearTimer = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const flush = async () => {
    clearTimer();
    if (disposed || pending <= sent) return;
    if (inFlight) {
      await inFlight;
      if (pending > sent) await flush();
      return;
    }
    const throughSequence = pending;
    inFlight = send(throughSequence)
      .then(() => {
        sent = Math.max(sent, throughSequence);
      })
      .finally(() => {
        inFlight = null;
      });
    await inFlight;
    if (!disposed && pending > sent) await flush();
  };

  return {
    push(sequence) {
      if (disposed || !Number.isInteger(sequence) || sequence <= pending) return;
      pending = sequence;
      clearTimer();
      timer = setTimeout(() => void flush(), delayMs);
    },
    flush,
    dispose() {
      disposed = true;
      clearTimer();
    },
  };
}
