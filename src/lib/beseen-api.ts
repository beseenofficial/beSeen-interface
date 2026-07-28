"use client";

import { apiRequest } from "@/lib/api-client";
import type {
  AuthClientConfig,
  AuthenticatedResult,
  BroadcastDraft,
  BroadcastDraftListPage,
  BroadcastFeedPage,
  BroadcastRecipientPage,
  ChallengeResult,
  ProfileUpdate,
  PublicUserKeys,
  PublicUser,
  RegistrationProfileInput,
  User,
  UsernameAvailability,
} from "@/types";

export const beseenApi = {
  getAuthConfig() {
    return apiRequest<AuthClientConfig>("/auth/config");
  },

  createLoginChallenge(walletAddress: string) {
    return apiRequest<ChallengeResult>("/auth/login/challenge", {
      method: "POST",
      body: JSON.stringify({ walletAddress }),
    });
  },

  login(challengeId: string, signedTransactionXdr: string) {
    return apiRequest<AuthenticatedResult>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ challengeId, signedTransactionXdr }),
    });
  },

  createRegistrationChallenge(
    walletAddress: string,
    keys: {
      derivationVersion: 1;
      signingPublicKey: string;
      encryptionPublicKey: string;
    },
  ) {
    return apiRequest<ChallengeResult>("/auth/registration/challenge", {
      method: "POST",
      body: JSON.stringify({
        walletAddress,
        keys: {
          derivationVersion: keys.derivationVersion,
          signing: {
            algorithm: "Ed25519",
            publicKey: keys.signingPublicKey,
          },
          encryption: {
            algorithm: "X25519",
            publicKey: keys.encryptionPublicKey,
          },
        },
      }),
    });
  },

  register(
    challengeId: string,
    signedTransactionXdr: string,
    profile: RegistrationProfileInput,
  ) {
    return apiRequest<AuthenticatedResult>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ challengeId, signedTransactionXdr, profile }),
    });
  },

  logout() {
    return apiRequest<Record<string, never>>(
      "/auth/logout",
      { method: "POST" },
      { authenticated: true },
    );
  },

  getMe() {
    return apiRequest<{ user: User }>("/users/me", {}, { authenticated: true });
  },

  updateMe(changes: ProfileUpdate) {
    return apiRequest<{ user: User }>(
      "/users/me",
      { method: "PATCH", body: JSON.stringify(changes) },
      { authenticated: true },
    );
  },

  checkUsername(username: string) {
    return apiRequest<UsernameAvailability>(
      `/users/username/availability?username=${encodeURIComponent(username)}`,
    );
  },

  getPublicKeys(username: string) {
    return apiRequest<{ keys: PublicUserKeys }>(
      `/users/${encodeURIComponent(username)}/keys`,
    );
  },

  getPublicProfile(username: string) {
    return apiRequest<{ user: PublicUser }>(
      `/users/${encodeURIComponent(username)}`,
    );
  },

  createBroadcastDraft(clientBroadcastId: string) {
    return apiRequest<{ draft: BroadcastDraft }>(
      "/broadcasts/drafts",
      {
        method: "POST",
        body: JSON.stringify({ clientBroadcastId }),
      },
      { authenticated: true },
    );
  },

  listBroadcastDrafts(cursor?: string) {
    const query = new URLSearchParams({ limit: "50" });
    if (cursor) query.set("cursor", cursor);
    return apiRequest<{ drafts: BroadcastDraftListPage }>(
      `/broadcasts/drafts?${query}`,
      {},
      { authenticated: true },
    );
  },

  getBroadcastRecipients(draftId: string, cursor?: string) {
    const query = new URLSearchParams({ limit: "250" });
    if (cursor) query.set("cursor", cursor);
    return apiRequest<{
      draft: {
        id: string;
        clientBroadcastId: string;
        status: "draft";
        audienceType: "all_active_users" | "token_holders";
        audienceCount: number;
        progress: {
          uploadedCount: number;
          remainingCount: number;
          complete: boolean;
        };
        expiresAt: string;
      };
      recipients: BroadcastRecipientPage;
    }>(
      `/broadcasts/drafts/${encodeURIComponent(draftId)}/recipients?${query}`,
      {},
      { authenticated: true },
    );
  },

  uploadRecipientKeys(
    draftId: string,
    keys: Array<{
      recipientId: string;
      keyVersion: number;
      encryptedBroadcastKey: string;
    }>,
  ) {
    return apiRequest<{
      progress: {
        acceptedCount: number;
        uploadedCount: number;
        audienceCount: number;
        remainingCount: number;
        complete: boolean;
      };
    }>(
      `/broadcasts/drafts/${encodeURIComponent(draftId)}/recipient-keys`,
      { method: "PUT", body: JSON.stringify({ keys }) },
      { authenticated: true },
    );
  },

  finalizeBroadcast(
    draftId: string,
    body: {
      contentCiphertext: string;
      contentNonce: string;
      creatorEncryptedBroadcastKey: string;
      signature: string;
    },
  ) {
    return apiRequest<{ broadcast: { id: string; publishedAt: string } }>(
      `/broadcasts/drafts/${encodeURIComponent(draftId)}/finalize`,
      { method: "POST", body: JSON.stringify(body) },
      { authenticated: true },
    );
  },

  cancelBroadcastDraft(draftId: string) {
    return apiRequest<{
      draft: {
        id: string;
        status: "canceled";
        canceledAt: string;
        removedRecipientCount: number;
      };
    }>(
      `/broadcasts/drafts/${encodeURIComponent(draftId)}`,
      { method: "DELETE" },
      { authenticated: true },
    );
  },

  getBroadcastFeed(
    view: "received" | "sent",
    cursor?: string,
    limit = 20,
  ) {
    const query = new URLSearchParams({ view, limit: String(limit) });
    if (cursor) query.set("cursor", cursor);
    return apiRequest<{ feed: BroadcastFeedPage }>(
      `/broadcasts/feed?${query}`,
      {},
      { authenticated: true },
    );
  },
};
