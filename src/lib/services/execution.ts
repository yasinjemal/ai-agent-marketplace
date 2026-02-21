// =============================================================
// Agent Execution Service
// Orchestrates HTTP calls to external agent endpoints.
// Handles logging, metering, retries, and error handling.
// =============================================================

import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/services/audit-log";
import { checkRateLimit } from "@/lib/services/rate-limiter";
import {
  EXECUTION_TIMEOUT_MS,
  EXECUTION_MAX_RETRIES,
  EXECUTION_RETRY_BASE_DELAY_MS,
  RETRYABLE_HTTP_CODES,
  PLATFORM_COMMISSION_RATE,
} from "@/constants";
import type { ExecutionResult } from "@/types";
import type { Prisma } from "@prisma/client";

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------

interface ExecutionContext {
  userId: string;
  tenantId: string;
  planId: string;
}

interface AgentForExecution {
  id: string;
  name: string;
  executionEndpoint: string;
  pricingModel: string;
  priceInCents: number;
  status: string;
  isPublished: boolean;
}

// Custom error classes for execution failures
class ExecutionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: number = 500,
  ) {
    super(message);
    this.name = "ExecutionError";
  }
}

// -------------------------------------------------------------
// EXECUTE — Main entry point
// -------------------------------------------------------------

/**
 * Execute an AI agent via its HTTP endpoint.
 *
 * Flow:
 * 1. Validate agent exists and is approved/published
 * 2. Check rate limits for tenant's plan
 * 3. Create a PENDING execution record
 * 4. Call the agent's HTTP endpoint (with retries)
 * 5. Update execution record with result
 * 6. Update agent execution count
 * 7. Return result
 */
export async function executeAgent(
  agentId: string,
  inputPayload: Record<string, unknown>,
  ctx: ExecutionContext,
): Promise<ExecutionResult> {
  // 1. Look up agent
  const agent = await db.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      name: true,
      executionEndpoint: true,
      pricingModel: true,
      priceInCents: true,
      status: true,
      isPublished: true,
    },
  });

  if (!agent) {
    throw new ExecutionError("Agent not found", "AGENT_NOT_FOUND", 404);
  }

  if (agent.status !== "APPROVED" || !agent.isPublished) {
    throw new ExecutionError(
      "Agent is not available for execution",
      "AGENT_NOT_AVAILABLE",
      403,
    );
  }

  // 2. Check rate limits
  const rateLimit = checkRateLimit(ctx.tenantId, ctx.planId);
  if (!rateLimit.allowed) {
    throw new ExecutionError(
      `Rate limit exceeded. Retry after ${rateLimit.retryAfterSeconds} seconds.`,
      "RATE_LIMIT_EXCEEDED",
      429,
    );
  }

  // 3. Create PENDING execution record
  const execution = await db.agentExecution.create({
    data: {
      agentId: agent.id,
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      inputPayload: inputPayload as Prisma.InputJsonValue,
      status: "PENDING",
      costInCents: calculateCost(agent),
    },
  });

  // 4. Call agent endpoint (with retries)
  const startTime = Date.now();
  let result: ExecutionCallResult;

  try {
    // Update status to RUNNING
    await db.agentExecution.update({
      where: { id: execution.id },
      data: { status: "RUNNING" },
    });

    result = await callAgentWithRetries(agent, inputPayload);
  } catch (error) {
    // Handle complete failure (all retries exhausted or non-retryable error)
    const elapsed = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown execution error";
    const isTimeout = errorMessage.includes("timeout") || errorMessage.includes("aborted");

    const failedExecution = await db.agentExecution.update({
      where: { id: execution.id },
      data: {
        status: isTimeout ? "TIMEOUT" : "FAILED",
        executionTimeMs: elapsed,
        errorMessage: errorMessage.slice(0, 1000), // Limit error message length
        completedAt: new Date(),
      },
    });

    // Audit log (fire-and-forget)
    void createAuditLog({
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      action: "EXECUTE",
      entityType: "AgentExecution",
      entityId: failedExecution.id,
      metadata: {
        agentId: agent.id,
        agentName: agent.name,
        status: failedExecution.status,
        error: errorMessage.slice(0, 500),
        durationMs: elapsed,
      },
    });

    return {
      executionId: execution.id,
      status: isTimeout ? "TIMEOUT" : "FAILED",
      outputPayload: null,
      executionTimeMs: elapsed,
      costInCents: 0, // No charge on failure
      errorMessage,
    };
  }

  // 5. Update execution record with success
  const elapsed = Date.now() - startTime;
  const costInCents = calculateCost(agent);

  const completedExecution = await db.agentExecution.update({
    where: { id: execution.id },
    data: {
      status: "SUCCESS",
      outputPayload: result.data as Prisma.InputJsonValue,
      executionTimeMs: elapsed,
      httpStatusCode: result.httpStatus,
      costInCents,
      completedAt: new Date(),
    },
  });

  // 6. Increment agent execution count (fire-and-forget)
  void db.agent.update({
    where: { id: agent.id },
    data: { totalExecutions: { increment: 1 } },
  });

  // 7. Audit log (fire-and-forget)
  void createAuditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "EXECUTE",
    entityType: "AgentExecution",
    entityId: completedExecution.id,
    metadata: {
      agentId: agent.id,
      agentName: agent.name,
      status: "SUCCESS",
      durationMs: elapsed,
      costInCents,
    },
  });

  return {
    executionId: execution.id,
    status: "SUCCESS",
    outputPayload: result.data,
    executionTimeMs: elapsed,
    costInCents,
    errorMessage: null,
  };
}

// -------------------------------------------------------------
// HTTP Call with Retries
// -------------------------------------------------------------

interface ExecutionCallResult {
  data: unknown;
  httpStatus: number;
}

/**
 * Call the agent's HTTP endpoint with configurable retries.
 * Retries on transient HTTP errors (408, 429, 5xx).
 * Uses exponential backoff between retries.
 */
async function callAgentWithRetries(
  agent: AgentForExecution,
  inputPayload: Record<string, unknown>,
  maxRetries: number = EXECUTION_MAX_RETRIES,
): Promise<ExecutionCallResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callAgent(agent.executionEndpoint, inputPayload);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry non-retryable errors
      if (!isRetryableError(lastError)) {
        throw lastError;
      }

      // Don't wait after the last attempt
      if (attempt < maxRetries) {
        const delay = EXECUTION_RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error("All retry attempts exhausted");
}

/**
 * Make a single HTTP call to an agent endpoint.
 */
async function callAgent(
  endpoint: string,
  inputPayload: Record<string, unknown>,
): Promise<ExecutionCallResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "AIAgentMarketplace/1.0",
        "X-Marketplace-Request": "true",
      },
      body: JSON.stringify(inputPayload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "No response body");
      const error = new Error(
        `Agent returned HTTP ${response.status}: ${errorBody.slice(0, 500)}`,
      );
      // Attach status for retry logic
      (error as Error & { httpStatus?: number }).httpStatus = response.status;
      throw error;
    }

    const data: unknown = await response.json();
    return { data, httpStatus: response.status };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        `Agent execution timeout after ${EXECUTION_TIMEOUT_MS}ms`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// -------------------------------------------------------------
// LIST — Get paginated execution history
// -------------------------------------------------------------

export async function getExecutions(
  tenantId: string,
  query: {
    agentId?: string;
    status?: string;
    page: number;
    limit: number;
    sortBy: string;
  },
) {
  const where: Prisma.AgentExecutionWhereInput = { tenantId };

  if (query.agentId) {
    where.agentId = query.agentId;
  }
  if (query.status) {
    where.status = query.status as Prisma.AgentExecutionWhereInput["status"];
  }

  let orderBy: Prisma.AgentExecutionOrderByWithRelationInput;
  switch (query.sortBy) {
    case "oldest":
      orderBy = { createdAt: "asc" };
      break;
    case "duration":
      orderBy = { executionTimeMs: "desc" };
      break;
    case "cost":
      orderBy = { costInCents: "desc" };
      break;
    default:
      orderBy = { createdAt: "desc" };
  }

  const skip = (query.page - 1) * query.limit;

  const [executions, total] = await Promise.all([
    db.agentExecution.findMany({
      where,
      orderBy,
      skip,
      take: query.limit,
      select: {
        id: true,
        agentId: true,
        status: true,
        executionTimeMs: true,
        costInCents: true,
        errorMessage: true,
        httpStatusCode: true,
        createdAt: true,
        completedAt: true,
        agent: {
          select: {
            name: true,
            slug: true,
            category: true,
          },
        },
      },
    }),
    db.agentExecution.count({ where }),
  ]);

  return {
    executions,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

// -------------------------------------------------------------
// GET — Single execution detail
// -------------------------------------------------------------

export async function getExecutionById(
  executionId: string,
  tenantId: string,
) {
  return db.agentExecution.findFirst({
    where: {
      id: executionId,
      tenantId,
    },
    select: {
      id: true,
      agentId: true,
      userId: true,
      tenantId: true,
      inputPayload: true,
      outputPayload: true,
      status: true,
      executionTimeMs: true,
      costInCents: true,
      errorMessage: true,
      httpStatusCode: true,
      createdAt: true,
      completedAt: true,
      agent: {
        select: {
          name: true,
          slug: true,
          category: true,
        },
      },
    },
  });
}

// -------------------------------------------------------------
// STATS — Usage stats for a tenant (for billing dashboard)
// -------------------------------------------------------------

export async function getExecutionStats(tenantId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalAllTime, totalThisMonth, costThisMonth, byStatus] =
    await Promise.all([
      db.agentExecution.count({ where: { tenantId } }),
      db.agentExecution.count({
        where: {
          tenantId,
          createdAt: { gte: startOfMonth },
        },
      }),
      db.agentExecution.aggregate({
        where: {
          tenantId,
          status: "SUCCESS",
          createdAt: { gte: startOfMonth },
        },
        _sum: { costInCents: true },
      }),
      db.agentExecution.groupBy({
        by: ["status"],
        where: {
          tenantId,
          createdAt: { gte: startOfMonth },
        },
        _count: true,
      }),
    ]);

  const statusBreakdown = Object.fromEntries(
    byStatus.map((s) => [s.status, s._count]),
  );

  return {
    totalAllTime,
    totalThisMonth,
    costThisMonthInCents: costThisMonth._sum.costInCents ?? 0,
    statusBreakdown,
  };
}

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------

function calculateCost(agent: AgentForExecution): number {
  switch (agent.pricingModel) {
    case "PER_EXECUTION":
      return agent.priceInCents;
    case "FREE":
      return 0;
    default:
      // MONTHLY_FLAT and TIERED are covered by subscription, no per-exec cost
      return 0;
  }
}

function isRetryableError(error: Error): boolean {
  // Timeout errors are retryable
  if (error.message.includes("timeout") || error.message.includes("aborted")) {
    return true;
  }

  // Network errors (fetch failures) are retryable
  if (error.message.includes("fetch failed") || error.message.includes("ECONNREFUSED")) {
    return true;
  }

  // Check HTTP status code if attached
  const httpStatus = (error as Error & { httpStatus?: number }).httpStatus;
  if (httpStatus && RETRYABLE_HTTP_CODES.has(httpStatus)) {
    return true;
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
