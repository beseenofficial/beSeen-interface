"use client";

import { ArrowLeft, ImagePlus, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OnboardingShell } from "@/components/layout/onboarding-shell";
import { Avatar } from "@/components/ui/avatar";
import { AuraRipple } from "@/components/ui/aura-ripple";
import { Button } from "@/components/ui/button";
import { APP_URL } from "@/lib/constants";
import { mockApi } from "@/lib/mock-api";
import { validateUsername } from "@/lib/onboarding";
import { useProfile } from "@/providers/profile-provider";
import { useToast } from "@/providers/toast-provider";

export default function ProfilePage() {
  const router = useRouter();
  const { updateProfile } = useProfile();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    if (!validateUsername(username)) {
      setAvailability("idle");
      return;
    }
    setAvailability("checking");
    const timer = window.setTimeout(async () => {
      try {
        const available =
          await mockApi.checkUsernameAvailability(username);
        if (active) setAvailability(available ? "available" : "taken");
      } catch {
        if (active) setAvailability("idle");
      }
    }, 350);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [username]);

  function selectAvatar(file?: File) {
    setAvatarError(null);
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setAvatarError("Choose a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Your image must be smaller than 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(String(reader.result));
    reader.onerror = () => setAvatarError("We couldn’t read that image.");
    reader.readAsDataURL(file);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!validateUsername(username)) {
      setError("Use 3–24 characters, begin with a letter, and include only lowercase letters, numbers, or underscores.");
      return;
    }
    setSubmitting(true);
    try {
      const updatedProfile = await mockApi.updateCreatorProfile({
        username,
        avatarUrl,
      });
      updateProfile(updatedProfile);
      toast("Your Aura is live", `beseen.fi/${username} is ready to share.`);
      router.replace("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn’t create your Aura. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <OnboardingShell step={2}>
      <section className="mx-auto grid min-h-155 w-full max-w-295 grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] overflow-hidden rounded-3xl border border-border bg-white shadow-elevated max-[900px]:grid-cols-1 max-sm:min-h-0">
        <form className="p-14 max-sm:p-6 max-sm:py-9" onSubmit={submit}>
          <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.09em] text-brand">Creator identity</span>
          <h1 className="text-[clamp(38px,5vw,56px)] font-semibold">Create your Aura</h1>
          <p className="mt-4 max-w-155 text-secondary">Choose the username people will use to find you, support you, and access your creator community.</p>
          <div className="mt-7 grid gap-2">
            <label className="text-[13px] font-semibold" htmlFor="username">Username</label>
            <div className="flex min-h-12 items-center rounded-xl border border-border bg-white px-3.5 transition-[border,box-shadow] focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgb(16_69_245/10%)]">
              <span className="font-semibold text-muted">@</span>
              <input
                className="min-w-0 flex-1 border-0 bg-transparent px-2.5 py-0 outline-none placeholder:text-[#969db0]"
                id="username"
                autoComplete="username"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value.toLowerCase());
                  setError(null);
                }}
                aria-describedby="username-help username-status"
                aria-invalid={Boolean(error)}
                placeholder="yourname"
                maxLength={24}
              />
            </div>
            <div className="flex justify-between gap-3 text-[10px] text-muted" id="username-help">
              <span>3–24 lowercase letters, numbers, or underscores</span>
              <span>{username.length}/24</span>
            </div>
            <p
              id="username-status"
              className={availability === "taken" ? "min-h-4 text-xs text-error" : "min-h-4 text-xs text-success"}
              aria-live="polite"
            >
              {availability === "checking" && "Checking availability…"}
              {availability === "available" && "Username is available"}
              {availability === "taken" && "Username is unavailable"}
            </p>
          </div>
          <div className="mt-7 grid gap-2">
            <label className="text-[13px] font-semibold" htmlFor="avatar">Avatar <span className="ml-1 font-normal text-muted">Optional</span></label>
            <div className="flex items-center gap-4 max-sm:items-start">
              <Avatar username={username || null} src={avatarUrl} size="lg" />
              <div className="flex flex-col items-start gap-2">
                <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-white px-3.5 text-[13px] font-semibold text-navy hover:border-[#a9c2ca] hover:bg-subtle" htmlFor="avatar">
                  <ImagePlus size={17} /> Choose image
                </label>
                <input
                  className="sr-only"
                  id="avatar"
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                  onChange={(event) => selectAvatar(event.target.files?.[0])}
                />
                {avatarUrl && (
                  <button type="button" className="flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[11px] text-error" onClick={() => setAvatarUrl(null)}>
                    <Trash2 size={15} /> Remove
                  </button>
                )}
                <small className="text-[10px] text-muted">PNG, JPG, or WebP. Max 2 MB.</small>
              </div>
            </div>
            {avatarError && <p className="text-xs text-error" role="alert">{avatarError}</p>}
          </div>
          {error && <p className="mt-5 rounded-xl bg-error-bg p-3 text-xs text-error" role="alert">{error}</p>}
          <div className="mt-8 flex items-center gap-3 max-sm:flex-col max-sm:items-stretch max-sm:[&_button]:w-full">
            <Button type="submit" loading={submitting} icon={<Sparkles size={18} />}>
              Create my Aura
            </Button>
            <Button type="button" variant="tertiary" icon={<ArrowLeft size={18} />} onClick={() => router.push("/onboarding/security")}>
              Back
            </Button>
          </div>
        </form>
        <aside className="relative flex min-h-125 flex-col items-center justify-center overflow-hidden bg-[#fff6f3] p-10 text-center max-[900px]:order-first max-[900px]:min-h-107.5 max-sm:min-h-90 max-sm:p-6" aria-label="Public profile preview">
          <AuraRipple className="absolute -right-25 -top-25 size-115" tone="peach" />
          <span className="relative z-1 mb-5 text-[10px] font-bold uppercase tracking-[0.09em] text-[#b65d48]">Your public identity</span>
          <Avatar username={username || null} src={avatarUrl} size="xl" />
          <h2 className="relative z-1 mt-4 text-[28px] font-semibold">@{username || "yourname"}</h2>
          <p className="relative z-1 mt-1 text-xs text-muted">Aura by @{username || "yourname"}</p>
          <div className="relative z-1 mt-6 max-w-full break-words rounded-xl border border-white/70 bg-white/80 px-4 py-3 text-sm font-semibold shadow-[0_8px_20px_rgb(11_11_63/6%)]">
            {APP_URL.replace(/^https?:\/\//, "")}/{username || "yourname"}
          </div>
          <span className="relative z-1 mt-4.5 max-w-65 text-[11px] leading-4.5 text-muted">Your Aura is about access and community, not speculation.</span>
        </aside>
      </section>
    </OnboardingShell>
  );
}
