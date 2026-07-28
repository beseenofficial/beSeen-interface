import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SecurityPage from "@/app/(onboarding)/onboarding/security/page";

const mocks = vi.hoisted(() => ({
  clearKeys: vi.fn(),
  createBackup: vi.fn(),
  generateKeys: vi.fn(),
  getAuthConfig: vi.fn(),
  logout: vi.fn(),
  replace: vi.fn(),
  storeKeys: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/lib/beseen-api", () => ({
  beseenApi: { getAuthConfig: mocks.getAuthConfig },
}));

vi.mock("@/lib/crypto/identity-backup", () => ({
  createEncryptedIdentityBackup: mocks.createBackup,
  restoreIdentityMasterSecret: vi.fn(),
}));

vi.mock("@/lib/crypto/messaging-keys", () => ({
  clearLocalBeSeenKeys: mocks.clearKeys,
  deriveBeSeenKeys: vi.fn(),
  generateBeSeenKeys: mocks.generateKeys,
  keysMatchServer: vi.fn(),
  storeLocalBeSeenKeys: mocks.storeKeys,
}));

vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({
    address: "GC7TLXRNR2G45SICQDH4R7GUNDKWCEIRP2TJBAW63PAYCTJTIOWAHJYW",
    logout: mocks.logout,
  }),
}));

vi.mock("@/providers/profile-provider", () => ({
  useProfile: () => ({ profile: null }),
}));

vi.mock("@/providers/toast-provider", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

describe("identity key creation", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:identity-backup"),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    mocks.getAuthConfig.mockResolvedValue({ protocol: {}, keyDerivation: {} });
    mocks.generateKeys.mockResolvedValue({
      derivationVersion: 1,
      masterSecret: new Uint8Array(32),
      signing: { publicKey: new Uint8Array(32), privateKey: new Uint8Array(64) },
      encryption: {
        publicKey: new Uint8Array(32),
        privateKey: new Uint8Array(32),
      },
    });
    mocks.createBackup.mockResolvedValue('{"encrypted":true}');
    mocks.storeKeys.mockResolvedValue(undefined);
  });

  it("generates client keys without asking Blux to sign a message", async () => {
    render(<SecurityPage />);

    fireEvent.change(screen.getByLabelText("Create a backup password"), {
      target: { value: "correct horse battery staple" },
    });
    fireEvent.change(screen.getByLabelText("Confirm backup password"), {
      target: { value: "correct horse battery staple" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create my identity" }),
    );

    await waitFor(() => expect(mocks.generateKeys).toHaveBeenCalledTimes(1));
    expect(mocks.storeKeys).toHaveBeenCalledTimes(1);
    expect(mocks.createBackup).toHaveBeenCalledTimes(1);
    expect(mocks.logout).not.toHaveBeenCalled();
    expect(mocks.replace).toHaveBeenCalledWith("/onboarding/profile");
  });
});
