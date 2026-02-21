// =============================================================
// Subscription Service
// Business logic for subscription lifecycle management.
// Creates, retrieves, and cancels subscriptions.
// Enforces plan limits and tenant isolation.
// =============================================================

import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/services/audit-log";
import { SUBSCRIPTION_PLANS } from "@/constants";
import type { PlanId } from "@/constants";

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------

interface SubscriptionContext {
  userId: string;
  tenantId: string;
}

// -------------------------------------------------------------
// GET — Current active subscription for a tenant
// -------------------------------------------------------------

/**
 * Get the current active or trialing subscription for a tenant.
 * Returns null if no active subscription exists.
 */
export async function getCurrentSubscription(tenantId: string) {
  return db.subscription.findFirst({
    where: {
      tenantId,
      status: { in: ["ACTIVE", "TRIAL"] },
    },
    include: {
      payments: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      items: {
        include: { agent: { select: { id: true, name: true, slug: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// -------------------------------------------------------------
// GET — Payment history for a tenant
// -------------------------------------------------------------

/**
 * Get paginated payment history for a tenant's subscriptions.
 */
export async function getPaymentHistory(
  tenantId: string,
  page: number = 1,
  limit: number = 10,
) {
  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where: {
        subscription: { tenantId },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        subscription: {
          select: { planId: true },
        },
      },
    }),
    db.payment.count({
      where: {
        subscription: { tenantId },
      },
    }),
  ]);

  return { payments, total, page, limit };
}

// -------------------------------------------------------------
// CREATE — Start a new subscription (called from checkout)
// Creates the subscription in TRIAL or ACTIVE state,
// plus a PENDING payment record.
// -------------------------------------------------------------

/**
 * Create a subscription and an initial pending payment record.
 * Returns the subscription and payment IDs for PayFast checkout.
 */
export async function createSubscription(
  planId: PlanId,
  ctx: SubscriptionContext,
) {
  const plan = SUBSCRIPTION_PLANS[planId];

  if (!plan) {
    throw new Error(`Invalid plan: ${planId}`);
  }

  // Check for existing active subscription
  const existing = await db.subscription.findFirst({
    where: {
      tenantId: ctx.tenantId,
      status: { in: ["ACTIVE", "TRIAL"] },
    },
  });

  if (existing) {
    throw new Error("Tenant already has an active subscription");
  }

  const now = new Date();
  const isTrial = plan.trialDays > 0;
  const trialEndsAt = isTrial
    ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
    : null;
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const result = await db.$transaction(async (tx: typeof db) => {
    // Create subscription
    const subscription = await tx.subscription.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        planId,
        priceInCents: plan.priceInCents,
        status: isTrial ? "TRIAL" : "ACTIVE",
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    // Create a pending payment record (will be confirmed by ITN)
    const payment = await tx.payment.create({
      data: {
        subscriptionId: subscription.id,
        amountInCents: plan.priceInCents,
        status: "PENDING",
        commissionInCents: Math.round(plan.priceInCents * 0.2),
      },
    });

    // Update tenant plan
    await tx.tenant.update({
      where: { id: ctx.tenantId },
      data: { plan: planId },
    });

    return { subscription, payment };
  });

  // Audit log (fire-and-forget)
  void createAuditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "SUBSCRIBE",
    entityType: "Subscription",
    entityId: result.subscription.id,
    metadata: { planId, priceInCents: plan.priceInCents },
  });

  return result;
}

// -------------------------------------------------------------
// CONFIRM — Mark subscription as active after payment
// Called by ITN webhook when payment is COMPLETE.
// -------------------------------------------------------------

/**
 * Confirm a payment and activate the subscription.
 * Sets isVerified=true, status=COMPLETED on payment.
 * Sets status=ACTIVE on subscription.
 */
export async function confirmPayment(
  paymentId: string,
  payfastPaymentId: string,
  payfastToken: string | null,
  itnPayload: Record<string, unknown>,
) {
  return db.$transaction(async (tx: typeof db) => {
    // Update payment record
    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: "COMPLETED",
        isVerified: true,
        payfastPaymentId,
        itnPayload,
        paidAt: new Date(),
      },
    });

    // Activate subscription
    const subscription = await tx.subscription.update({
      where: { id: payment.subscriptionId },
      data: {
        status: "ACTIVE",
        payfastToken: payfastToken || undefined,
      },
    });

    return { payment, subscription };
  });
}

// -------------------------------------------------------------
// RENEW — Record a recurring payment (subsequent ITN)
// -------------------------------------------------------------

/**
 * Record a recurring subscription payment from ITN.
 * Creates a new payment record and extends the billing period.
 */
export async function recordRecurringPayment(
  subscriptionId: string,
  payfastPaymentId: string,
  amountInCents: number,
  itnPayload: Record<string, unknown>,
) {
  return db.$transaction(async (tx: typeof db) => {
    // Create payment record
    const payment = await tx.payment.create({
      data: {
        subscriptionId,
        amountInCents,
        payfastPaymentId,
        status: "COMPLETED",
        isVerified: true,
        commissionInCents: Math.round(amountInCents * 0.2),
        itnPayload,
        paidAt: new Date(),
      },
    });

    // Extend billing period by 30 days from current period end
    const subscription = await tx.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (subscription) {
      const newPeriodStart = subscription.currentPeriodEnd;
      const newPeriodEnd = new Date(
        newPeriodStart.getTime() + 30 * 24 * 60 * 60 * 1000,
      );

      await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: "ACTIVE",
          currentPeriodStart: newPeriodStart,
          currentPeriodEnd: newPeriodEnd,
        },
      });
    }

    return { payment };
  });
}

// -------------------------------------------------------------
// CANCEL — Cancel a subscription
// -------------------------------------------------------------

/**
 * Cancel a subscription. Sets canceledAt and cancelReason.
 * The subscription remains accessible until currentPeriodEnd.
 */
export async function cancelSubscription(
  subscriptionId: string,
  reason: string | undefined,
  ctx: SubscriptionContext,
) {
  // Verify the subscription belongs to the tenant
  const subscription = await db.subscription.findFirst({
    where: {
      id: subscriptionId,
      tenantId: ctx.tenantId,
      status: { in: ["ACTIVE", "TRIAL"] },
    },
  });

  if (!subscription) {
    throw new Error("Subscription not found or already canceled");
  }

  const updated = await db.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
      cancelReason: reason ?? null,
    },
  });

  // Reset tenant plan to free
  await db.tenant.update({
    where: { id: ctx.tenantId },
    data: { plan: "free" },
  });

  // Audit log
  void createAuditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "UNSUBSCRIBE",
    entityType: "Subscription",
    entityId: subscriptionId,
    metadata: { reason, planId: subscription.planId },
  });

  return updated;
}

// -------------------------------------------------------------
// HANDLE FAILED — Mark subscription as past_due on payment failure
// -------------------------------------------------------------

/**
 * Mark a subscription as past_due when a payment fails.
 */
export async function markSubscriptionPastDue(subscriptionId: string) {
  return db.subscription.update({
    where: { id: subscriptionId },
    data: { status: "PAST_DUE" },
  });
}

// -------------------------------------------------------------
// PLAN LIMITS — Check agent limits for a tenant's current plan
// -------------------------------------------------------------

/**
 * Check if a tenant can add more agents based on their plan.
 */
export async function canAddAgent(tenantId: string): Promise<boolean> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });

  if (!tenant) return false;

  const planId = tenant.plan as PlanId;
  const plan = SUBSCRIPTION_PLANS[planId] ?? SUBSCRIPTION_PLANS.free;

  // Count current subscription items (agents the tenant is subscribed to)
  const agentCount = await db.subscriptionItem.count({
    where: {
      subscription: {
        tenantId,
        status: { in: ["ACTIVE", "TRIAL"] },
      },
    },
  });

  return agentCount < plan.maxAgents;
}

/**
 * Get the agent limit and current usage for a tenant.
 */
export async function getPlanUsage(tenantId: string) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });

  const planId = (tenant?.plan ?? "free") as PlanId;
  const plan = SUBSCRIPTION_PLANS[planId] ?? SUBSCRIPTION_PLANS.free;

  const agentCount = await db.subscriptionItem.count({
    where: {
      subscription: {
        tenantId,
        status: { in: ["ACTIVE", "TRIAL"] },
      },
    },
  });

  return {
    planId,
    planName: plan.name,
    maxAgents: plan.maxAgents,
    currentAgents: agentCount,
    priceInCents: plan.priceInCents,
  };
}
