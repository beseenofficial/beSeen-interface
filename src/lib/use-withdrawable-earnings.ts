'use client';

import { useBalances, useReadContracts, useWriteContract } from '@bluxcc/react';
import type { Horizon } from '@stellar/stellar-sdk';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getBeSeenContractAddress } from '@/lib/bounty-contract';
import { useAuth } from '@/lib/blux';
import { baseUnitsToDecimalString } from '@/lib/decimal';
import { useToast } from '@/providers/toast-provider';

const USDC_ASSET_CODE = 'USDC';
const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

function isWalletCancellation(cause: unknown): boolean {
  return cause instanceof Error && /reject|cancel|declin|dismiss/i.test(cause.message);
}

export function useWithdrawableEarnings({
  onWithdrawConfirmed,
}: {
  onWithdrawConfirmed?: () => void;
} = {}) {
  const { address, config } = useAuth();
  const { toast } = useToast();
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const earningsSyncTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (earningsSyncTimer.current !== null) window.clearTimeout(earningsSyncTimer.current);
  }, []);

  const contractAddress = useMemo(() => {
    try {
      return getBeSeenContractAddress();
    } catch {
      return null;
    }
  }, []);

  const contractEarnings = useReadContracts<[string]>(
    address && contractAddress
      ? [{ address: contractAddress, fn: 'earnings_balance', args: [address] }]
      : [],
    { network: config.networkPassphrase },
    { enabled: Boolean(address && contractAddress) },
  );

  const walletBalances = useBalances(
    {
      address: address ?? undefined,
      includeZeroBalances: true,
      network: config.networkPassphrase,
    },
    { enabled: Boolean(address) },
  );
  const { mutateAsync: writeContract, isPending: withdrawing } = useWriteContract<void>();

  const rawAmount = contractEarnings.data?.values[0];
  const hasValidAmount = typeof rawAmount === 'string' && /^(?:0|[1-9]\d*)$/.test(rawAmount);
  const amount = hasValidAmount ? baseUnitsToDecimalString(rawAmount) : null;
  const hasUsdcTrustline = walletBalances.data?.some(
    (balance: Horizon.HorizonApi.BalanceLine) =>
      'asset_code' in balance &&
      balance.asset_code === USDC_ASSET_CODE &&
      balance.asset_issuer === USDC_ISSUER,
  );
  const loading = contractEarnings.isLoading || walletBalances.isLoading;
  const error = !contractAddress || contractEarnings.isError || walletBalances.isError;
  const ready =
    Boolean(address && contractAddress) &&
    hasValidAmount &&
    !error &&
    !loading &&
    walletBalances.data !== undefined;
  const canWithdraw = ready && rawAmount !== undefined && rawAmount !== '0';

  const retry = useCallback(async () => {
    setWithdrawError(null);
    await Promise.allSettled([contractEarnings.refetch(), walletBalances.refetch()]);
  }, [contractEarnings, walletBalances]);

  const withdraw = useCallback(async () => {
    if (
      !address ||
      !contractAddress ||
      !canWithdraw ||
      rawAmount === undefined ||
      hasUsdcTrustline === undefined ||
      withdrawing
    ) {
      return;
    }

    setWithdrawError(null);
    try {
      const transaction = await writeContract({
        call: {
          address: contractAddress,
          fn: 'withdraw_earnings',
          args: [address, rawAmount, !hasUsdcTrustline],
        },
        options: { network: config.networkPassphrase },
      });
      await Promise.allSettled([contractEarnings.refetch(), walletBalances.refetch()]);
      if (earningsSyncTimer.current !== null) window.clearTimeout(earningsSyncTimer.current);
      earningsSyncTimer.current = window.setTimeout(() => {
        onWithdrawConfirmed?.();
        earningsSyncTimer.current = null;
      }, 3_000);
      toast(
        'Earnings withdrawn',
        `The transaction was confirmed in your wallet. Hash: ${transaction.hash.slice(0, 8)}…${transaction.hash.slice(-8)}`,
      );
    } catch (cause) {
      if (isWalletCancellation(cause)) return;
      setWithdrawError(
        cause instanceof Error ? cause.message : 'Your earnings could not be withdrawn.',
      );
    }
  }, [
    address,
    canWithdraw,
    config.networkPassphrase,
    contractAddress,
    contractEarnings,
    hasUsdcTrustline,
    onWithdrawConfirmed,
    rawAmount,
    toast,
    walletBalances,
    withdrawing,
    writeContract,
  ]);

  return {
    amount,
    canWithdraw,
    error,
    hasUsdcTrustline,
    loading,
    ready,
    retry,
    withdraw,
    withdrawError,
    withdrawing,
  };
}
