// =============================================================
// /dashboard/agents — Developer agent management page
// Lists developer's agents with create/edit/submit/delete actions.
// Uses mock auth (x-user-id header) in Phase 2.
// =============================================================

import { LayoutDashboard } from "lucide-react";
import { DeveloperAgentList } from "./developer-agent-list";

export const metadata = {
  title: "Developer Dashboard — My Agents",
  description: "Manage your AI agents — create, edit, submit for review.",
};

export default function DeveloperDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">My Agents</h1>
        </div>
        <p className="text-muted-foreground">
          Create, edit, and submit your AI agents for marketplace review.
        </p>
      </div>

      <DeveloperAgentList />
    </div>
  );
}
