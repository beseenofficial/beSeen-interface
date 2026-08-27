import type { Metadata } from "next";
import { DiscoverUsers } from "@/components/discover/discover-users";
import { DashboardPage } from "@/components/layout/dashboard-page";
import { PublicDiscoverHeader } from "@/components/layout/public-discover-header";

export const metadata: Metadata = {
  title: "Discover people",
  description: "Discover people on BeSeen and explore their public profiles.",
  alternates: { canonical: "/discover" },
  openGraph: {
    type: "website",
    url: "/discover",
    title: "Discover people on BeSeen",
    description: "Discover people on BeSeen and explore their public profiles.",
  },
  robots: { index: true, follow: true },
};

export default function PublicDiscoverPage() {
  return (
    <div className="min-h-svh bg-ice">
      <PublicDiscoverHeader />
      <main>
        <DashboardPage className="mx-auto max-w-[1480px]">
          <DiscoverUsers />
        </DashboardPage>
      </main>
    </div>
  );
}
