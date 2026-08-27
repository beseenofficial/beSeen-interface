"use client";

import { useEffect, useRef } from "react";
import { activityApi, ApiError, hasAccessToken } from "@/lib/api";

export const ACTIVITY_HEARTBEAT_INTERVAL_MS = 60_000;
export const ACTIVITY_RATE_LIMIT_BACKOFF_MS = 120_000;

export function useActivityHeartbeat(enabled: boolean): void {
  const requestController = useRef<AbortController | null>(null);
  const rateLimitedUntil = useRef(0);
  const unauthorized = useRef(false);

  useEffect(() => {
    let active = false;
    let disposed = false;
    let interval: number | null = null;

    const clearIntervalTimer = () => {
      if (interval !== null) window.clearInterval(interval);
      interval = null;
    };

    const cancelRequest = () => {
      const controller = requestController.current;
      requestController.current = null;
      controller?.abort();
    };

    const stopCycle = () => {
      active = false;
      clearIntervalTimer();
      cancelRequest();
    };

    const sendHeartbeat = () => {
      if (
        disposed ||
        !active ||
        requestController.current ||
        unauthorized.current ||
        Date.now() < rateLimitedUntil.current
      ) {
        return;
      }
      if (!hasAccessToken()) {
        stopCycle();
        return;
      }

      const controller = new AbortController();
      requestController.current = controller;
      void activityApi
        .record(controller.signal)
        .catch((cause: unknown) => {
          if (controller.signal.aborted) return;
          if (cause instanceof ApiError && cause.status === 429) {
            rateLimitedUntil.current = Date.now() + ACTIVITY_RATE_LIMIT_BACKOFF_MS;
          } else if (cause instanceof ApiError && cause.status === 401) {
            // The shared transport has already attempted one refresh and one retry.
            unauthorized.current = true;
          }
          // Presence is best-effort; other failures remain intentionally silent.
        })
        .finally(() => {
          if (requestController.current === controller) {
            requestController.current = null;
          }
        });
    };

    const startCycle = () => {
      if (
        disposed ||
        active ||
        document.visibilityState !== "visible" ||
        !hasAccessToken()
      ) {
        return;
      }
      active = true;
      sendHeartbeat();
      interval = window.setInterval(sendHeartbeat, ACTIVITY_HEARTBEAT_INTERVAL_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") startCycle();
      else stopCycle();
    };
    const handlePageHide = () => stopCycle();
    const handlePageShow = () => startCycle();
    const handleFocus = () => startCycle();

    if (!enabled) {
      unauthorized.current = false;
      rateLimitedUntil.current = 0;
      stopCycle();
      return;
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("focus", handleFocus);
    startCycle();

    return () => {
      disposed = true;
      stopCycle();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("focus", handleFocus);
    };
  }, [enabled]);
}
