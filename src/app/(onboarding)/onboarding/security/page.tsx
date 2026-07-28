"use client";

import {
  ArrowRight,
  Check,
  CloudOff,
  Download,
  FileKey2,
  KeyRound,
  WalletCards,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OnboardingShell } from "@/components/layout/onboarding-shell";
import { AuraRipple } from "@/components/ui/aura-ripple";
import { Button } from "@/components/ui/button";
import { beseenApi } from "@/lib/beseen-api";
import {
  createEncryptedIdentityBackup,
  restoreIdentityMasterSecret,
} from "@/lib/crypto/identity-backup";
import {
  clearLocalBeSeenKeys,
  deriveBeSeenKeys,
  generateBeSeenKeys,
  keysMatchServer,
  storeLocalBeSeenKeys,
} from "@/lib/crypto/messaging-keys";
import { signingErrorMessage } from "@/lib/onboarding";
import { useAuth } from "@/providers/auth-provider";
import { useProfile } from "@/providers/profile-provider";
import { useToast } from "@/providers/toast-provider";

type Phase =
  | "idle"
  | "config"
  | "generating"
  | "restoring"
  | "verifying"
  | "saving"
  | "backup"
  | "success";

export default function SecurityPage() {
  const auth = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [backupPassword, setBackupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [backupFile, setBackupFile] = useState<string | null>(null);

  function downloadBackup(serialized: string, walletAddress: string) {
    const blob = new Blob([serialized], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `beseen-identity-${walletAddress.slice(0, 8)}.json`;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function createOrRestoreKeys() {
    if (!auth.address) {
      setError("We couldn't read your connected Stellar account. Reconnect through Blux and try again.");
      return;
    }
    setError(null);
    if (backupPassword.length < 12) {
      setError("Use a backup password containing at least 12 characters.");
      return;
    }
    if (!profile && backupPassword !== confirmPassword) {
      setError("Backup passwords do not match.");
      return;
    }
    if (profile && !backupFile) {
      setError("Choose the encrypted recovery file you saved when creating your identity.");
      return;
    }

    let localKeys: Awaited<ReturnType<typeof deriveBeSeenKeys>> | null = null;
    let restoredMasterSecret: Uint8Array | null = null;
    try {
      setPhase("config");
      const config = await beseenApi.getAuthConfig();

      if (profile) {
        setPhase("restoring");
        restoredMasterSecret = await restoreIdentityMasterSecret(
          backupFile!,
          auth.address,
          backupPassword,
        );
        localKeys = await deriveBeSeenKeys(restoredMasterSecret, config);
        setPhase("verifying");
        const { keys: serverKeys } = await beseenApi.getPublicKeys(
          profile.username,
        );
        if (!keysMatchServer(localKeys, serverKeys)) {
          throw new Error(
            "This recovery file doesn't belong to this BeSeen identity.",
          );
        }
      } else {
        setPhase("generating");
        localKeys = await generateBeSeenKeys(config);
      }

      let encryptedBackup: string | null = null;
      if (!profile) {
        setPhase("backup");
        encryptedBackup = await createEncryptedIdentityBackup(
          auth.address,
          localKeys.masterSecret,
          backupPassword,
        );
      }
      setPhase("saving");
      await storeLocalBeSeenKeys(auth.address, localKeys);
      if (encryptedBackup) {
        downloadBackup(encryptedBackup, auth.address);
      }
      setPhase("success");
      toast(
        "Your identity is secured",
        profile
          ? "Your BeSeen identity is ready on this device."
          : "Your encrypted recovery file was downloaded. Keep it and its password safe.",
      );
      router.replace(profile ? "/dashboard" : "/onboarding/profile");
    } catch (cause) {
      setPhase("idle");
      setError(signingErrorMessage(cause));
    } finally {
      restoredMasterSecret?.fill(0);
      if (localKeys) clearLocalBeSeenKeys(localKeys);
    }
  }

  async function readBackupFile(file: File | undefined) {
    setError(null);
    if (!file) {
      setBackupFile(null);
      return;
    }
    if (file.size > 100_000) {
      setBackupFile(null);
      setError("This doesn't look like a valid BeSeen recovery file.");
      return;
    }
    try {
      setBackupFile(await file.text());
    } catch {
      setBackupFile(null);
      setError("We couldn't open this recovery file. Choose it again and retry.");
    }
  }

  const labels: Record<Phase, string> = {
    idle: profile ? "Restore my identity" : "Create my identity",
    config: "Preparing your secure identity…",
    generating: "Creating your identity…",
    restoring: "Opening your recovery file…",
    verifying: "Confirming your identity…",
    saving: "Securing your identity on this device…",
    backup: "Preparing your recovery file…",
    success: "Your identity is ready",
  };

  return (
    <OnboardingShell step={1}>
      <section className="mx-auto grid min-h-155 w-full max-w-295 grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] overflow-hidden rounded-3xl border border-border bg-white shadow-elevated max-[900px]:grid-cols-1 max-sm:min-h-0">
        <div className="p-14 max-sm:p-6 max-sm:py-9">
          <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.09em] text-brand">
            Private by design
          </span>
          <h1 className="max-w-155 text-[clamp(38px,5vw,56px)] font-semibold">
            {profile
              ? "Restore your identity on this device"
              : "Create your BeSeen identity"}
          </h1>
          <p className="mt-5 max-w-155 text-secondary">
            Your BeSeen identity is created securely on this device. Your
            wallet only confirms that it belongs to you—nothing is sent to the
            Stellar network.
          </p>
          {profile && (
            <div className="mt-5 rounded-xl border border-warning/20 bg-warning-bg p-3.5 text-xs leading-5 text-warning">
              Your BeSeen identity already exists. Use the encrypted recovery
              file from your first device to keep access to your previous
              messages.
            </div>
          )}
          <div className="mt-8 grid gap-4 [&>div]:flex [&>div]:items-start [&>div]:gap-3 [&_svg]:mt-0.5 [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-brand [&_span]:flex [&_span]:flex-col [&_span]:text-xs [&_span]:text-muted [&_strong]:text-sm [&_strong]:text-navy">
            <div>
              <FileKey2 />
              <span>
                <strong>Created securely on your device</strong>
                Your recovery secret is generated privately here
              </span>
            </div>
            <div>
              <WalletCards />
              <span>
                <strong>Move safely between devices</strong>
                Restore the same identity with your encrypted recovery file
              </span>
            </div>
            <div>
              <CloudOff />
              <span>
                <strong>Private means private</strong>
                Master secret and private keys never leave your devices
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 rounded-2xl border border-border bg-subtle p-4">
            {profile && (
              <label className="grid gap-2 text-[13px] font-semibold">
                Encrypted identity backup
                <input
                  className="block w-full rounded-xl border border-border bg-white p-3 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-info-bg file:px-3 file:py-2 file:font-semibold file:text-brand"
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) =>
                    void readBackupFile(event.target.files?.[0])
                  }
                />
              </label>
            )}
            <label className="grid gap-2 text-[13px] font-semibold">
              {profile ? "Backup password" : "Create a backup password"}
              <input
                className="min-h-12 rounded-xl border border-border bg-white px-3.5 text-sm outline-none focus:border-brand focus:shadow-[0_0_0_3px_rgb(16_69_245/10%)]"
                type="password"
                autoComplete={profile ? "current-password" : "new-password"}
                value={backupPassword}
                onChange={(event) => setBackupPassword(event.target.value)}
                placeholder="At least 12 characters"
              />
            </label>
            {!profile && (
              <label className="grid gap-2 text-[13px] font-semibold">
                Confirm backup password
                <input
                  className="min-h-12 rounded-xl border border-border bg-white px-3.5 text-sm outline-none focus:border-brand focus:shadow-[0_0_0_3px_rgb(16_69_245/10%)]"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>
            )}
            {!profile && (
              <p className="flex items-start gap-2 text-xs leading-5 text-secondary">
                <Download className="mt-0.5 size-4 shrink-0 text-brand" />
                We'll download an encrypted recovery file after your identity
                is created. Keep the file and password safe—BeSeen cannot
                recover them.
              </p>
            )}
          </div>

          {error && (
            <p
              className="mt-5 rounded-xl bg-error-bg p-3 text-xs text-error"
              role="alert"
            >
              {error}
            </p>
          )}
          <div className="mt-8 flex items-center gap-3 max-sm:flex-col max-sm:items-stretch max-sm:[&_button]:w-full">
            <Button
              onClick={() => void createOrRestoreKeys()}
              loading={phase !== "idle" && phase !== "success"}
              icon={
                phase === "success" ? (
                  <Check size={18} />
                ) : (
                  <KeyRound size={18} />
                )
              }
            >
              {labels[phase]}
            </Button>
            <Button variant="tertiary" onClick={() => void auth.logout()}>
              Sign out
            </Button>
          </div>
        </div>
        <div className="relative grid min-h-125 place-items-center overflow-hidden bg-[#f5f2ff] max-[900px]:order-first max-[900px]:min-h-95 max-sm:min-h-75">
          <AuraRipple
            className="absolute size-125 [&_i:nth-child(2)]:size-55 [&_i:nth-child(3)]:size-120 max-sm:size-92.5"
            tone="lilac"
          />
          <div className="relative z-1 flex w-65 flex-col items-center rounded-[20px] border border-white/70 bg-white/85 p-7 text-center shadow-elevated backdrop-blur">
            <span className="mb-4 grid size-12 place-items-center rounded-[14px] bg-[#f0edff] text-[#6555bd]">
              <KeyRound size={22} />
            </span>
            <strong className="text-base">Your BeSeen identity</strong>
            <p className="mt-2 text-xs text-secondary">
              Protected and encrypted on this device.
            </p>
            <small className="mt-5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
              Ed25519 <ArrowRight size={13} /> X25519
            </small>
          </div>
        </div>
      </section>
    </OnboardingShell>
  );
}
