"use client";

import type {
  Broadcast,
  CreatorActivity,
  CreatorInfo,
  CreatorProfile,
  CreatorStats,
  DashboardOverview,
} from "@/types";
import { sanitizeBroadcast } from "./utils";

const KEYS = {
  profile: "beseen.mock.profile.v1",
  broadcasts: "beseen.mock.broadcasts.v1",
  activity: "beseen.mock.activity.v1",
} as const;

const latency = () =>
  new Promise((resolve) => setTimeout(resolve, 80 + Math.random() * 80));

export class MockApiError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "MockApiError";
  }
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    throw new MockApiError(
      "Your saved BeSeen data could not be read. Try refreshing the page.",
      "PERSISTENCE_READ_FAILED",
    );
  }
}

function write<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new MockApiError(
      "We could not save your changes on this device.",
      "PERSISTENCE_WRITE_FAILED",
    );
  }
}

function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function profileFor(address: string): CreatorProfile {
  return {
    id: `creator_${address.slice(-10)}`,
    stellarAddress: address,
    username: null,
    avatarUrl: null,
    messagingPublicKey: null,
    messagingKeyConfigured: false,
    onboardingCompleted: false,
    createdAt: new Date().toISOString(),
  };
}

function usernameIsAvailable(username: string) {
  const reserved = ["admin", "beseen", "support", "creator"];
  const current = read<CreatorProfile | null>(KEYS.profile, null);
  return (
    current?.username === username ||
    (!reserved.includes(username) && !username.endsWith("000"))
  );
}

function seedActivity(profile: CreatorProfile): CreatorActivity[] {
  return [
    {
      id: uid("activity"),
      type: "profile_created",
      title: "Account created",
      description: "Your BeSeen creator profile is ready to personalize.",
      createdAt: profile.createdAt,
    },
  ];
}

export const mockApi = {
  async getCurrentProfile(address: string): Promise<CreatorProfile> {
    await latency();
    const saved = read<CreatorProfile | null>(KEYS.profile, null);
    if (saved?.stellarAddress === address) return saved;
    const profile = profileFor(address);
    write(KEYS.profile, profile);
    write(KEYS.activity, seedActivity(profile));
    write(KEYS.broadcasts, []);
    return profile;
  },

  async createMessagingProfile(
    address: string,
    publicKey: string,
  ): Promise<CreatorProfile> {
    await latency();
    const saved = read<CreatorProfile | null>(KEYS.profile, null);
    const profile =
      saved?.stellarAddress === address ? saved : profileFor(address);
    const updated = {
      ...profile,
      messagingPublicKey: publicKey,
      messagingKeyConfigured: true,
    };
    write(KEYS.profile, updated);
    const activity = read<CreatorActivity[]>(KEYS.activity, []);
    if (!activity.some((item) => item.type === "messaging_key_created")) {
      activity.unshift({
        id: uid("activity"),
        type: "messaging_key_created",
        title: "Messaging key secured",
        description: "Private messaging is configured on this device.",
        createdAt: new Date().toISOString(),
      });
      write(KEYS.activity, activity);
    }
    return updated;
  },

  async updateCreatorProfile(input: {
    username: string;
    avatarUrl: string | null;
  }): Promise<CreatorProfile> {
    await latency();
    const profile = read<CreatorProfile | null>(KEYS.profile, null);
    if (!profile) throw new MockApiError("Profile not found.", "NOT_FOUND");
    if (!usernameIsAvailable(input.username)) {
      throw new MockApiError(
        "That username is already taken. Try another one.",
        "USERNAME_TAKEN",
      );
    }
    const updated = {
      ...profile,
      username: input.username,
      avatarUrl: input.avatarUrl,
      onboardingCompleted: true,
    };
    write(KEYS.profile, updated);
    const activity = read<CreatorActivity[]>(KEYS.activity, []);
    activity.unshift({
      id: uid("activity"),
      type: "profile_updated",
      title: "Aura identity created",
      description: `@${input.username} is now ready to share.`,
      createdAt: new Date().toISOString(),
    });
    activity.unshift(
      {
        id: uid("activity"),
        type: "bounty_received",
        title: "New bounty message received",
        description: "A supporter is waiting for your reply.",
        createdAt: new Date(Date.now() - 38 * 60_000).toISOString(),
      },
      {
        id: uid("activity"),
        type: "aura_acquired",
        title: "Your Aura gained an early supporter",
        description: "A community member acquired access to your Aura.",
        createdAt: new Date(Date.now() - 96 * 60_000).toISOString(),
      },
    );
    write(KEYS.activity, activity);
    return updated;
  },

  async checkUsernameAvailability(username: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return usernameIsAvailable(username);
  },

  async listBroadcasts(): Promise<Broadcast[]> {
    await latency();
    return read<Broadcast[]>(KEYS.broadcasts, []).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },

  async createBroadcast(content: string): Promise<Broadcast> {
    await latency();
    const clean = sanitizeBroadcast(content);
    if (!clean) {
      throw new MockApiError("Write an update before publishing.", "EMPTY");
    }
    if (clean.length > 500) {
      throw new MockApiError(
        "Broadcasts can be up to 500 characters.",
        "TOO_LONG",
      );
    }
    const profile = read<CreatorProfile | null>(KEYS.profile, null);
    if (!profile) throw new MockApiError("Profile not found.", "NOT_FOUND");
    const broadcast: Broadcast = {
      id: uid("broadcast"),
      creatorId: profile.id,
      content: clean,
      status: "published",
      recipientCount: 128,
      createdAt: new Date().toISOString(),
    };
    const broadcasts = read<Broadcast[]>(KEYS.broadcasts, []);
    write(KEYS.broadcasts, [broadcast, ...broadcasts]);
    const activity = read<CreatorActivity[]>(KEYS.activity, []);
    activity.unshift({
      id: uid("activity"),
      type: "broadcast_published",
      title: "Broadcast published",
      description: clean.slice(0, 90),
      createdAt: broadcast.createdAt,
    });
    write(KEYS.activity, activity);
    return broadcast;
  },

  async listCreatorActivity(): Promise<CreatorActivity[]> {
    await latency();
    return read<CreatorActivity[]>(KEYS.activity, []);
  },

  async getDashboardOverview(): Promise<DashboardOverview> {
    await latency();
    const profile = read<CreatorProfile | null>(KEYS.profile, null);
    if (!profile) throw new MockApiError("Profile not found.", "NOT_FOUND");
    const broadcasts = read<Broadcast[]>(KEYS.broadcasts, []);
    const activity = read<CreatorActivity[]>(KEYS.activity, []);
    const stats: CreatorStats = {
      auraHolders: 128,
      auraPrice: { amount: "12.50", asset: "USDC" },
      bountyMessages: 7,
      broadcastsSent: broadcasts.length,
      activityStatus: "Active today",
    };
    return { profile, stats, activity };
  },

  async getCreatorInfo(): Promise<CreatorInfo> {
    return this.getDashboardOverview();
  },
};
