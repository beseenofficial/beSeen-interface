'use client';

import { AlertCircle, LoaderCircle, Radio } from 'lucide-react';

export function BroadcastFeedError({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  if (!error) return null;
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-error/20 bg-error-bg px-4 py-3 text-xs text-error" role="alert">
      <AlertCircle size={16} /> <span className="min-w-0 flex-1">{error}</span>
      <button className="font-semibold underline" onClick={onRetry} type="button">Try again</button>
    </div>
  );
}

export function BroadcastFeedLoading() {
  return (
    <div className="grid min-h-56 place-items-center text-secondary" role="status">
      <LoaderCircle className="animate-spin" size={25} />
    </div>
  );
}

export function BroadcastFeedEmpty() {
  return (
    <div className="grid min-h-56 place-items-center text-center">
      <div>
        <Radio className="mx-auto text-brand" size={28} />
        <h2 className="mt-3 text-base font-semibold">Your Broadcast channel is ready</h2>
        <p className="mt-1 text-xs text-secondary">Share your first update with your followers.</p>
      </div>
    </div>
  );
}
