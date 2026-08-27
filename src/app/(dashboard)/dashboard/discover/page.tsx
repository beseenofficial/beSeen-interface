import { DiscoverUsers } from "@/components/discover/discover-users";
import { DashboardPage } from "@/components/layout/dashboard-page";

export default function DiscoverPage() {
  return (
    <DashboardPage className="mx-auto max-w-[1480px]">
      <DiscoverUsers />
    </DashboardPage>
  );
}
