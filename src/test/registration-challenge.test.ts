import { describe, expect, it, vi } from "vitest";
import { Networks } from "@stellar/stellar-sdk";
import {
  assertSep10Challenge,
  signSep10Challenge,
} from "@/lib/blux-signing";
import type { AuthClientConfig, ChallengeResult } from "@/types";

const serverPublicKey =
  "GB7E3ZX4BREV5NHQADDNS4L7FQWXOMII5PKXIRXOH25IKMOFRHHR2FW5";
const transactionXdr =
  "AAAAAgAAAAB+Teb8DEletPAAxtlxfywtdzEI69V0Ru4+uoUxxYnPHQAAAMgAAAAAAAAAAAAAAAEAAAAAamjjDAAAAABqaOQ4AAAAAAAAAAIAAAABAAAAAL813i2Ojc7JAoDPyPzUaNVhERF+ppCC3tvBgU0zQ6wDAAAACgAAAA9iZXNlZW4uYXBwIGF1dGgAAAAAAQAAAEA4Wm5TTENQdmM4M00yVXdWbkhnU2J1U2dsRXcyd0tqTHZOaUxWeXZaWEtCN3RXU2dvSHZvcGs5WU9tMXl2aFNoAAAAAQAAAAB+Teb8DEletPAAxtlxfywtdzEI69V0Ru4+uoUxxYnPHQAAAAoAAAAPd2ViX2F1dGhfZG9tYWluAAAAAAEAAAAKYmVzZWVuLmFwcAAAAAAAAAAAAAHFic8dAAAAQG4srbNmILq9oC5GjW9swQfc2wc5C9RBoEyfbp3SNeK0B/bpbl7BXF64Ug6s5DTZCNLLQTo/JxmbKQ57Wi+DbQg=";
const signedTransactionXdr =
  "AAAAAgAAAAB+Teb8DEletPAAxtlxfywtdzEI69V0Ru4+uoUxxYnPHQAAAMgAAAAAAAAAAAAAAAEAAAAAamjjDAAAAABqaOQ4AAAAAAAAAAIAAAABAAAAAL813i2Ojc7JAoDPyPzUaNVhERF+ppCC3tvBgU0zQ6wDAAAACgAAAA9iZXNlZW4uYXBwIGF1dGgAAAAAAQAAAEA4Wm5TTENQdmM4M00yVXdWbkhnU2J1U2dsRXcyd0tqTHZOaUxWeXZaWEtCN3RXU2dvSHZvcGs5WU9tMXl2aFNoAAAAAQAAAAB+Teb8DEletPAAxtlxfywtdzEI69V0Ru4+uoUxxYnPHQAAAAoAAAAPd2ViX2F1dGhfZG9tYWluAAAAAAEAAAAKYmVzZWVuLmFwcAAAAAAAAAAAAALFic8dAAAAQG4srbNmILq9oC5GjW9swQfc2wc5C9RBoEyfbp3SNeK0B/bpbl7BXF64Ug6s5DTZCNLLQTo/JxmbKQ57Wi+DbQgzQ6wDAAAAQMb/O5Oz+ZCOevgB5ZVG1dCVuQhMqZkt+lnUwU2v9efvRGsP1J8mFu08hLZDNimVDKSvnWoOvbwlpKP26lhgOw0=";

const config: AuthClientConfig = {
  protocol: {
    authenticationStandard: "SEP-10",
    challengeFormat: "stellar-transaction-xdr",
    walletMethod: "signTransaction",
    stellarNetwork: "testnet",
    networkPassphrase: Networks.TESTNET,
    authDomain: "beseen.app",
    serverSigningPublicKey: serverPublicKey,
    transactionSubmissionRequired: false,
    challengeTtlSeconds: 300,
    accessTokenTtlSeconds: 900,
  },
  keyDerivation: {
    version: 1,
    source: "CLIENT_GENERATED",
    kdf: {
      name: "HKDF-SHA-256",
      input: "CLIENT-RANDOM-32-BYTE-MASTER-SECRET",
      inputEncoding: "raw-bytes",
      salt: "beseen.app/key-derivation/v1",
      seedLengthBytes: 32,
      signingInfo: "beseen.app/ed25519-signing-key/v1",
      encryptionInfo: "beseen.app/x25519-encryption-key/v1",
    },
    signingAlgorithm: "Ed25519",
    encryptionAlgorithm: "X25519",
  },
};

const challenge: ChallengeResult = {
  challengeId: "507f1f77bcf86cd799439011",
  authenticationStandard: "SEP-10",
  transactionXdr,
  stellarNetwork: "testnet",
  networkPassphrase: Networks.TESTNET,
  serverSigningPublicKey: serverPublicKey,
  homeDomain: "beseen.app",
  expiresAt: new Date(Date.now() + 300_000).toISOString(),
};

describe("SEP-10 challenge signing", () => {
  it("passes the exact server XDR to signTransaction and never submits it", async () => {
    const signTransaction = vi.fn(async () => signedTransactionXdr);

    const result = await signSep10Challenge({
      walletAddress: "GC7TLXRNR2G45SICQDH4R7GUNDKWCEIRP2TJBAW63PAYCTJTIOWAHJYW",
      challenge,
      config,
      signTransaction,
    });

    expect(signTransaction).toHaveBeenCalledTimes(1);
    expect(signTransaction).toHaveBeenCalledWith(
      transactionXdr,
      Networks.TESTNET,
    );
    expect(result).toBe(signedTransactionXdr);
  });

  it("rejects config mismatches and expired challenges", () => {
    expect(() =>
      assertSep10Challenge(
        { ...challenge, networkPassphrase: Networks.PUBLIC },
        config,
        "GC7TLXRNR2G45SICQDH4R7GUNDKWCEIRP2TJBAW63PAYCTJTIOWAHJYW",
      ),
    ).toThrow("does not match");
    expect(() =>
      assertSep10Challenge(
        { ...challenge, expiresAt: new Date(Date.now() - 1).toISOString() },
        config,
        "GC7TLXRNR2G45SICQDH4R7GUNDKWCEIRP2TJBAW63PAYCTJTIOWAHJYW",
      ),
    ).toThrow("expired");
  });

  it("rejects a challenge created for another Blux address", () => {
    expect(() =>
      assertSep10Challenge(challenge, config, serverPublicKey),
    ).toThrow("different Stellar account");
  });
});
