"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { User } from "@/types";
import { useAuth } from "./auth-provider";

type ProfileContextValue = {
  profile: User | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateProfile: (profile: User) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const refresh = useCallback(async () => {
    await auth.refreshUser();
  }, [auth]);
  const value = useMemo<ProfileContextValue>(
    () => ({
      profile: auth.user,
      loading: auth.accountState === "loading",
      error: auth.error,
      refresh,
      updateProfile: auth.updateUser,
    }),
    [auth.accountState, auth.error, auth.updateUser, auth.user, refresh],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error("useProfile must be used inside ProfileProvider");
  return context;
}
