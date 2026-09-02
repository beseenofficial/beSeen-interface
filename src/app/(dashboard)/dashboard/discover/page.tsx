import { DiscoverUsers } from "@/components/discover/discover-users";
import { DashboardPage } from "@/components/layout/dashboard-page";

export default function DiscoverPage() {
  return (
    <DashboardPage className="mx-auto min-h-svh max-w-[1480px] overflow-x-clip bg-white">
      <DiscoverUsers />
    </DashboardPage>
  );
}
