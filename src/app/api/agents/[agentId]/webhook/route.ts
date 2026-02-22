// =============================================================
// POST /api/agents/[agentId]/webhook — OpenClaw webhook bridge
// Allows external tools (OpenClaw, scripts) to execute agents
// via API key authentication instead of Clerk session.
// =============================================================

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { validateApiKey } from "@/lib/services/api-key";
import { createAuditLog } from "@/lib/services/audit-log";
import { apiError } from "@/lib/api-response";
import {
  EXECUTION_TIMEOUT_MS,
  EXECUTION_MAX_PAYLOAD_BYTES,
} from "@/constants";

type RouteParams = { params: Promise<{ agentId: string }> };

// -------------------------------------------------------------
// POST — Execute an agent via API key
// -------------------------------------------------------------

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { agentId } = await params;

    // --- 1. API Key authentication ---
    const apiKey =
      request.headers.get("x-api-key") ??
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (!apiKey) {
      return apiError("UNAUTHORIZED", "API key required. Pass via X-API-Key header.", {
        status: 401,
      });
    }

    const keyResult = await validateApiKey(apiKey);
    if (!keyResult) {
      return apiError("UNAUTHORIZED", "Invalid or revoked API key", {
        status: 401,
      });
    }

    // --- 2. Find the agent ---
    const agent = await db.agent.findFirst({
      where: {
        OR: [{ id: agentId }, { slug: agentId }],
        status: "APPROVED",
        isPublished: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        executionEndpoint: true,
        pricingModel: true,
        priceInCents: true,
      },
    });

    if (!agent) {
      return apiError("NOT_FOUND", "Agent not found or not published", {
        status: 404,
      });
    }

    // --- 3. Parse input payload ---
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > EXECUTION_MAX_PAYLOAD_BYTES) {
      return apiError("BAD_REQUEST", "Payload too large (max 1 MB)", {
        status: 413,
      });
    }

    let inputPayload: unknown = {};
    try {
      const body = await request.json();
      inputPayload = body.input ?? body;
    } catch {
      return apiError("BAD_REQUEST", "Invalid JSON body", { status: 400 });
    }

    // --- 4. Find a user for this tenant (use tenant's first active user) ---
    const tenantUser = await db.user.findFirst({
      where: { tenantId: keyResult.tenantId, isActive: true },
      select: { id: true },
    });

    if (!tenantUser) {
      return apiError("FORBIDDEN", "No active user found for this API key's tenant", {
        status: 403,
      });
    }

    // --- 5. Create execution record ---
    const execution = await db.agentExecution.create({
      data: {
        agentId: agent.id,
        userId: tenantUser.id,
        tenantId: keyResult.tenantId,
        inputPayload: inputPayload as object,
        status: "RUNNING",
      },
    });

    // --- 6. Call the agent endpoint ---
    const startTime = Date.now();
    let outputPayload: unknown = null;
    let errorMessage: string | null = null;
    let httpStatusCode: number | null = null;
    let status: "SUCCESS" | "FAILED" | "TIMEOUT" = "SUCCESS";

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        EXECUTION_TIMEOUT_MS,
      );

      const response = await fetch(agent.executionEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputPayload),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      httpStatusCode = response.status;

      if (response.ok) {
        outputPayload = await response.json();
      } else {
        status = "FAILED";
        errorMessage = `Agent returned HTTP ${response.status}`;
        try {
          const errBody = await response.text();
          if (errBody) errorMessage += `: ${errBody.slice(0, 500)}`;
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      status = err instanceof DOMException && err.name === "AbortError" ? "TIMEOUT" : "FAILED";
      errorMessage =
        status === "TIMEOUT"
          ? `Execution timed out after ${EXECUTION_TIMEOUT_MS}ms`
          : err instanceof Error
            ? err.message
            : "Unknown execution error";
    }

    const executionTimeMs = Date.now() - startTime;

    // Cost calculation
    const costInCents =
      agent.pricingModel === "PER_EXECUTION" && status === "SUCCESS"
        ? agent.priceInCents
        : 0;

    // --- 7. Update execution record ---
    await db.agentExecution.update({
      where: { id: execution.id },
      data: {
        status,
        outputPayload: outputPayload as object ?? undefined,
        executionTimeMs,
        costInCents,
        errorMessage,
        httpStatusCode,
        completedAt: new Date(),
      },
    });

    // Increment agent execution count on success
    if (status === "SUCCESS") {
      await db.agent.update({
        where: { id: agent.id },
        data: { totalExecutions: { increment: 1 } },
      }).catch(() => { /* best-effort */ });
    }

    // Audit log
    await createAuditLog({
      userId: tenantUser.id,
      tenantId: keyResult.tenantId,
      action: "EXECUTE",
      entityType: "Agent",
      entityId: agent.id,
      metadata: {
        source: "webhook",
        executionId: execution.id,
        status,
        executionTimeMs,
      },
    }).catch(() => { /* best-effort */ });

    // --- 8. Return result ---
    return Response.json(
      {
        success: status === "SUCCESS",
        data: {
          executionId: execution.id,
          status,
          output: outputPayload,
          executionTimeMs,
          costInCents,
          errorMessage,
        },
      },
      {
        status: status === "SUCCESS" ? 200 : status === "TIMEOUT" ? 504 : 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("[Webhook Error]", error);
    return apiError("INTERNAL_ERROR", "Internal server error", { status: 500 });
  }
}
