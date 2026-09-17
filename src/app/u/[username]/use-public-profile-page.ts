import { useWriteContract } from '@bluxcc/react';
import { useCallback, useEffect, useState } from 'react';
import { useAvatarPalette } from '@/components/discover/use-avatar-palette';
import { ApiError, messengerApi, profileApi } from '@/lib/api';
import {
  loadPendingAuraPurchase,
  registerAndConfirmAuraPurchase,
  type PendingAuraPurchase,
} from '@/lib/aura-purchase-workflow';
import { useAuth, WALLET_NETWORK_PASSPHRASE } from '@/lib/blux';
import {
  contractU64ToString,
  getBeSeenContractAddress,
} from '@/lib/bounty-contract';
import {
  invalidateData,
  subscribeToInvalidation,
} from '@/lib/data-invalidation';
import type { FollowCounts, PublicUser } from '@/types';

/**
 * End-to-end states of the real Aura purchase flow. The wallet SDK collapses
 * simulation, signing, submission, and network confirmation into one await,
 * so those intermediate phases advance as a group while the wallet prompt is
 * open; every phase is still surfaced so the UI can label progress honestly.
 */
export type AuraPurchasePhase =
  | 'idle'
  | 'loading_price'
  | 'price_unavailable'
  | 'preparing'
  | 'simulating'
  | 'awaiting_wallet_signature'
  | 'submitting'
  | 'confirming_transaction'
  | 'registering_with_server'
  | 'awaiting_server_confirmation'
  | 'confirmed'
  | 'failed'
  | 'canceled';

/**
 * Phases where an on-chain transaction may be in flight and a new purchase
 * must be blocked. `awaiting_server_confirmation` is deliberately excluded:
 * the transaction is already final there, so only the idempotent API
 * registration is parked and a manual retry must stay possible.
 */
const TRANSACTION_PHASES: ReadonlySet<AuraPurchasePhase> = new Set([
  'preparing',
  'simulating',
  'awaiting_wallet_signature',
  'submitting',
  'confirming_transaction',
  'registering_with_server',
]);

export function auraPurchasePhaseLabel(
  phase: AuraPurchasePhase,
): string | null {
  switch (phase) {
    case 'preparing':
      return 'Preparing the purchase…';
    case 'simulating':
      return 'Simulating the contract call…';
    case 'awaiting_wallet_signature':
      return 'Approve the transaction in your wallet…';
    case 'submitting':
      return 'Submitting the transaction…';
    case 'confirming_transaction':
      return 'Waiting for the Stellar network…';
    case 'registering_with_server':
      return 'Registering your purchase…';
    case 'awaiting_server_confirmation':
      return 'Purchase confirmed on-chain. Finalizing your access…';
    case 'confirmed':
      return 'Aura purchased';
    default:
      return null;
  }
}

function isWalletCancellation(cause: unknown): boolean {
  return (
    cause instanceof Error &&
    /reject|cancel|declin|dismiss/i.test(cause.message)
  );
}

function auraPurchaseErrorMessage(cause: ApiError): string {
  switch (cause.code) {
    case 'OWN_AURA':
      return 'You cannot purchase your own Aura.';
    case 'WALLET_MISMATCH':
      return 'This purchase was made by a different wallet than the one on your account.';
    case 'TOKEN_CONFLICT':
      return 'This Aura token was registered for a different purchase.';
    case 'AURA_PURCHASE_REJECTED':
      return 'The server could not match this purchase on-chain.';
    case 'SUBJECT_NOT_FOUND':
      return 'This BeSeen profile does not exist anymore.';
    case 'BUYER_UNAVAILABLE':
      return 'Your account is unavailable. Sign in again and retry.';
    case 'VALIDATION_ERROR':
      return 'The purchase registration was invalid. Retry the registration.';
    default:
      return cause.message;
  }
}

export function usePublicProfilePage(username: string) {
  // Auth and on-chain write helpers
  const auth = useAuth();
  const { mutateAsync: writeContract } = useWriteContract<bigint>();

  // Page state: profile, follow/subscribe, conversation, and UI flags
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [followCounts, setFollowCounts] = useState<FollowCounts | null>(null);
  const [following, setFollowing] = useState(false);
  const [purchasePhase, setPurchasePhase] = useState<AuraPurchasePhase>('idle');
  const [pendingPurchase, setPendingPurchase] =
    useState<PendingAuraPurchase | null>(null);
  const [registrationBusy, setRegistrationBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [countsLoading, setCountsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [countsError, setCountsError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [approvalOpen, setApprovalOpen] = useState(false);

  // Banner colors derived from the profile avatar
  const [bannerPrimary, bannerSecondary] = useAvatarPalette(
    profile?.avatar ?? null,
    profile?.id || profile?.username || username,
  );

  // Fetch public profile for this username
  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);

    try {
      const loadedProfile = await profileApi.public(username);
      setProfile(loadedProfile);
    } catch (cause) {
      setProfile(null);
      setProfileError(
        cause instanceof ApiError &&
          (cause.status === 404 || cause.code === 'USER_NOT_FOUND')
          ? 'This BeSeen profile does not exist.'
          : cause instanceof Error
            ? cause.message
            : 'This BeSeen profile could not be loaded.',
      );
    } finally {
      setProfileLoading(false);
    }
  }, [username]);

  // Fetch follower / following counts
  const loadFollowCounts = useCallback(async () => {
    setCountsLoading(true);
    setCountsError(null);

    try {
      setFollowCounts(await profileApi.followCounts(username));
    } catch (cause) {
      setFollowCounts(null);
      setCountsError(
        cause instanceof ApiError &&
          (cause.status === 404 || cause.code === 'USER_NOT_FOUND')
          ? 'Follow counts are unavailable because this user was not found.'
          : 'Follow counts could not be loaded.',
      );
    } finally {
      setCountsLoading(false);
    }
  }, [username]);

  // Initial load of profile and follow counts
  useEffect(() => {
    void Promise.allSettled([loadProfile(), loadFollowCounts()]);
  }, [loadFollowCounts, loadProfile]);

  // Refresh when follow counts or public profile are invalidated
  useEffect(
    () =>
      subscribeToInvalidation((detail) => {
        if (!detail.username || detail.username === username) {
          if (detail.resource === 'follow-counts') void loadFollowCounts();
          if (detail.resource === 'public-profile') void loadProfile();
        }
      }),
    [loadFollowCounts, loadProfile, username],
  );

  // A confirmed Aura purchase is the only source of the Follow relationship,
  // and it always creates the canonical conversation. The conversation list is
  // therefore the client-side signal that the viewer already follows this user.
  useEffect(() => {
    let active = true;
    setFollowing(false);
    setConversationId(null);

    if (!profile || !auth.user || auth.user.id === profile.id) {
      return () => {
        active = false;
      };
    }

    void messengerApi
      .findConversationWithUser(profile.id)
      .then((conversation) => {
        if (!active || !conversation) return;
        setFollowing(true);
        setConversationId(conversation.id);
      })
      .catch((cause) => {
        if (active) {
          setActionError(
            cause instanceof Error
              ? cause.message
              : 'Your subscription status could not be loaded.',
          );
        }
      });

    return () => {
      active = false;
    };
  }, [auth.user, profile]);

  // Open the buy / subscribe confirmation dialog
  const openApproval = useCallback(() => {
    if (
      !profile ||
      !auth.user ||
      TRANSACTION_PHASES.has(purchasePhase) ||
      pendingPurchase
    )
      return;
    setActionError(null);
    setApprovalOpen(true);
  }, [auth.user, pendingPurchase, profile, purchasePhase]);

  // Apply a server-confirmed purchase: only now does messaging unlock.
  const applyConfirmedPurchase = useCallback(
    (conversation: { id: string } | null) => {
      setPendingPurchase(null);
      setFollowing(true);
      if (conversation) setConversationId(conversation.id);
      setPurchasePhase('confirmed');
      if (profile) {
        invalidateData({
          resource: 'public-profile',
          username: profile.username,
        });
        invalidateData({
          resource: 'follow-counts',
          username: profile.username,
        });
      }
      if (auth.user) {
        invalidateData({
          resource: 'follow-counts',
          username: auth.user.username,
        });
      }
      invalidateData({ resource: 'conversations' });
      invalidateData({ resource: 'current-user' });
      invalidateData({ resource: 'discover' });
    },
    [auth.user, profile],
  );

  // Drive the idempotent server registration until it is confirmed or the
  // bounded retry budget is exhausted. The registration stays persisted either
  // way and can be resumed or retried manually — never a second transaction.
  const runRegistration = useCallback(
    async (purchase: PendingAuraPurchase) => {
      if (registrationBusy) return;
      setRegistrationBusy(true);
      try {
        const confirmation = await registerAndConfirmAuraPurchase(
          purchase.subjectUsername,
          purchase.payload,
          {
            onPending: () => setPurchasePhase('awaiting_server_confirmation'),
          },
        );
        if (confirmation.state === 'confirmed') {
          applyConfirmedPurchase(confirmation.result.conversation);
        } else {
          setPendingPurchase(purchase);
          setPurchasePhase('awaiting_server_confirmation');
        }
      } catch (cause) {
        setPendingPurchase(purchase);
        setPurchasePhase('failed');
        setActionError(
          cause instanceof ApiError
            ? auraPurchaseErrorMessage(cause)
            : 'The purchase could not be registered. Your confirmed transaction is preserved — retry the registration.',
        );
      } finally {
        setRegistrationBusy(false);
      }
    },
    [applyConfirmedPurchase, registrationBusy],
  );

  // Resume a persisted registration after a reload (HTTP 202 recovery).
  useEffect(() => {
    if (!profile || !auth.user || auth.user.id === profile.id) return;
    let active = true;
    void loadPendingAuraPurchase(profile.username)
      .then((stored) => {
        if (active && stored) {
          setPendingPurchase(stored);
          setPurchasePhase('awaiting_server_confirmation');
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [auth.user, profile]);

  // On-chain buy_aura (wallet-signed), then register with the API.
  const confirmPurchase = useCallback(async () => {
    if (
      !profile ||
      !auth.user ||
      TRANSACTION_PHASES.has(purchasePhase) ||
      pendingPurchase
    )
      return;

    setApprovalOpen(false);
    setActionError(null);
    setPurchasePhase('preparing');

    try {
      const buyerAddress = auth.address;
      if (!buyerAddress) {
        throw new Error(
          'Connect your Stellar wallet before purchasing an Aura.',
        );
      }
      if (auth.config.networkPassphrase !== WALLET_NETWORK_PASSPHRASE) {
        throw new Error(
          'Your wallet is on a different Stellar network than this BeSeen deployment.',
        );
      }
      const subjectAddress = profile.walletAddress;
      if (!subjectAddress) {
        throw new Error('This profile does not have a wallet address yet.');
      }
      if (buyerAddress.toUpperCase() === subjectAddress.toUpperCase()) {
        throw new Error('You cannot purchase your own Aura.');
      }
      if (profile.auraPrice === null) {
        setPurchasePhase('price_unavailable');
        throw new Error(
          'The current Aura price is unavailable. Refresh the price and try again.',
        );
      }

      // The wallet SDK simulates, signs, submits, and waits for final success.
      setPurchasePhase('awaiting_wallet_signature');
      const transaction = await writeContract({
        call: {
          address: getBeSeenContractAddress(),
          fn: 'buy_aura',
          args: [buyerAddress, subjectAddress],
        },
      });

      // The contract mints the global Aura token ID; the client never invents it.
      const tokenId = contractU64ToString(await transaction.returnValue());
      console.log(
        `Aura purchase transaction confirmed on-chain: token ID ${tokenId}, hash ${transaction.hash}`,
      );

      const purchase: PendingAuraPurchase = {
        subjectUsername: profile.username,
        payload: {
          tokenId,
          buyerAddress,
          subjectAddress,
          transactionHash: transaction.hash.toLowerCase(),
        },
        createdAt: new Date().toISOString(),
      };

      console.log('1');

      setPendingPurchase(purchase);
      setPurchasePhase('registering_with_server');
      await runRegistration(purchase);
    } catch (cause) {
      if (isWalletCancellation(cause)) {
        setPurchasePhase('canceled');
        setActionError(null);
        return;
      }
      setPurchasePhase((current) =>
        current === 'price_unavailable' ? current : 'failed',
      );
      setActionError(
        cause instanceof Error
          ? cause.message
          : 'This Aura could not be purchased.',
      );
    }
  }, [
    auth.address,
    auth.config,
    auth.user,
    pendingPurchase,
    profile,
    purchasePhase,
    runRegistration,
    writeContract,
  ]);

  // Manual retry for a purchase that is registered but still confirming.
  const retryPurchaseConfirmation = useCallback(() => {
    if (!pendingPurchase || registrationBusy) return;
    setActionError(null);
    setPurchasePhase('registering_with_server');
    void runRegistration(pendingPurchase);
  }, [pendingPurchase, registrationBusy, runRegistration]);

  // Native share when available, otherwise copy the profile URL
  const shareProfile = useCallback(
    async (profileUrl: string) => {
      const url = `${window.location.origin}/u/${profile?.username ?? username}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: `@${username} on BeSeen`, url });
          return;
        } catch {
          return;
        }
      }

      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    },
    [profile?.username, username],
  );

  // A new purchase is blocked while a transaction is in flight, while the
  // registration loop runs, and while an unconfirmed registration is parked.
  const followingBusy =
    TRANSACTION_PHASES.has(purchasePhase) ||
    registrationBusy ||
    pendingPurchase !== null;

  // Values and actions consumed by the public profile page
  return {
    auth,
    profile,
    followCounts,
    following,
    followingBusy,
    purchasePhase,
    pendingPurchase,
    registrationBusy,
    conversationId,
    copied,
    profileLoading,
    countsLoading,
    profileError,
    countsError,
    actionError,
    approvalOpen,
    bannerPrimary,
    bannerSecondary,
    loadProfile,
    loadFollowCounts,
    openApproval,
    confirmPurchase,
    retryPurchaseConfirmation,
    setApprovalOpen,
    shareProfile,
    setFollowing,
    setConversationId,
  };
}
