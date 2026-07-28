"use client";

import {
  BriefcaseBusiness,
  Check,
  KeyRound,
  Save,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { LoadingState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApiError } from "@/lib/api-client";
import { beseenApi } from "@/lib/beseen-api";
import { APP_URL } from "@/lib/constants";
import { useProfile } from "@/providers/profile-provider";
import { useToast } from "@/providers/toast-provider";
import type { AccountType, ProfileUpdate } from "@/types";

const fieldClass =
  "min-h-11.5 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-navy outline-none transition-[border,box-shadow] placeholder:text-[#969db0] focus:border-brand focus:shadow-[0_0_0_3px_rgb(16_69_245/10%)]";
const listText = (items: string[]) => items.join(", ");
const parseList = (value: string) =>
  [...new Map(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => [item.toLowerCase(), item]),
  ).values()];

export default function ProfilePage() {
  const { profile, updateProfile } = useProfile();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("regular");
  const [headline, setHeadline] = useState("");
  const [categories, setCategories] = useState("");
  const [skills, setSkills] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [available, setAvailable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username);
    setDisplayName(profile.displayName);
    setBio(profile.bio);
    setAvatarUrl(profile.avatarUrl ?? "");
    setAccountType(profile.accountType);
    setHeadline(profile.creatorProfile?.headline ?? "");
    setCategories(listText(profile.creatorProfile?.categories ?? []));
    setSkills(listText(profile.creatorProfile?.skills ?? []));
    setWebsiteUrl(profile.creatorProfile?.websiteUrl ?? "");
    setAvailable(profile.creatorProfile?.isAvailableForWork ?? false);
  }, [profile]);

  const profileUrl = useMemo(
    () => `${APP_URL}/${username || profile?.username || ""}`,
    [profile?.username, username],
  );

  if (!profile) return <LoadingState label="Loading your profile…" />;
  const currentProfile = profile;

  async function save() {
    setError(null);
    setSaving(true);
    try {
      let changes: ProfileUpdate;
      if (
        currentProfile.accountType === "creator" &&
        accountType === "regular"
      ) {
        changes = { accountType: "regular" };
      } else {
        changes = {
          ...(username.trim().toLowerCase() !== currentProfile.username
            ? { username: username.trim().toLowerCase() }
            : {}),
          ...(displayName.trim() !== currentProfile.displayName
            ? { displayName: displayName.trim() }
            : {}),
          ...(bio.trim() !== currentProfile.bio ? { bio: bio.trim() } : {}),
          ...((avatarUrl.trim() || null) !== currentProfile.avatarUrl
            ? { avatarUrl: avatarUrl.trim() || null }
            : {}),
          ...(accountType !== currentProfile.accountType
            ? { accountType }
            : {}),
          ...(accountType === "creator"
            ? {
                creatorProfile: {
                  headline: headline.trim(),
                  categories: parseList(categories),
                  skills: parseList(skills),
                  websiteUrl: websiteUrl.trim() || null,
                  isAvailableForWork: available,
                },
              }
            : {}),
        };
      }
      if (Object.keys(changes).length === 0) {
        toast("Nothing to update", "Your profile already matches these values.");
        return;
      }
      const { user } = await beseenApi.updateMe(changes);
      updateProfile(user);
      toast("Profile updated", "Your latest changes are now live.");
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.issues.length
          ? cause.issues.map((issue) => issue.message).join(" ")
          : cause instanceof Error
            ? cause.message
            : "Your profile could not be updated.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-300 px-12 pb-16 pt-12 max-[1180px]:px-8 max-[1180px]:pb-14 max-[1180px]:pt-10 max-sm:px-4 max-sm:pb-12 max-sm:pt-7.5">
      <PageHeader
        eyebrow="Your account"
        title="Profile"
        description="Keep your public profile fresh and choose how you appear on BeSeen."
      />

      <section className="mb-5 grid grid-cols-[96px_minmax(220px,1fr)_auto] items-center gap-6 rounded-2xl border border-border bg-white p-7 max-sm:grid-cols-[72px_1fr] max-sm:p-5 max-sm:[&>div:last-child]:col-[1/3]">
        <Avatar
          username={profile.username}
          src={profile.avatarUrl}
          size="xl"
        />
        <div>
          <span className="mb-1 text-xs font-bold uppercase tracking-[0.09em] text-brand">
            {profile.accountType} account
          </span>
          <h2 className="text-[28px]">{profile.displayName}</h2>
          <p className="text-sm text-muted">@{profile.username}</p>
        </div>
        <div className="flex flex-col items-start gap-2">
          <StatusBadge tone="success">
            <KeyRound size={13} /> Identity keys active
          </StatusBadge>
          {profile.creatorProfile?.isAvailableForWork && (
            <StatusBadge tone="lilac">
              <BriefcaseBusiness size={13} /> Available for work
            </StatusBadge>
          )}
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(300px,0.65fr)] gap-5 max-[900px]:grid-cols-1">
        <section className="rounded-2xl border border-border bg-white p-7 max-sm:p-5">
          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <label className="grid gap-2 text-[13px] font-semibold">
              Username
              <input
                className={fieldClass}
                value={username}
                maxLength={30}
                onChange={(event) =>
                  setUsername(event.target.value.toLowerCase())
                }
              />
            </label>
            <label className="grid gap-2 text-[13px] font-semibold">
              Display name
              <input
                className={fieldClass}
                value={displayName}
                maxLength={50}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
          </div>
          <label className="mt-4 grid gap-2 text-[13px] font-semibold">
            Bio
            <textarea
              className={`${fieldClass} min-h-24 resize-y py-3`}
              value={bio}
              maxLength={300}
              onChange={(event) => setBio(event.target.value)}
            />
          </label>
          <label className="mt-4 grid gap-2 text-[13px] font-semibold">
            Avatar URL
            <input
              className={fieldClass}
              type="url"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
            />
          </label>

          <fieldset className="mt-5">
            <legend className="text-[13px] font-semibold">Account type</legend>
            <div className="mt-2 flex gap-3">
              {(["regular", "creator"] as const).map((type) => (
                <label
                  className={`flex-1 cursor-pointer rounded-xl border p-3 text-center text-sm font-semibold capitalize ${
                    accountType === type
                      ? "border-brand bg-info-bg text-brand"
                      : "border-border"
                  }`}
                  key={type}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    checked={accountType === type}
                    onChange={() => setAccountType(type)}
                  />
                  {type}
                </label>
              ))}
            </div>
          </fieldset>

          {accountType === "creator" && (
            <div className="mt-5 grid gap-4 rounded-2xl border border-[#d9d1ff] bg-[#faf9ff] p-5">
              <label className="grid gap-2 text-[13px] font-semibold">
                Headline
                <input
                  className={fieldClass}
                  value={headline}
                  maxLength={100}
                  onChange={(event) => setHeadline(event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-[13px] font-semibold">
                Categories
                <input
                  className={fieldClass}
                  value={categories}
                  onChange={(event) => setCategories(event.target.value)}
                  placeholder="Photography, Art"
                />
              </label>
              <label className="grid gap-2 text-[13px] font-semibold">
                Skills
                <input
                  className={fieldClass}
                  value={skills}
                  onChange={(event) => setSkills(event.target.value)}
                  placeholder="Editing, Direction"
                />
              </label>
              <label className="grid gap-2 text-[13px] font-semibold">
                Website URL
                <input
                  className={fieldClass}
                  type="url"
                  value={websiteUrl}
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                />
              </label>
              <label className="flex items-center gap-3 text-[13px] font-semibold">
                <input
                  className="size-4 accent-brand"
                  type="checkbox"
                  checked={available}
                  onChange={(event) => setAvailable(event.target.checked)}
                />
                Available for work
              </label>
            </div>
          )}

          {profile.accountType === "creator" && accountType === "regular" && (
            <p className="mt-4 rounded-xl bg-warning-bg p-3 text-xs text-warning">
              Switching to a regular account removes your creator details and
              creator-only features.
            </p>
          )}
          {error && (
            <p className="mt-4 rounded-xl bg-error-bg p-3 text-xs text-error">
              {error}
            </p>
          )}
          <Button
            className="mt-6"
            loading={saving}
            icon={<Save size={18} />}
            onClick={() => void save()}
          >
            Save profile
          </Button>
        </section>

        <aside className="h-fit rounded-2xl border border-border bg-white p-7 max-sm:p-5">
          <span className="text-xs font-bold uppercase tracking-[0.09em] text-brand">
            Public preview
          </span>
          <div className="mt-5 flex items-center gap-4">
            <Avatar
              username={username || profile.username}
              src={avatarUrl || null}
              size="lg"
            />
            <div>
              <strong className="text-lg">
                {displayName || profile.displayName}
              </strong>
              <p className="text-xs text-muted">
                @{username || profile.username}
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-secondary">
            {bio || "Your bio will appear here."}
          </p>
          {accountType === "creator" && (
            <div className="mt-5 border-t border-border pt-5">
              <p className="font-semibold">{headline || "Creator headline"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {parseList(categories).map((item) => (
                  <span
                    className="rounded-full bg-subtle px-2.5 py-1 text-[11px] text-muted"
                    key={item}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="mt-6 flex items-center justify-between gap-2 rounded-xl bg-subtle p-3">
            <span className="min-w-0 truncate text-xs font-semibold">
              {profileUrl}
            </span>
            <CopyButton value={profileUrl} label="Copy profile link" />
          </div>
          <p className="mt-5 flex items-center gap-2 text-xs text-success">
            <Check size={15} /> Your profile is up to date
          </p>
        </aside>
      </div>
    </div>
  );
}
