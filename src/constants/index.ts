// =============================================================
// Application Constants
// Centralized config for plans, categories, and limits.
// =============================================================

// -------------------------------------------------------------
// Agent Categories
// -------------------------------------------------------------

export const AGENT_CATEGORIES = [
  { value: "customer-support", label: "Customer Support" },
  { value: "marketing", label: "Marketing & Ads" },
  { value: "sales", label: "Sales & CRM" },
  { value: "inventory", label: "Inventory Management" },
  { value: "finance", label: "Finance & Invoicing" },
  { value: "scheduling", label: "Scheduling & Bookings" },
  { value: "analytics", label: "Analytics & Reporting" },
  { value: "content", label: "Content Generation" },
  { value: "hr", label: "HR & Recruitment" },
  { value: "operations", label: "Operations" },
  { value: "other", label: "Other" },
] as const;

export type AgentCategory = (typeof AGENT_CATEGORIES)[number]["value"];

// -------------------------------------------------------------
// Subscription Plans
// -------------------------------------------------------------

export const SUBSCRIPTION_PLANS = {
  free: {
    id: "free",
    name: "Free Trial",
    description: "Try 2 agents free for 7 days",
    priceInCents: 0,
    maxAgents: 2,
    trialDays: 7,
    features: [
      "2 AI agents",
      "7-day free trial",
      "Basic support",
      "Community access",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    description: "Perfect for small businesses getting started",
    priceInCents: 29900,
    maxAgents: 5,
    trialDays: 0,
    features: [
      "5 AI agents",
      "Email support",
      "Basic analytics",
      "Standard API rate limits",
    ],
  },
  growth: {
    id: "growth",
    name: "Growth",
    description: "For growing businesses that need more power",
    priceInCents: 79900,
    maxAgents: 15,
    trialDays: 0,
    features: [
      "15 AI agents",
      "Priority support",
      "Advanced analytics",
      "Higher API rate limits",
      "Custom agent requests",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Unlimited power for large organizations",
    priceInCents: 0, // Custom pricing
    maxAgents: Infinity,
    trialDays: 0,
    features: [
      "Unlimited AI agents",
      "Dedicated support",
      "Custom SLA",
      "White-label option",
      "Custom integrations",
      "Dedicated account manager",
    ],
  },
} as const;

export type PlanId = keyof typeof SUBSCRIPTION_PLANS;

// -------------------------------------------------------------
// PayFast Configuration
// -------------------------------------------------------------

/** PayFast sandbox URL for testing */
export const PAYFAST_SANDBOX_HOST = "sandbox.payfast.co.za";

/** PayFast live URL for production */
export const PAYFAST_LIVE_HOST = "www.payfast.co.za";

/** PayFast process endpoint path */
export const PAYFAST_PROCESS_PATH = "/eng/process";

/** PayFast ITN validation endpoint path */
export const PAYFAST_VALIDATE_PATH = "/eng/query/validate";

/** PayFast subscription frequency: 3 = Monthly */
export const PAYFAST_FREQUENCY_MONTHLY = 3;

/** PayFast subscription cycles: 0 = indefinite */
export const PAYFAST_CYCLES_INDEFINITE = 0;

/** PayFast subscription type: 1 = subscription */
export const PAYFAST_SUBSCRIPTION_TYPE = 1;

/**
 * Valid PayFast IP ranges for ITN verification.
 * Requests from IPs outside these ranges should be rejected.
 */
export const PAYFAST_VALID_HOSTS = [
  "www.payfast.co.za",
  "sandbox.payfast.co.za",
  "w1w.payfast.co.za",
  "w2w.payfast.co.za",
] as const;

// -------------------------------------------------------------
// Platform Commission
// -------------------------------------------------------------

/** Platform commission rate on developer agent revenue (20%) */
export const PLATFORM_COMMISSION_RATE = 0.2;

// -------------------------------------------------------------
// Pagination Defaults
// -------------------------------------------------------------

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;

// -------------------------------------------------------------
// Rate Limits (requests per minute)
// -------------------------------------------------------------

export const RATE_LIMITS = {
  api: 60,
  agentExecution: 30,
  auth: 10,
} as const;

// -------------------------------------------------------------
// Execution Engine Configuration
// -------------------------------------------------------------

/** Default timeout for agent HTTP calls (milliseconds) */
export const EXECUTION_TIMEOUT_MS = 30_000;

/** Maximum timeout allowed (milliseconds) */
export const EXECUTION_MAX_TIMEOUT_MS = 120_000;

/** Maximum retries for transient failures */
export const EXECUTION_MAX_RETRIES = 2;

/** Delay between retries (milliseconds), doubles on each retry */
export const EXECUTION_RETRY_BASE_DELAY_MS = 1_000;

/** Maximum request body size for agent input payload (bytes) */
export const EXECUTION_MAX_PAYLOAD_BYTES = 1_048_576; // 1 MB

/** HTTP status codes considered retryable */
export const RETRYABLE_HTTP_CODES = new Set([408, 429, 500, 502, 503, 504]);

/**
 * Per-plan execution rate limits (requests per minute).
 * Maps to subscription plan IDs.
 */
export const PLAN_EXECUTION_LIMITS: Record<string, { perMinute: number; perDay: number }> = {
  free: { perMinute: 5, perDay: 50 },
  starter: { perMinute: 15, perDay: 500 },
  growth: { perMinute: 30, perDay: 2_000 },
  enterprise: { perMinute: 100, perDay: 10_000 },
} as const;
