// =============================================================
// POST /api/agents/[agentId]/versions/[versionId]/rollback
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rollbackAgentToVersion } from "@/lib/services/version";
import type { ApiResponse } from "@/types";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ agentId: string; versionId: string }> },
) {
  try {
    const session = await requireAuth();
    const { agentId, versionId } = await params;

    // Verify the user owns this agent
    const agent = await db.agent.findUnique({
      where: { id: agentId },
      select: { developerId: true },
    });

    if (!agent) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Agent not found" } } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    if (agent.developerId !== session.userId && session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Not authorized" } } satisfies ApiResponse<never>,
        { status: 403 },
      );
    }

    await rollbackAgentToVersion(agentId, versionId);

    return NextResponse.json({
      success: true,
      data: { message: "Agent rolled back successfully" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }
    if (message === "Version not found") {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message } } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }
    console.error("[POST /api/agents/[agentId]/versions/[versionId]/rollback]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
