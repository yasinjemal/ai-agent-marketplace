// =============================================================
// AgentGrid — Server component that fetches & renders agents
// =============================================================

import { getAgents } from "@/lib/services/agent";
import { AgentCard, type AgentCardData } from "@/components/agents/agent-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft, ChevronRight, PackageOpen } from "lucide-react";

interface AgentGridProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export async function AgentGrid({ searchParams }: AgentGridProps) {
  const search = typeof searchParams.search === "string" ? searchParams.search : undefined;
  const category = typeof searchParams.category === "string" ? searchParams.category : undefined;
  const sortBy = typeof searchParams.sortBy === "string" ? searchParams.sortBy : "newest";
  const page = typeof searchParams.page === "string" ? parseInt(searchParams.page, 10) || 1 : 1;

  const { agents, pagination } = await getAgents(
    { search, category, page, limit: 12, sortBy: sortBy as "newest" | "rating" | "popular" | "price_asc" | "price_desc" },
    { publicOnly: true },
  );

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16">
        <PackageOpen className="h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium">No agents found</p>
        <p className="text-sm text-muted-foreground">
          {search
            ? `No results for "${search}". Try a different search term.`
            : "Check back soon — new agents are being added regularly."}
        </p>
      </div>
    );
  }

  // Build base URL for pagination links
  const buildUrl = (p: number) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (sortBy !== "newest") params.set("sortBy", sortBy);
    params.set("page", String(p));
    return `/agents?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {agents.length} of {pagination.total} agent{pagination.total !== 1 ? "s" : ""}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent: AgentCardData) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
            {page > 1 ? (
              <Link href={buildUrl(page - 1)}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Link>
            ) : (
              <span>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </span>
            )}
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pagination.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} asChild={page < pagination.totalPages}>
            {page < pagination.totalPages ? (
              <Link href={buildUrl(page + 1)}>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            ) : (
              <span>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </span>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
