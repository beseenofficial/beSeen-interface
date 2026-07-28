import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
const logout = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ replace }),
}));
vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({ logout }),
}));
vi.mock("@/providers/profile-provider", () => ({
  useProfile: () => ({
    profile: {
      username: "mohammad_m",
      avatarUrl: null,
      walletAddress: "GCJ7XZIWQBPLFMK6FFWB6V5BWX46GD2KPYOJ6LZ7MRYG2LQFM4BSEEN",
    },
  }),
}));

import { AppShell } from "@/components/layout/app-shell";

describe("mobile navigation", () => {
  beforeEach(() => {
    replace.mockReset();
    logout.mockReset();
  });

  it("opens accessibly and closes with Escape", () => {
    render(<AppShell><p>Dashboard content</p></AppShell>);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getByRole("dialog", { name: "Navigation" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Navigation" })).not.toBeInTheDocument();
  });
});
