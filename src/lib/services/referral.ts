// =============================================================
// Referral Service
// Generates referral codes, tracks sign-ups, and handles rewards.
// =============================================================

import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/services/audit-log";
import { nanoid } from "@/lib/utils";

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------

export interface ReferralStats {
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalRewardsInCents: number;
  referralCode: string;
}

export interface ReferralItem {
  id: string;
  code: string;
  referredTenantId: string | null;
  isRewarded: boolean;
  rewardInCents: number;
  rewardedAt: Date | null;
  createdAt: Date;
  referredTenant: {
    name: string;
    createdAt: Date;
  } | null;
}

// Default reward: R50 credit
const DEFAULT_REWARD_CENTS = 5000;

// -------------------------------------------------------------
// GET or CREATE — Ensure tenant has a referral code
// -------------------------------------------------------------

export async function getOrCreateReferralCode(tenantId: string): Promise<string> {
  // Check if tenant already has a referral code
  const existing = await db.referral.findFirst({
    where: { referrerTenantId: tenantId, referredTenantId: null },
    select: { code: true },
  });

  if (existing) {
    return existing.code;
  }

  // Create a new referral entry with a unique code
  const code = `REF-${nanoid(8).toUpperCase()}`;
  await db.referral.create({
    data: {
      code,
      referrerTenantId: tenantId,
      rewardInCents: DEFAULT_REWARD_CENTS,
    },
  });

  return code;
}

// -------------------------------------------------------------
// APPLY — New tenant signs up with a referral code
// -------------------------------------------------------------

export async function applyReferralCode(
  code: string,
  referredTenantId: string,
): Promise<boolean> {
  const referral = await db.referral.findUnique({
    where: { code },
    select: { id: true, referrerTenantId: true, referredTenantId: true },
  });

  if (!referral) return false;
  if (referral.referredTenantId) return false; // Already used
  if (referral.referrerTenantId === referredTenantId) return false; // Self-referral

  await db.referral.update({
    where: { id: referral.id },
    data: { referredTenantId: referredTenantId },
  });

  void createAuditLog({
    userId: null,
    tenantId: referredTenantId,
    action: "CREATE",
    entityType: "Referral",
    entityId: referral.id,
    metadata: { code, referrerTenantId: referral.referrerTenantId },
  });

  return true;
}

// -------------------------------------------------------------
// REWARD — Mark referral as rewarded (after qualifying event)
// Typically called when the referred tenant upgrades to a paid plan.
// -------------------------------------------------------------

export async function rewardReferral(
  referredTenantId: string,
): Promise<boolean> {
  const referral = await db.referral.findFirst({
    where: { referredTenantId, isRewarded: false },
  });

  if (!referral) return false;

  await db.referral.update({
    where: { id: referral.id },
    data: {
      isRewarded: true,
      rewardedAt: new Date(),
    },
  });

  void createAuditLog({
    userId: null,
    tenantId: referral.referrerTenantId,
    action: "PAYMENT",
    entityType: "Referral",
    entityId: referral.id,
    metadata: {
      rewardInCents: referral.rewardInCents,
      referredTenantId,
    },
  });

  return true;
}

// -------------------------------------------------------------
// STATS — Referral statistics for a tenant
// -------------------------------------------------------------

export async function getReferralStats(tenantId: string): Promise<ReferralStats> {
  const code = await getOrCreateReferralCode(tenantId);

  const referrals = await db.referral.findMany({
    where: { referrerTenantId: tenantId },
    select: {
      referredTenantId: true,
      isRewarded: true,
      rewardInCents: true,
    },
  });

  const totalReferrals = referrals.filter(
    (r: { referredTenantId: string | null }) => r.referredTenantId,
  ).length;
  const successfulReferrals = referrals.filter(
    (r: { isRewarded: boolean }) => r.isRewarded,
  ).length;
  const pendingReferrals = totalReferrals - successfulReferrals;
  const totalRewardsInCents = referrals
    .filter((r: { isRewarded: boolean }) => r.isRewarded)
    .reduce((sum: number, r: { rewardInCents: number }) => sum + r.rewardInCents, 0);

  return {
    totalReferrals,
    successfulReferrals,
    pendingReferrals,
    totalRewardsInCents,
    referralCode: code,
  };
}

// -------------------------------------------------------------
// LIST — Referral history for a tenant
// -------------------------------------------------------------

export async function getReferralHistory(
  tenantId: string,
): Promise<ReferralItem[]> {
  const referrals = await db.referral.findMany({
    where: { referrerTenantId: tenantId, referredTenantId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      referredTenantId: true,
      isRewarded: true,
      rewardInCents: true,
      rewardedAt: true,
      createdAt: true,
      referredTenant: {
        select: { name: true, createdAt: true },
      },
    },
  });

  return referrals;
}
