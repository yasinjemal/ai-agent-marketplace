// =============================================================
// GET    /api/agents/[agentId] — Get agent detail
// PATCH  /api/agents/[agentId] — Update agent (developer only)
// DELETE /api/agents/[agentId] — Delete agent (developer only)
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth";
import { updateAgentSchema } from "@/lib/validations/agent";
import {
  getAgentById,
  getAgentBySlug,
  updateAgent,
  deleteAgent,
} from "@/lib/services/agent";
import type { ApiResponse } from "@/types";

type RouteParams = { params: Promise<{ agentId: string }> };

// -------------------------------------------------------------
// GET — Get agent by ID or slug
// -------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { agentId } = await params;

    // Try as slug first (for public pages), then as ID
    const agent = await getAgentBySlug(agentId);

    if (!agent) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Agent not found" } } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    // If not published, only the developer or admin can see it
    if (!agent.isPublished || agent.status !== "APPROVED") {
      try {
        const session = await requireAuth();
        const isOwner = agent.developer.id === session.userId;
        const isAdmin = session.role === "ADMIN";

        if (!isOwner && !isAdmin) {
          return NextResponse.json(
            { success: false, error: { code: "NOT_FOUND", message: "Agent not found" } } satisfies ApiResponse<never>,
            { status: 404 },
          );
        }
      } catch {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "Agent not found" } } satisfies ApiResponse<never>,
          { status: 404 },
        );
      }
    }

    return NextResponse.json({ success: true, data: agent } satisfies ApiResponse<typeof agent>);
  } catch (error) {
    console.error("[GET /api/agents/:id]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

// -------------------------------------------------------------
// PATCH — Update agent (developer only)
// -------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const session = await requireRole("DEVELOPER", "ADMIN");
    const { agentId } = await params;

    const body: unknown = await request.json();
    const parseResult = updateAgentSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parseResult.error.issues[0]?.message ?? "Invalid input",
          },
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const agent = await updateAgent(agentId, parseResult.data, {
      userId: session.userId,
      tenantId: session.tenantId,
    });

    return NextResponse.json({ success: true, data: agent } satisfies ApiResponse<typeof agent>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";

    if (message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions" } } satisfies ApiResponse<never>,
        { status: 403 },
      );
    }
    if (message === "AGENT_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Agent not found or you don't own it" } } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    console.error("[PATCH /api/agents/:id]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

// -------------------------------------------------------------
// DELETE — Delete agent (developer only, draft/rejected only)
// -------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const session = await requireRole("DEVELOPER", "ADMIN");
    const { agentId } = await params;

    const result = await deleteAgent(agentId, {
      userId: session.userId,
      tenantId: session.tenantId,
    });

    return NextResponse.json({ success: true, data: result } satisfies ApiResponse<typeof result>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";

    if (message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions" } } satisfies ApiResponse<never>,
        { status: 403 },
      );
    }
    if (message === "AGENT_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Agent not found or you don't own it" } } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }
    if (message === "AGENT_CANNOT_DELETE_ACTIVE") {
      return NextResponse.json(
        { success: false, error: { code: "CONFLICT", message: "Cannot delete an active or approved agent. Withdraw it first." } } satisfies ApiResponse<never>,
        { status: 409 },
      );
    }

    console.error("[DELETE /api/agents/:id]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
