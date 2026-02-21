// =============================================================
// Execution History — Client component for interactive UI
// =============================================================

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Timer,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatZAR } from "@/lib/utils";

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------

interface Execution {
  id: string;
  agentId: string;
  status: string;
  executionTimeMs: number | null;
  costInCents: number;
  errorMessage: string | null;
  httpStatusCode: number | null;
  createdAt: string | Date;
  completedAt: string | Date | null;
  agent: {
    name: string;
    slug: string;
    category: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ExecutionStats {
  totalAllTime: number;
  totalThisMonth: number;
  costThisMonthInCents: number;
  statusBreakdown: Record<string, number>;
}

interface ExecutionHistoryClientProps {
  executions: Execution[];
  pagination: Pagination;
  stats: ExecutionStats;
  currentFilters: {
    agentId?: string;
    status?: string;
    sortBy: string;
  };
}

// -------------------------------------------------------------
// Status badge helper
// -------------------------------------------------------------

function statusBadge(status: string) {
  switch (status) {
    case "SUCCESS":
      return (
        <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="h-3 w-3" />
          Success
        </Badge>
      );
    case "FAILED":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    case "TIMEOUT":
      return (
        <Badge variant="destructive" className="gap-1 bg-orange-600 hover:bg-orange-700">
          <Timer className="h-3 w-3" />
          Timeout
        </Badge>
      );
    case "RUNNING":
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Running
        </Badge>
      );
    case "PENDING":
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// -------------------------------------------------------------
// Component
// -------------------------------------------------------------

export function ExecutionHistoryClient({
  executions,
  pagination,
  stats,
  currentFilters,
}: ExecutionHistoryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`/dashboard/executions?${params.toString()}`);
  }

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`/dashboard/executions?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Execution History</h1>
        <p className="text-muted-foreground">
          Monitor your AI agent executions, usage, and costs.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Executions
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalAllTime.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalThisMonth.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.statusBreakdown.SUCCESS ?? 0} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost (Month)</CardTitle>
            <span className="text-sm text-muted-foreground">ZAR</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatZAR(stats.costThisMonthInCents)}
            </div>
            <p className="text-xs text-muted-foreground">Per-execution charges</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalThisMonth > 0
                ? `${Math.round(
                    ((stats.statusBreakdown.SUCCESS ?? 0) /
                      stats.totalThisMonth) *
                      100,
                  )}%`
                : "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.statusBreakdown.FAILED ?? 0} failed,{" "}
              {stats.statusBreakdown.TIMEOUT ?? 0} timed out
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={currentFilters.status ?? "all"}
          onValueChange={(v) => updateFilter("status", v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="SUCCESS">Success</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="TIMEOUT">Timeout</SelectItem>
            <SelectItem value="RUNNING">Running</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={currentFilters.sortBy}
          onValueChange={(v) => updateFilter("sortBy", v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="duration">Longest Duration</SelectItem>
            <SelectItem value="cost">Highest Cost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Execution table */}
      {executions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No executions yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Execute an agent from the marketplace to see results here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions.map((exec) => (
                  <TableRow key={exec.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{exec.agent.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {exec.agent.category}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{statusBadge(exec.status)}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatDuration(exec.executionTimeMs)}
                    </TableCell>
                    <TableCell>
                      {exec.costInCents > 0
                        ? formatZAR(exec.costInCents)
                        : "Free"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(exec.createdAt).toLocaleString("en-ZA", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-destructive">
                      {exec.errorMessage ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => goToPage(pagination.page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => goToPage(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
