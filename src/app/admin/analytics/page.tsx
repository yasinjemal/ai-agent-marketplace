// =============================================================
// /admin/analytics — Admin analytics dashboard (Server Component)
// Platform KPIs, revenue trends, top agents, execution charts.
// =============================================================

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  getPlatformMetrics,
  getTopAgents,
  getRevenueTrends,
  getExecutionTrends,
} from "@/lib/services/analytics";
import { AnalyticsDashboard } from "./analytics-dashboard";

export const metadata = {
  title: "Platform Analytics — AI Agent Marketplace",
};

export default async function AdminAnalyticsPage() {
  let session;
  try {
    session = await requireRole("ADMIN");
  } catch {
    redirect("/sign-in");
  }

  const [metrics, topAgents, revenueTrends, executionTrends] =
    await Promise.all([
      getPlatformMetrics(),
      getTopAgents(10),
      getRevenueTrends(6),
      getExecutionTrends(30),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Platform Analytics
        </h1>
        <p className="text-muted-foreground">
          KPIs, revenue trends, and marketplace health
        </p>
      </div>

      <AnalyticsDashboard
        metrics={metrics}
        topAgents={topAgents}
        revenueTrends={revenueTrends}
        executionTrends={executionTrends}
      />
    </div>
  );
}
