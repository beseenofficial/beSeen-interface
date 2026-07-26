import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BroadcastComposer } from "@/components/features/broadcasts/broadcast-composer";
import { BESEEN_MESSAGING_KEY_MESSAGE, DEMO_ADDRESS } from "@/lib/constants";
import { mockApi } from "@/lib/mock-api";
import {
  BLUX_LOGIN_METHODS,
  STELLAR_NETWORK,
  SUPPORTED_STELLAR_NETWORKS,
} from "@/lib/stellar-network";
import {
  requiredRoute,
  signingErrorMessage,
  validateUsername,
} from "@/lib/onboarding";
import type { CreatorProfile } from "@/types";

const baseProfile: CreatorProfile = {
  id: "creator_test",
  stellarAddress: DEMO_ADDRESS,
  username: null,
  avatarUrl: null,
  messagingPublicKey: null,
  messagingKeyConfigured: false,
  onboardingCompleted: false,
  createdAt: "2026-07-23T10:00:00.000Z",
};

describe("onboarding routing", () => {
  it("defaults to testnet while supporting both Stellar networks", () => {
    expect(STELLAR_NETWORK).toBe("testnet");
    expect(SUPPORTED_STELLAR_NETWORKS).toEqual(["testnet", "mainnet"]);
    expect(BLUX_LOGIN_METHODS).toContain("wallet");
  });

  it("redirects unauthenticated users to login", () => {
    expect(requiredRoute({ authenticated: false, profile: null, hasDeviceKey: false })).toBe("/login");
  });

  it("routes first-time authenticated users to security", () => {
    expect(requiredRoute({ authenticated: true, profile: baseProfile, hasDeviceKey: false })).toBe("/onboarding/security");
  });

  it("routes signed users to profile setup", () => {
    const profile = { ...baseProfile, messagingKeyConfigured: true };
    expect(requiredRoute({ authenticated: true, profile, hasDeviceKey: true })).toBe("/onboarding/profile");
  });

  it("routes completed returning users directly to the dashboard", () => {
    const profile = { ...baseProfile, username: "mohammad_m", messagingKeyConfigured: true, onboardingCompleted: true };
    expect(requiredRoute({ authenticated: true, profile, hasDeviceKey: true })).toBe("/dashboard");
  });

  it("routes a configured profile with missing device key back to recovery", () => {
    const profile = { ...baseProfile, username: "mohammad_m", messagingKeyConfigured: true, onboardingCompleted: true };
    expect(requiredRoute({ authenticated: true, profile, hasDeviceKey: false })).toBe("/onboarding/security");
  });
});

describe("security and profile validation", () => {
  it("uses the exact deterministic versioned signing message", () => {
    expect(BESEEN_MESSAGING_KEY_MESSAGE).toBe([
      "BeSeen Messenger Key Setup",
      "Version: 1",
      "Purpose: Create your private messaging encryption key.",
      "This signature does not authorize a transaction or move funds.",
      "Domain: beseen.fi",
    ].join("\n"));
  });

  it("turns rejected signing into an actionable retry message", () => {
    expect(signingErrorMessage(new Error("User rejected request"))).toContain("try again");
  });

  it("rejects invalid usernames and accepts valid creator handles", () => {
    expect(validateUsername("Bad Name")).toBe(false);
    expect(validateUsername("1creator")).toBe(false);
    expect(validateUsername("mo")).toBe(false);
    expect(validateUsername("mohammad_m")).toBe(true);
  });
});

describe("mock persistence", () => {
  it("persists messaging and completed profile setup", async () => {
    await mockApi.getCurrentProfile(DEMO_ADDRESS);
    await mockApi.createMessagingProfile(DEMO_ADDRESS, "public_key_test");
    await mockApi.updateCreatorProfile({ username: "mohammad_m", avatarUrl: null });
    const returned = await mockApi.getCurrentProfile(DEMO_ADDRESS);
    expect(returned).toMatchObject({
      username: "mohammad_m",
      messagingKeyConfigured: true,
      onboardingCompleted: true,
    });
  });

  it("adds new broadcasts newest-first and keeps them after another read", async () => {
    await mockApi.getCurrentProfile(DEMO_ADDRESS);
    const first = await mockApi.createBroadcast("First update");
    const second = await mockApi.createBroadcast("Second update");
    const persisted = await mockApi.listBroadcasts();
    expect(persisted.map((item) => item.id)).toEqual([second.id, first.id]);
  });

  it("rejects empty broadcast content", async () => {
    await mockApi.getCurrentProfile(DEMO_ADDRESS);
    await expect(mockApi.createBroadcast("   ")).rejects.toThrow("Write an update");
  });
});

describe("broadcast composer", () => {
  it("publishes via the explicit action and clears the composer", async () => {
    const publish = vi.fn().mockResolvedValue(undefined);
    render(<BroadcastComposer publish={publish} />);
    const textbox = screen.getByRole("textbox", { name: "Message" });
    fireEvent.change(textbox, { target: { value: "A useful creator update" } });
    fireEvent.click(screen.getByRole("button", { name: "Publish broadcast" }));
    await waitFor(() => expect(publish).toHaveBeenCalledWith("A useful creator update"));
    expect(textbox).toHaveValue("");
  });

  it("does not publish on plain Enter", () => {
    const publish = vi.fn();
    render(<BroadcastComposer publish={publish} />);
    const textbox = screen.getByRole("textbox", { name: "Message" });
    fireEvent.change(textbox, { target: { value: "Two\nlines" } });
    fireEvent.keyDown(textbox, { key: "Enter" });
    expect(publish).not.toHaveBeenCalled();
  });
});
