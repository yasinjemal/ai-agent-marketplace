// =============================================================
// AgentFilters — Client-side search, category & sort controls
// Uses URL search params for server-side filtering via Next.js.
// =============================================================

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AGENT_CATEGORIES } from "@/constants";

export function AgentFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 on filter change
      params.delete("page");
      startTransition(() => {
        router.push(`/agents?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search agents..."
          defaultValue={searchParams.get("search") ?? ""}
          className="pl-9"
          onChange={(e) => {
            // Debounce: update after user stops typing 400ms
            const value = e.target.value;
            const timeout = setTimeout(() => updateParams("search", value), 400);
            return () => clearTimeout(timeout);
          }}
        />
      </div>

      {/* Category filter */}
      <Select
        defaultValue={searchParams.get("category") ?? "all"}
        onValueChange={(value) => updateParams("category", value)}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {AGENT_CATEGORIES.map((cat) => (
            <SelectItem key={cat.value} value={cat.value}>
              {cat.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select
        defaultValue={searchParams.get("sortBy") ?? "newest"}
        onValueChange={(value) => updateParams("sortBy", value)}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="rating">Top Rated</SelectItem>
          <SelectItem value="popular">Most Popular</SelectItem>
          <SelectItem value="price_asc">Price: Low → High</SelectItem>
          <SelectItem value="price_desc">Price: High → Low</SelectItem>
        </SelectContent>
      </Select>

      {/* Loading indicator */}
      {isPending && (
        <span className="text-xs text-muted-foreground animate-pulse">
          Loading…
        </span>
      )}
    </div>
  );
}
