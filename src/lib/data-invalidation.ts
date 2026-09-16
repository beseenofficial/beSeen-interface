export type DataResource =
  | 'current-user'
  | 'conversations'
  | 'discover'
  | 'follow-counts'
  | 'public-profile';

export type DataInvalidation = {
  resource: DataResource;
  username?: string;
  conversationId?: string;
};

const EVENT_NAME = 'beseen:data-invalidated';

export function invalidateData(detail: DataInvalidation): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<DataInvalidation>(EVENT_NAME, { detail }));
  }
}

export function invalidateAuthenticatedData(): void {
  invalidateData({ resource: 'current-user' });
  invalidateData({ resource: 'conversations' });
  invalidateData({ resource: 'follow-counts' });
}

export function subscribeToInvalidation(
  listener: (detail: DataInvalidation) => void,
): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<DataInvalidation>).detail);
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
