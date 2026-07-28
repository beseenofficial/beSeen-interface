import { describe, expect, it } from "vitest";
import {
  createEncryptedIdentityBackup,
  restoreIdentityMasterSecret,
} from "@/lib/crypto/identity-backup";
import { toBase64 } from "@/lib/crypto/messaging-keys";

const walletAddress =
  "GC7TLXRNR2G45SICQDH4R7GUNDKWCEIRP2TJBAW63PAYCTJTIOWAHJYW";

describe("encrypted identity backup", () => {
  it("round-trips only the encrypted 32-byte master secret", async () => {
    const masterSecret = Uint8Array.from(
      { length: 32 },
      (_, index) => index + 1,
    );
    const password = "correct horse battery staple";

    const serialized = await createEncryptedIdentityBackup(
      walletAddress,
      masterSecret,
      password,
    );
    expect(serialized).not.toContain(toBase64(masterSecret));

    const restored = await restoreIdentityMasterSecret(
      serialized,
      walletAddress.toLowerCase(),
      password,
    );
    expect(restored).toEqual(masterSecret);
    restored.fill(0);
    masterSecret.fill(0);
  });

  it("refuses a backup belonging to another Stellar account", async () => {
    const serialized = await createEncryptedIdentityBackup(
      walletAddress,
      new Uint8Array(32),
      "correct horse battery staple",
    );

    await expect(
      restoreIdentityMasterSecret(
        serialized,
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        "correct horse battery staple",
      ),
    ).rejects.toThrow("different Stellar account");
  });
});
