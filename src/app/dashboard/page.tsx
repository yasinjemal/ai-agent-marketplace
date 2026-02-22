// =============================================================
// /dashboard — Overview page showing quick stats & links
// =============================================================

import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Bot,
  CreditCard,
  Gift,
  Key,
  Settings,
  Zap,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Dashboard — AI Agent Marketplace",
  description: "Your AI Agent Marketplace dashboard overview.",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  // Gather quick stats in parallel
  const isDev =
    session.role === "DEVELOPER" || session.role === "ADMIN";

  const [
    agentCount,
    executionCount,
    tenant,
  ] = await Promise.all([
    isDev
      ? db.agent.count({ where: { tenantId: session.tenantId } })
      : Promise.resolve(0),
    db.agentExecution.count({ where: { tenantId: session.tenantId } }),
    db.tenant.findUnique({
      where: { id: session.tenantId },
      select: { name: true, slug: true, plan: true },
    }),
  ]);

  const quickLinks = [
    ...(isDev
      ? [
          {
            href: "/dashboard/agents",
            label: "My Agents",
            description: `${agentCount} agent${agentCount !== 1 ? "s" : ""} created`,
            icon: Bot,
            color: "text-blue-600",
            bgColor: "bg-blue-50 dark:bg-blue-950/50",
          },
          {
            href: "/dashboard/api-keys",
            label: "API Keys",
            description: "Manage integration keys",
            icon: Key,
            color: "text-amber-600",
            bgColor: "bg-amber-50 dark:bg-amber-950/50",
          },
        ]
      : []),
    {
      href: "/dashboard/executions",
      label: "Executions",
      description: `${executionCount} total execution${executionCount !== 1 ? "s" : ""}`,
      icon: Zap,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/50",
    },
    {
      href: "/dashboard/billing",
      label: "Billing",
      description: `${tenant?.plan ?? "FREE"} plan`,
      icon: CreditCard,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/50",
    },
    {
      href: "/dashboard/referrals",
      label: "Referrals",
      description: "Earn R50 per referral",
      icon: Gift,
      color: "text-pink-600",
      bgColor: "bg-pink-50 dark:bg-pink-950/50",
    },
    {
      href: "/dashboard/settings",
      label: "Settings",
      description: "Manage your profile",
      icon: Settings,
      color: "text-slate-600",
      bgColor: "bg-slate-50 dark:bg-slate-950/50",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back
          </h1>
          <Badge variant="secondary" className="text-xs">
            {session.role.replace("_", " ")}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          {tenant?.name ?? "Your workspace"} &middot; Here&apos;s an overview of
          your account.
        </p>
      </div>

      {/* Quick stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isDev && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Agents
              </CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{agentCount}</div>
              <p className="text-xs text-muted-foreground">
                Agents you&apos;ve built
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Executions
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{executionCount}</div>
            <p className="text-xs text-muted-foreground">
              Total agent runs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plan</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tenant?.plan ?? "FREE"}
            </div>
            <Link
              href="/dashboard/billing"
              className="text-xs text-primary hover:underline"
            >
              Manage subscription →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick links grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Quick Links</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map(
            ({ href, label, description, icon: Icon, color, bgColor }) => (
              <Link key={href} href={href} className="group">
                <Card className="transition-shadow group-hover:shadow-md">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bgColor}`}
                    >
                      <Icon className={`h-5 w-5 ${color}`} />
                    </div>
                    <div className="flex-1 truncate">
                      <p className="font-medium">{label}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {description}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </CardContent>
                </Card>
              </Link>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
