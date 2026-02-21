// =============================================================
// /admin/agents — Admin agent approval workflow
// Review pending agents, approve or reject with reason.
// =============================================================

import { Shield } from "lucide-react";
import { AdminAgentQueue } from "./admin-agent-queue";

export const metadata = {
  title: "Admin — Agent Approval Queue",
  description: "Review and approve AI agents for the marketplace.",
};

export default function AdminAgentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Approval Queue</h1>
        </div>
        <p className="text-muted-foreground">
          Review agents submitted by developers. Approve to publish or reject with feedback.
        </p>
      </div>

      <AdminAgentQueue />
    </div>
  );
}
