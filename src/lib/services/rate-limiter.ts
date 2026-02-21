// =============================================================
// Rate Limiter — In-memory sliding-window per-tenant rate limiting
// Enforces per-minute and per-day execution limits by plan tier.
// =============================================================

import { PLAN_EXECUTION_LIMITS } from "@/constants";

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------

interface RateLimitWindow {
  /** Timestamps of requests in the current minute window */
  minuteTimestamps: number[];
  /** Timestamps of requests in the current day window */
  dayTimestamps: number[];
}

interface RateLimitResult {
  allowed: boolean;
  /** Requests remaining in the current minute */
  remainingPerMinute: number;
  /** Requests remaining in the current day */
  remainingPerDay: number;
  /** Seconds until the next minute window resets */
  retryAfterSeconds: number | null;
}

// -------------------------------------------------------------
// In-memory store (per-process — resets on restart)
// For production: replace with Redis
// -------------------------------------------------------------

const store = new Map<string, RateLimitWindow>();

/** Clean up stale entries every 5 minutes */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, window] of store.entries()) {
      // Remove entries with no recent activity
      window.minuteTimestamps = window.minuteTimestamps.filter(
        (t) => now - t < ONE_MINUTE_MS,
      );
      window.dayTimestamps = window.dayTimestamps.filter(
        (t) => now - t < ONE_DAY_MS,
      );
      if (
        window.minuteTimestamps.length === 0 &&
        window.dayTimestamps.length === 0
      ) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Don't block process exit
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

// -------------------------------------------------------------
// Rate limit check
// -------------------------------------------------------------

/**
 * Check whether a tenant can execute an agent given their plan limits.
 * If allowed, records the request timestamp.
 *
 * @param tenantId - The tenant making the request
 * @param planId   - The tenant's current subscription plan
 * @returns RateLimitResult with allowed status and remaining quotas
 */
export function checkRateLimit(
  tenantId: string,
  planId: string,
): RateLimitResult {
  ensureCleanup();

  const limits = PLAN_EXECUTION_LIMITS[planId] ?? PLAN_EXECUTION_LIMITS.free;
  const now = Date.now();
  const key = `exec:${tenantId}`;

  let window = store.get(key);
  if (!window) {
    window = { minuteTimestamps: [], dayTimestamps: [] };
    store.set(key, window);
  }

  // Prune expired timestamps
  window.minuteTimestamps = window.minuteTimestamps.filter(
    (t) => now - t < ONE_MINUTE_MS,
  );
  window.dayTimestamps = window.dayTimestamps.filter(
    (t) => now - t < ONE_DAY_MS,
  );

  const minuteCount = window.minuteTimestamps.length;
  const dayCount = window.dayTimestamps.length;

  // Check limits
  if (minuteCount >= limits.perMinute) {
    const oldestInWindow = window.minuteTimestamps[0] ?? now;
    const retryAfterSeconds = Math.ceil(
      (ONE_MINUTE_MS - (now - oldestInWindow)) / 1000,
    );
    return {
      allowed: false,
      remainingPerMinute: 0,
      remainingPerDay: Math.max(0, limits.perDay - dayCount),
      retryAfterSeconds,
    };
  }

  if (dayCount >= limits.perDay) {
    const oldestInDay = window.dayTimestamps[0] ?? now;
    const retryAfterSeconds = Math.ceil(
      (ONE_DAY_MS - (now - oldestInDay)) / 1000,
    );
    return {
      allowed: false,
      remainingPerMinute: Math.max(0, limits.perMinute - minuteCount),
      remainingPerDay: 0,
      retryAfterSeconds,
    };
  }

  // Record the request
  window.minuteTimestamps.push(now);
  window.dayTimestamps.push(now);

  return {
    allowed: true,
    remainingPerMinute: limits.perMinute - minuteCount - 1,
    remainingPerDay: limits.perDay - dayCount - 1,
    retryAfterSeconds: null,
  };
}

/**
 * Get current rate limit status without consuming a request.
 */
export function getRateLimitStatus(
  tenantId: string,
  planId: string,
): Omit<RateLimitResult, "allowed"> {
  const limits = PLAN_EXECUTION_LIMITS[planId] ?? PLAN_EXECUTION_LIMITS.free;
  const now = Date.now();
  const key = `exec:${tenantId}`;
  const window = store.get(key);

  if (!window) {
    return {
      remainingPerMinute: limits.perMinute,
      remainingPerDay: limits.perDay,
      retryAfterSeconds: null,
    };
  }

  const minuteCount = window.minuteTimestamps.filter(
    (t) => now - t < ONE_MINUTE_MS,
  ).length;
  const dayCount = window.dayTimestamps.filter(
    (t) => now - t < ONE_DAY_MS,
  ).length;

  return {
    remainingPerMinute: Math.max(0, limits.perMinute - minuteCount),
    remainingPerDay: Math.max(0, limits.perDay - dayCount),
    retryAfterSeconds: null,
  };
}
