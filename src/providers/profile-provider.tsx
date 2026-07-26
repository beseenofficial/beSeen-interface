"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { mockApi } from "@/lib/mock-api";
import type { CreatorProfile } from "@/types";
import { useAuth } from "./auth-provider";

type ProfileContextValue = {
  profile: CreatorProfile | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateProfile: (profile: CreatorProfile) => void;
};

type ProfileState = Pick<ProfileContextValue, "profile" | "loading" | "error">;
type ProfileRequest = {
  address: string;
  promise: Promise<CreatorProfile>;
};

const INITIAL_PROFILE_STATE: ProfileState = {
  profile: null,
  loading: true,
  error: null,
};

const SIGNED_OUT_PROFILE_STATE: ProfileState = {
  profile: null,
  loading: false,
  error: null,
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { address, isAuthenticated, isReady } = useAuth();
  const [{ profile, loading, error }, setState] = useState<ProfileState>(
    INITIAL_PROFILE_STATE,
  );
  const requestId = useRef(0);
  const inFlightRequest = useRef<ProfileRequest | null>(null);

  const updateProfile = useCallback((nextProfile: CreatorProfile) => {
    setState({ profile: nextProfile, error: null, loading: false });
  }, []);

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (!address) {
      setState(SIGNED_OUT_PROFILE_STATE);
      return;
    }

    setState((current) => ({ ...current, loading: true, error: null }));

    let request = inFlightRequest.current;
    if (!request || request.address !== address) {
      const promise = mockApi.getCurrentProfile(address);
      request = { address, promise };
      inFlightRequest.current = request;
      const clearRequest = () => {
        if (inFlightRequest.current?.promise === promise) {
          inFlightRequest.current = null;
        }
      };
      void promise.then(clearRequest, clearRequest);
    }

    try {
      const nextProfile = await request.promise;
      if (currentRequest === requestId.current) {
        setState({ profile: nextProfile, loading: false, error: null });
      }
    } catch (cause) {
      if (currentRequest === requestId.current) {
        setState((current) => ({
          ...current,
          loading: false,
          error:
            cause instanceof Error
              ? cause.message
              : "We could not load your creator profile.",
        }));
      }
    }
  }, [address]);

  useEffect(() => {
    const invalidateRequest = () => {
      requestId.current += 1;
    };

    if (!isReady) return invalidateRequest;
    if (!isAuthenticated) {
      invalidateRequest();
      inFlightRequest.current = null;
      setState(SIGNED_OUT_PROFILE_STATE);
      return invalidateRequest;
    }

    void refresh();
    return invalidateRequest;
  }, [isAuthenticated, isReady, refresh]);

  const value = useMemo(
    () => ({ profile, loading, error, refresh, updateProfile }),
    [profile, loading, error, refresh, updateProfile],
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
