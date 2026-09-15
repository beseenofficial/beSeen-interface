import { useWriteContract } from '@bluxcc/react';
import { useCallback, useEffect, useState } from 'react';
import { useAvatarPalette } from '@/components/discover/use-avatar-palette';
import { ApiError, messengerApi, profileApi, tokenApi } from '@/lib/api';
import { useAuth } from '@/lib/blux';
import {
  invalidateData,
  subscribeToInvalidation,
} from '@/lib/data-invalidation';
import { getBeSeenContractAddress } from '@/lib/bounty-contract';
import type { FollowCounts, PublicUser } from '@/types';

export function usePublicProfilePage(username: string) {
  // Auth and on-chain write helpers
  const auth = useAuth();
  const { mutateAsync, mutate, isPending } = useWriteContract<void>();

  // Page state: profile, follow/subscribe, conversation, and UI flags
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [followCounts, setFollowCounts] = useState<FollowCounts | null>(null);
  const [following, setFollowing] = useState(false);
  const [followingBusy, setFollowingBusy] = useState(false);
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
      let loadedProfile = await profileApi.public(username);
      if (
        loadedProfile.broadcastCount === undefined ||
        loadedProfile.messageCount === undefined ||
        loadedProfile.totalBountyReceivedUsdc === undefined
      ) {
        loadedProfile = await profileApi.public(username);
      }
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

  // Resolve whether the viewer already owns this user's token (subscribed)
  useEffect(() => {
    let active = true;
    setFollowing(false);
    setConversationId(null);

    if (!profile || !auth.user || auth.user.id === profile.id) {
      return () => {
        active = false;
      };
    }

    void tokenApi
      .mine()
      .then(async (holdings) => {
        if (active) {
          const ownsToken = holdings.some(
            (token) => token.owner.id === profile.id,
          );
          setFollowing(ownsToken);
          if (ownsToken) {
            const conversation = await messengerApi.findConversationWithUser(
              profile.id,
            );
            if (active) setConversationId(conversation?.id ?? null);
          }
        }
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
    if (!profile || !auth.user || followingBusy) return;
    setActionError(null);
    setApprovalOpen(true);
  }, [auth.user, followingBusy, profile]);

  // On-chain buy_aura, then persist the purchase on the API
  const confirmPurchase = useCallback(async () => {
    if (!profile || !auth.user || followingBusy) return;

    setApprovalOpen(false);
    setFollowingBusy(true);
    setActionError(null);

    try {
      const { subjectAddress } = await tokenApi.purchaseContext(
        profile.username,
      );

      const auraResult = await mutateAsync({
        call: {
          address: getBeSeenContractAddress(),
          fn: 'buy_aura',
          args: [auth.address, subjectAddress],
        },
      });

      const val = await auraResult.returnValue();
      console.log('val:' + val);
      const result = await tokenApi.purchase(profile.username);
      console.log('Purchase result:', result);

      setFollowing(true);
      setConversationId(result.conversation.id);
      invalidateData({ resource: 'follow-counts', username: profile.username });
      invalidateData({ resource: 'owned-tokens' });
      invalidateData({ resource: 'conversations' });
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : 'This profile could not be followed.',
      );
    } finally {
      setFollowingBusy(false);
    }
  }, [auth.address, auth.user, followingBusy, mutateAsync, profile]);

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

  // Values and actions consumed by the public profile page
  return {
    auth,
    profile,
    followCounts,
    following,
    followingBusy,
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
    setApprovalOpen,
    shareProfile,
    setFollowing,
    setConversationId,
  };
}
