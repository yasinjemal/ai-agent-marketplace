// =============================================================
// /dashboard/team — Team management page (Phase 11)
// =============================================================

import { Users } from "lucide-react";
import { TeamManagement } from "./team-management";

export const metadata = {
  title: "Team — AI Agent Marketplace",
  description: "Manage your team members and invitations.",
};

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
        </div>
        <p className="text-muted-foreground">
          Manage team members and send invitations to collaborate.
        </p>
      </div>

      <TeamManagement />
    </div>
  );
}
