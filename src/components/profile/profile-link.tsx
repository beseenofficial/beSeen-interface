import { CopyButton } from '@/components/ui/copy-button';

interface ProfileLinkProps {
  profileUrl: string;
}

export function ProfileLink({ profileUrl }: ProfileLinkProps) {
  return (
    <section className="rounded-2xl border border-border bg-white p-6 max-sm:p-5">
      <h2 className="text-xl font-semibold">Profile link</h2>
      <p className="mt-1.5 text-sm text-secondary">
        This is your public BeSeen profile URL.
      </p>
      <div className="mt-5 flex items-center justify-between gap-2 rounded-xl border border-border pl-4 max-sm:flex-col max-sm:items-stretch max-sm:p-3">
        <span className="min-w-0 truncate text-sm text-secondary max-sm:break-all max-sm:whitespace-normal">
          {profileUrl}
        </span>
        <CopyButton value={profileUrl} />
      </div>
    </section>
  );
}
