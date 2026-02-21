// =============================================================
// /dashboard/executions — Execution History (Server Component)
// Shows paginated execution logs with filtering and stats.
// =============================================================

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getExecutions, getExecutionStats } from "@/lib/services/execution";
import { ExecutionHistoryClient } from "./execution-history";

export const metadata = {
  title: "Execution History — AI Agent Marketplace",
  description: "View your agent execution history, usage stats, and logs.",
};

interface PageProps {
  searchParams: Promise<{
    agentId?: string;
    status?: string;
    page?: string;
    sortBy?: string;
  }>;
}

export default async function ExecutionsPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const params = await searchParams;

  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const status = params.status as
    | "PENDING"
    | "RUNNING"
    | "SUCCESS"
    | "FAILED"
    | "TIMEOUT"
    | undefined;

  const [executionsData, stats] = await Promise.all([
    getExecutions(session.tenantId, {
      agentId: params.agentId,
      status,
      page,
      limit: 20,
      sortBy: params.sortBy ?? "newest",
    }),
    getExecutionStats(session.tenantId),
  ]);

  return (
    <ExecutionHistoryClient
      executions={executionsData.executions}
      pagination={executionsData.pagination}
      stats={stats}
      currentFilters={{
        agentId: params.agentId,
        status: params.status,
        sortBy: params.sortBy ?? "newest",
      }}
    />
  );
}
