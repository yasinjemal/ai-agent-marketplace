// =============================================================
// /agents — Public Marketplace Listing (Server Component)
// Approved & published agents with search, category filter, sort.
// =============================================================

import { Suspense } from "react";
import { Store } from "lucide-react";
import { AgentGrid } from "./agent-grid";
import { AgentFilters } from "./agent-filters";

export const metadata = {
  title: "AI Agent Marketplace — Browse Agents",
  description: "Discover AI agents built for South African SMEs.",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AgentsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Store className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">AI Agent Marketplace</h1>
        </div>
        <p className="text-muted-foreground">
          Discover ready-to-use AI agents built for South African SMEs.
        </p>
      </div>

      {/* Filters bar */}
      <Suspense fallback={<div className="h-10 animate-pulse rounded-lg bg-muted" />}>
        <AgentFilters />
      </Suspense>

      {/* Agent grid */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        }
      >
        <AgentGrid searchParams={params} />
      </Suspense>
    </div>
  );
}
