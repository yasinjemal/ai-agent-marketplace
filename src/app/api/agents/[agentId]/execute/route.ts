// =============================================================
// POST /api/agents/[agentId]/execute — Execute an AI agent
// Requires authentication + active subscription.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { executeAgentSchema } from "@/lib/validations/execution";
import { executeAgent } from "@/lib/services/execution";
import { getCurrentSubscription } from "@/lib/services/subscription";
import type { ApiResponse, ExecutionResult } from "@/types";

type RouteParams = { params: Promise<{ agentId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate
    const session = await requireAuth();

    // 2. Get agent ID
    const { agentId } = await params;

    // 3. Validate request body
    const body: unknown = await request.json();
    const parsed = executeAgentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Invalid request body",
          },
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    // 4. Verify tenant has an active subscription
    const subscription = await getCurrentSubscription(session.tenantId);
    const planId = subscription?.planId ?? "free";

    if (
      !subscription ||
      (subscription.status !== "ACTIVE" && subscription.status !== "TRIAL")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NO_ACTIVE_SUBSCRIPTION",
            message:
              "An active subscription is required to execute agents. Visit /pricing to subscribe.",
          },
        } satisfies ApiResponse<never>,
        { status: 403 },
      );
    }

    // 5. Execute the agent
    const result = await executeAgent(agentId, parsed.data.inputPayload, {
      userId: session.userId,
      tenantId: session.tenantId,
      planId,
    });

    // Return appropriate status code based on result
    if (result.status === "SUCCESS") {
      return NextResponse.json(
        { success: true as const, data: result } satisfies ApiResponse<ExecutionResult>,
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        success: false as const,
        error: {
          code: "EXECUTION_FAILED",
          message: result.errorMessage ?? "Agent execution failed",
        },
      } satisfies ApiResponse<never>,
      { status: 502 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const code =
      error instanceof Error && "code" in error
        ? (error as Error & { code: string }).code
        : "INTERNAL_ERROR";
    const httpStatus =
      error instanceof Error && "httpStatus" in error
        ? (error as Error & { httpStatus: number }).httpStatus
        : 500;

    // Map known error codes to HTTP statuses
    const statusMap: Record<string, number> = {
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      AGENT_NOT_FOUND: 404,
      AGENT_NOT_AVAILABLE: 403,
      RATE_LIMIT_EXCEEDED: 429,
    };

    const status = statusMap[message] ?? statusMap[code] ?? httpStatus;

    return NextResponse.json(
      {
        success: false,
        error: {
          code: message === "UNAUTHORIZED" ? "UNAUTHORIZED" : code,
          message:
            message === "UNAUTHORIZED"
              ? "Authentication required"
              : message,
        },
      } satisfies ApiResponse<never>,
      { status },
    );
  }
}
