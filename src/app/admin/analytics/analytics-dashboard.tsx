// =============================================================
// Analytics Dashboard — Client component for charts & stats
// =============================================================

"use client";

import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bot,
  CreditCard,
  DollarSign,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type {
  PlatformMetrics,
  TopAgent,
  RevenuePoint,
  ExecutionTrend,
} from "@/lib/services/analytics";

// -------------------------------------------------------------
// Props
// -------------------------------------------------------------

interface AnalyticsDashboardProps {
  metrics: PlatformMetrics;
  topAgents: TopAgent[];
  revenueTrends: RevenuePoint[];
  executionTrends: ExecutionTrend[];
}

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------

function formatZAR(cents: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function GrowthBadge({ value }: { value: number }) {
  if (value > 0) {
    return (
      <Badge variant="secondary" className="gap-0.5 text-green-600">
        <ArrowUp className="h-3 w-3" />
        {value}%
      </Badge>
    );
  }
  if (value < 0) {
    return (
      <Badge variant="secondary" className="gap-0.5 text-red-600">
        <ArrowDown className="h-3 w-3" />
        {Math.abs(value)}%
      </Badge>
    );
  }
  return <Badge variant="secondary">0%</Badge>;
}

// Lightweight bar chart using divs
function MiniBarChart({
  data,
  valueKey,
  label,
}: {
  data: { label: string; value: number }[];
  valueKey: string;
  label: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="flex items-end gap-1" style={{ height: 120 }}>
        {data.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-primary/80 transition-all"
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 4 : 0 }}
              title={`${d.label}: ${d.value}`}
            />
            <span className="text-[10px] text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Main Component
// -------------------------------------------------------------

export function AnalyticsDashboard({
  metrics,
  topAgents,
  revenueTrends,
  executionTrends,
}: AnalyticsDashboardProps) {
  // KPI cards
  const kpis = [
    {
      title: "Monthly Recurring Revenue",
      value: formatZAR(metrics.mrr),
      icon: DollarSign,
      extra: <GrowthBadge value={metrics.mrrGrowthPercent} />,
    },
    {
      title: "Active Subscriptions",
      value: metrics.activeSubscriptions.toLocaleString(),
      icon: CreditCard,
      extra: <span className="text-xs text-muted-foreground">{metrics.totalTenants} tenants</span>,
    },
    {
      title: "Executions This Month",
      value: metrics.executionsThisMonth.toLocaleString(),
      icon: Zap,
      extra: (
        <span className="text-xs text-muted-foreground">
          {metrics.totalExecutions.toLocaleString()} all-time
        </span>
      ),
    },
    {
      title: "Published Agents",
      value: metrics.publishedAgents.toLocaleString(),
      icon: Bot,
      extra: (
        <span className="text-xs text-muted-foreground">
          {metrics.totalAgents} total
        </span>
      ),
    },
    {
      title: "Conversion Rate",
      value: `${metrics.conversionRate}%`,
      icon: TrendingUp,
      extra: <span className="text-xs text-muted-foreground">free → paid</span>,
    },
    {
      title: "Churn Rate",
      value: `${metrics.churnRate}%`,
      icon: Activity,
      extra: (
        <span className={`text-xs ${metrics.churnRate > 5 ? "text-red-500" : "text-green-500"}`}>
          {metrics.churnRate > 5 ? "Above target" : "Healthy"}
        </span>
      ),
    },
  ];

  // Revenue trend data for bar chart
  const revenueChartData = revenueTrends.map((p) => ({
    label: p.month,
    value: p.revenue,
  }));

  // Execution trend data (last 7 days only for compact view)
  const recentExecTrends = executionTrends.slice(-14);
  const execChartData = recentExecTrends.map((t) => ({
    label: t.date,
    value: t.total,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <div className="mt-1">{kpi.extra}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Revenue (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MiniBarChart
              data={revenueChartData}
              valueKey="revenue"
              label={`Total: ${formatZAR(metrics.totalRevenue)}`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4" />
              Executions (Last 14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MiniBarChart
              data={execChartData}
              valueKey="total"
              label={`This month: ${metrics.executionsThisMonth.toLocaleString()}`}
            />
          </CardContent>
        </Card>
      </div>

      {/* Revenue per month table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4" />
            Revenue Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Active Subs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenueTrends.map((p) => (
                <TableRow key={p.month}>
                  <TableCell className="font-medium">{p.month}</TableCell>
                  <TableCell className="text-right">{formatZAR(p.revenue)}</TableCell>
                  <TableCell className="text-right">{p.subscriptions}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Agents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" />
            Top Agents by Executions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topAgents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No published agents yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Developer</TableHead>
                  <TableHead className="text-right">Executions</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topAgents.map((agent, idx) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{agent.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {[agent.developer.firstName, agent.developer.lastName]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {agent.totalExecutions.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="flex items-center justify-end gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {agent.averageRating.toFixed(1)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
