import { apiRequest } from '@/lib/api/transport';

export type EarningTransaction = {
  id: string;
  type: 'bounty_reply';
  reason: 'Bounty reply reward';
  contractBountyId: string;
  assetCode: 'USDC';
  amount: string;
  transactionHash: string;
  earnedAt: string;
};

export type EarningsPage = {
  assetCode: 'USDC';
  totalAmount: string;
  items: EarningTransaction[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type EarningsQuery = {
  limit?: number;
  before?: string;
};

function earningsPath(query: EarningsQuery = {}): string {
  const search = new URLSearchParams();
  if (query.limit !== undefined) search.set('limit', String(query.limit));
  if (query.before !== undefined) search.set('before', query.before);
  const serialized = search.toString();
  return `/v1/users/me/earnings${serialized ? `?${serialized}` : ''}`;
}

export const earningsApi = {
  async list(
    query: EarningsQuery = {},
    signal?: AbortSignal,
  ): Promise<EarningsPage> {
    return (
      await apiRequest<{ earnings: EarningsPage }>(earningsPath(query), {
        auth: true,
        signal,
      })
    ).earnings;
  },
};
