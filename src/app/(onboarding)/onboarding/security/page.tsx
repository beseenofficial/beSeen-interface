"use client";

import {
  ArrowRight,
  Check,
  CloudOff,
  KeyRound,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OnboardingShell } from "@/components/layout/onboarding-shell";
import { AuraRipple } from "@/components/ui/aura-ripple";
import { Button } from "@/components/ui/button";
import { BESEEN_MESSAGING_KEY_MESSAGE } from "@/lib/constants";
import { mockApi } from "@/lib/mock-api";
import { signingErrorMessage } from "@/lib/onboarding";
import { useAuth } from "@/providers/auth-provider";
import { useProfile } from "@/providers/profile-provider";
import { useToast } from "@/providers/toast-provider";

type Phase =
  | "idle"
  | "waiting"
  | "deriving"
  | "saving"
  | "success";

export default function SecurityPage() {
  const auth = useAuth();
  const { profile, updateProfile } = useProfile();
  const { toast } = useToast();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  async function createKey() {
    if (!profile || !auth.address) return;
    setError(null);
    try {
      setPhase("waiting");
      const signature = await auth.signMessage(BESEEN_MESSAGING_KEY_MESSAGE);
      setPhase("deriving");
      const { deriveAndStoreMessagingKeyPair } = await import(
        "@/lib/crypto/messaging-keys"
      );
      const { publicKey } = await deriveAndStoreMessagingKeyPair(
        signature,
        profile.id,
      );
      setPhase("saving");
      const updatedProfile = await mockApi.createMessagingProfile(
        auth.address,
        publicKey,
      );
      updateProfile(updatedProfile);
      setPhase("success");
      toast("Messaging key secured", "Your private key stays on this device.");
      router.replace("/onboarding/profile");
    } catch (cause) {
      setPhase("idle");
      setError(signingErrorMessage(cause));
    }
  }

  const labels: Record<Phase, string> = {
    idle: profile?.messagingKeyConfigured ? "Restore messaging key" : "Create messaging key",
    waiting: "Waiting for wallet…",
    deriving: "Deriving private key…",
    saving: "Saving public key…",
    success: "Messaging key ready",
  };

  return (
    <OnboardingShell step={1}>
      <section className="mx-auto grid min-h-155 w-full max-w-295 grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] overflow-hidden rounded-3xl border border-border bg-white shadow-elevated max-[900px]:grid-cols-1 max-sm:min-h-0">
        <div className="p-14 max-sm:p-6 max-sm:py-9">
          <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.09em] text-brand">Private by design</span>
          <h1 className="max-w-155 text-[clamp(38px,5vw,56px)] font-semibold">
            {profile?.messagingKeyConfigured
              ? "Restore messaging on this device"
              : "Secure your private messages"}
          </h1>
          <p className="mt-5 max-w-155 text-secondary">
            BeSeen creates a separate encryption key for your messages. Your
            wallet signature is used only to derive this key. No transaction is
            submitted and no funds are moved.
          </p>
          {profile?.messagingKeyConfigured && (
            <div className="mt-5 rounded-xl border border-warning/20 bg-warning-bg p-3.5 text-xs leading-5 text-warning">
              Your public key is already registered, but the encrypted private
              key is missing on this device. Sign the same message to restore it.
            </div>
          )}
          <div className="mt-8 grid gap-4 [&>div]:flex [&>div]:items-start [&>div]:gap-3 [&_svg]:mt-0.5 [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-brand [&_span]:flex [&_span]:flex-col [&_span]:text-xs [&_span]:text-muted [&_strong]:text-sm [&_strong]:text-navy">
            <div><ReceiptText /><span><strong>No blockchain transaction</strong>No transfer or contract call</span></div>
            <div><WalletCards /><span><strong>No network fee</strong>Message signing is free</span></div>
            <div><CloudOff /><span><strong>Private means private</strong>Your private key is never sent to BeSeen</span></div>
          </div>
          {error && <p className="mt-5 rounded-xl bg-error-bg p-3 text-xs text-error" role="alert">{error}</p>}
          <div className="mt-8 flex items-center gap-3 max-sm:flex-col max-sm:items-stretch max-sm:[&_button]:w-full">
            <Button
              onClick={createKey}
              loading={phase !== "idle" && phase !== "success"}
              icon={phase === "success" ? <Check size={18} /> : <KeyRound size={18} />}
            >
              {labels[phase]}
            </Button>
            <Button variant="tertiary" onClick={auth.logout}>
              Sign out
            </Button>
          </div>
        </div>
        <div className="relative grid min-h-125 place-items-center overflow-hidden bg-[#f5f2ff] max-[900px]:order-first max-[900px]:min-h-95 max-sm:min-h-75">
          <AuraRipple className="absolute size-125 [&_i:nth-child(2)]:size-55 [&_i:nth-child(3)]:size-120 max-sm:size-92.5" tone="lilac" />
          <div className="relative z-1 flex w-65 flex-col items-center rounded-[20px] border border-white/70 bg-white/85 p-7 text-center shadow-elevated backdrop-blur">
            <span className="mb-4 grid size-12 place-items-center rounded-[14px] bg-[#f0edff] text-[#6555bd]"><KeyRound size={22} /></span>
            <strong className="text-base">Your messaging identity</strong>
            <p className="mt-2 text-xs text-secondary">Derived locally. Encrypted on this device.</p>
            <small className="mt-5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">Version 1 <ArrowRight size={13} /> X25519</small>
          </div>
        </div>
      </section>
    </OnboardingShell>
  );
}
