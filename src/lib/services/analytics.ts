// =============================================================
// Analytics Service
// Platform-wide metrics for admin dashboard.
// MRR, active subscriptions, conversion, churn, top agents.
// =============================================================

import { db } from "@/lib/db";
import { PLATFORM_COMMISSION_RATE } from "@/constants";

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------

export interface PlatformMetrics {
  mrr: number;
  mrrGrowthPercent: number;
  activeSubscriptions: number;
  totalTenants: number;
  totalAgents: number;
  publishedAgents: number;
  totalExecutions: number;
  executionsThisMonth: number;
  totalRevenue: number;
  revenueThisMonth: number;
  conversionRate: number;
  churnRate: number;
}

export interface TopAgent {
  id: string;
  name: string;
  slug: string;
  category: string;
  totalExecutions: number;
  averageRating: number;
  developer: { firstName: string | null; lastName: string | null };
}

export interface RevenuePoint {
  month: string;
  revenue: number;
  subscriptions: number;
}

export interface ExecutionTrend {
  date: string;
  total: number;
  success: number;
  failed: number;
}

// -------------------------------------------------------------
// PLATFORM METRICS — Admin KPI dashboard
// -------------------------------------------------------------

export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    activeSubscriptions,
    totalTenants,
    totalAgents,
    publishedAgents,
    totalExecutions,
    executionsThisMonth,
    revenueAllTime,
    revenueThisMonth,
    revenueLastMonth,
    canceledThisMonth,
    activeLastMonth,
  ] = await Promise.all([
    // Active subscriptions (ACTIVE + TRIAL)
    db.subscription.count({
      where: { status: { in: ["ACTIVE", "TRIAL"] } },
    }),
    // Total tenants
    db.tenant.count({ where: { isActive: true } }),
    // Total agents
    db.agent.count(),
    // Published agents
    db.agent.count({ where: { status: "APPROVED", isPublished: true } }),
    // All-time executions
    db.agentExecution.count(),
    // Executions this month
    db.agentExecution.count({
      where: { createdAt: { gte: startOfMonth } },
    }),
    // Revenue all time (completed payments)
    db.payment.aggregate({
      where: { status: "COMPLETED", isVerified: true },
      _sum: { amountInCents: true },
    }),
    // Revenue this month
    db.payment.aggregate({
      where: {
        status: "COMPLETED",
        isVerified: true,
        paidAt: { gte: startOfMonth },
      },
      _sum: { amountInCents: true },
    }),
    // Revenue last month
    db.payment.aggregate({
      where: {
        status: "COMPLETED",
        isVerified: true,
        paidAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      _sum: { amountInCents: true },
    }),
    // Canceled this month
    db.subscription.count({
      where: {
        status: "CANCELED",
        canceledAt: { gte: startOfMonth },
      },
    }),
    // Active at start of month (proxy: created before this month and not expired)
    db.subscription.count({
      where: {
        createdAt: { lt: startOfMonth },
        status: { in: ["ACTIVE", "TRIAL", "CANCELED", "PAST_DUE"] },
      },
    }),
  ]);

  // MRR = sum of active subscription prices
  const mrrResult = await db.subscription.aggregate({
    where: { status: { in: ["ACTIVE", "TRIAL"] } },
    _sum: { priceInCents: true },
  });
  const mrr = mrrResult._sum.priceInCents ?? 0;

  // MRR growth = (this month revenue - last month revenue) / last month revenue * 100
  const lastMonthRev = revenueLastMonth._sum.amountInCents ?? 0;
  const thisMonthRev = revenueThisMonth._sum.amountInCents ?? 0;
  const mrrGrowthPercent =
    lastMonthRev > 0
      ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100)
      : 0;

  // Conversion rate = paying tenants / total tenants * 100
  const payingTenants = await db.subscription.groupBy({
    by: ["tenantId"],
    where: { status: "ACTIVE" },
  });
  const conversionRate =
    totalTenants > 0
      ? Math.round((payingTenants.length / totalTenants) * 100)
      : 0;

  // Churn rate = canceled this month / active at start of month * 100
  const churnRate =
    activeLastMonth > 0
      ? Math.round((canceledThisMonth / activeLastMonth) * 100)
      : 0;

  return {
    mrr,
    mrrGrowthPercent,
    activeSubscriptions,
    totalTenants,
    totalAgents,
    publishedAgents,
    totalExecutions,
    executionsThisMonth,
    totalRevenue: revenueAllTime._sum.amountInCents ?? 0,
    revenueThisMonth: thisMonthRev,
    conversionRate,
    churnRate,
  };
}

// -------------------------------------------------------------
// TOP AGENTS — Best performing agents
// -------------------------------------------------------------

export async function getTopAgents(limit: number = 10): Promise<TopAgent[]> {
  const agents = await db.agent.findMany({
    where: { status: "APPROVED", isPublished: true },
    orderBy: { totalExecutions: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      totalExecutions: true,
      averageRating: true,
      developer: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  return agents;
}

// -------------------------------------------------------------
// REVENUE TRENDS — Monthly revenue over time (last 6 months)
// -------------------------------------------------------------

export async function getRevenueTrends(
  months: number = 6,
): Promise<RevenuePoint[]> {
  const points: RevenuePoint[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    const [revenue, subscriptions] = await Promise.all([
      db.payment.aggregate({
        where: {
          status: "COMPLETED",
          isVerified: true,
          paidAt: { gte: start, lte: end },
        },
        _sum: { amountInCents: true },
      }),
      db.subscription.count({
        where: {
          status: { in: ["ACTIVE", "TRIAL"] },
          createdAt: { lte: end },
          OR: [
            { canceledAt: null },
            { canceledAt: { gt: end } },
          ],
        },
      }),
    ]);

    points.push({
      month: start.toLocaleDateString("en-ZA", {
        month: "short",
        year: "numeric",
      }),
      revenue: revenue._sum.amountInCents ?? 0,
      subscriptions,
    });
  }

  return points;
}

// -------------------------------------------------------------
// EXECUTION TRENDS — Daily executions over last 30 days
// -------------------------------------------------------------

export async function getExecutionTrends(
  days: number = 30,
): Promise<ExecutionTrend[]> {
  const trends: ExecutionTrend[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);

    const [total, success, failed] = await Promise.all([
      db.agentExecution.count({
        where: { createdAt: { gte: dayStart, lt: dayEnd } },
      }),
      db.agentExecution.count({
        where: { status: "SUCCESS", createdAt: { gte: dayStart, lt: dayEnd } },
      }),
      db.agentExecution.count({
        where: {
          status: { in: ["FAILED", "TIMEOUT"] },
          createdAt: { gte: dayStart, lt: dayEnd },
        },
      }),
    ]);

    trends.push({
      date: dayStart.toLocaleDateString("en-ZA", {
        month: "short",
        day: "numeric",
      }),
      total,
      success,
      failed,
    });
  }

  return trends;
}
