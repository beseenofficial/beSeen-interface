import { MessageCircleMore } from "lucide-react";
import { ComingSoon } from "@/components/ui/coming-soon";

export default function MessengerPage() {
  return (
    <ComingSoon
      icon={MessageCircleMore}
      title="Messenger is coming soon"
      description="Private bounty messages and creator replies will live here."
    />
  );
}
