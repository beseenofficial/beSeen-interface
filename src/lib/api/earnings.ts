import { apiRequest } from '@/lib/api/transport';

export type SignedDecimalString = string;

type EarningTransactionBase = {
  id: string;
  assetCode: 'USDC';
  /** Signed USDC decimal string. Withdrawals are negative. */
  amount: SignedDecimalString;
  transactionHash: string;
  earnedAt: string;
};

export type EarningTransaction = EarningTransactionBase & (
  | {
      type: 'bounty_reply';
      reason: 'Bounty reply reward';
      contractBountyId: string;
      contractAuraTokenId: null;
    }
  | {
      type: 'aura_purchase';
      reason: 'Aura purchase earning';
      contractBountyId: null;
      contractAuraTokenId: string;
    }
  | {
      type: 'withdrawal';
      reason: 'Earnings withdrawal';
      contractBountyId: null;
      contractAuraTokenId: null;
    }
);

export type EarningsPage = {
  assetCode: 'USDC';
  /** Signed net tracked balance in USDC. */
  totalAmount: SignedDecimalString;
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
