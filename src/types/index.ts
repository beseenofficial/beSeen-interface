export type CreatorProfile = {
  id: string;
  stellarAddress: string;
  username: string | null;
  avatarUrl: string | null;
  messagingPublicKey: string | null;
  messagingKeyConfigured: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
};

export type Broadcast = {
  id: string;
  creatorId: string;
  content: string;
  status: "published";
  recipientCount: number;
  createdAt: string;
};

export type CreatorStats = {
  auraHolders: number;
  auraPrice: { amount: string; asset: string };
  bountyMessages: number;
  broadcastsSent: number;
  activityStatus: string;
};

export type ActivityType =
  | "profile_created"
  | "messaging_key_created"
  | "aura_acquired"
  | "broadcast_published"
  | "bounty_received"
  | "profile_updated";

export type CreatorActivity = {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  createdAt: string;
};

export type DashboardOverview = {
  profile: CreatorProfile;
  stats: CreatorStats;
  activity: CreatorActivity[];
};

export type CreatorInfo = DashboardOverview;
