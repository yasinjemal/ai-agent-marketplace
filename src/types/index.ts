// =============================================================
// Shared TypeScript Types
// These extend Prisma-generated types with application-specific shapes.
// =============================================================

import type { Role, SubscriptionStatus, AgentStatus, PricingModel, ExecutionStatus } from "@prisma/client";

// =============================================================
// API Response Types
// =============================================================

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// =============================================================
// Auth & Session Types
// =============================================================

export type SessionUser = {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  tenantId: string;
};

// =============================================================
// Agent Types
// =============================================================

export type AgentListItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconUrl: string | null;
  category: string;
  tags: string[];
  pricingModel: PricingModel;
  priceInCents: number;
  averageRating: number;
  totalExecutions: number;
  status: AgentStatus;
  developer: {
    firstName: string | null;
    lastName: string | null;
  };
};

// =============================================================
// Subscription Types
// =============================================================

export type SubscriptionPlan = {
  id: string;
  name: string;
  description: string;
  priceInCents: number;
  maxAgents: number;
  features: string[];
};

export type SubscriptionSummary = {
  id: string;
  status: SubscriptionStatus;
  planId: string;
  priceInCents: number;
  currentPeriodEnd: Date;
  trialEndsAt: Date | null;
};

// =============================================================
// Dashboard Analytics Types
// =============================================================

export type DashboardStats = {
  mrr: number;
  activeSubscriptions: number;
  totalAgents: number;
  totalExecutions: number;
  conversionRate: number;
  churnRate: number;
};

// =============================================================
// Review Types
// =============================================================

export type ReviewListItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  user: {
    firstName: string | null;
    lastName: string | null;
  };
};

export type ReviewSummary = {
  totalReviews: number;
  averageRating: number;
  distribution: Record<number, number>;
};

// =============================================================
// Referral Types
// =============================================================

export type ReferralListItem = {
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
};

export type ReferralDashboardData = {
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalRewardsInCents: number;
  referralCode: string;
};

// =============================================================
// Execution Types
// =============================================================

export type ExecutionListItem = {
  id: string;
  agentId: string;
  status: ExecutionStatus;
  executionTimeMs: number | null;
  costInCents: number;
  errorMessage: string | null;
  httpStatusCode: number | null;
  createdAt: Date;
  completedAt: Date | null;
  agent: {
    name: string;
    slug: string;
    category: string;
  };
};

export type ExecutionDetail = ExecutionListItem & {
  inputPayload: unknown;
  outputPayload: unknown;
  userId: string;
  tenantId: string;
};

export type ExecutionResult = {
  executionId: string;
  status: ExecutionStatus;
  outputPayload: unknown;
  executionTimeMs: number;
  costInCents: number;
  errorMessage: string | null;
};

// =============================================================
// PayFast Types
// =============================================================

export type PayFastITNPayload = {
  m_payment_id: string;
  pf_payment_id: string;
  payment_status: string;
  item_name: string;
  item_description: string;
  amount_gross: string;
  amount_fee: string;
  amount_net: string;
  custom_str1: string;
  custom_str2: string;
  custom_str3: string;
  custom_str4: string;
  custom_str5: string;
  custom_int1: string;
  custom_int2: string;
  custom_int3: string;
  custom_int4: string;
  custom_int5: string;
  name_first: string;
  name_last: string;
  email_address: string;
  merchant_id: string;
  signature: string;
  token: string;
};
