// =============================================================
// /agents — Loading skeleton for marketplace listing
// =============================================================

import { Store } from "lucide-react";

export default function AgentsLoading() {
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

      {/* Filter skeletons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="h-10 flex-1 animate-pulse rounded-md bg-muted" />
        <div className="h-10 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-10 w-40 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Agent grid skeletons */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-lg bg-muted"
          />
        ))}
      </div>
    </div>
  );
}
