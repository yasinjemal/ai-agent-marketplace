// =============================================================
// GET/POST /api/agents/[agentId]/versions — Version history
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  createAgentVersion,
  listAgentVersions,
} from "@/lib/services/version";
import type { ApiResponse } from "@/types";

const createVersionSchema = z.object({
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, "Version must be in semver format (e.g. 1.2.0)"),
  changelog: z.string().max(2000).optional(),
});

// GET — List all versions for an agent
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  try {
    const session = await requireAuth();
    const { agentId } = await params;

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

    const versions = await listAgentVersions(agentId);
    return NextResponse.json({ success: true, data: versions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }
    console.error("[GET /api/agents/[agentId]/versions]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

// POST — Create a new version snapshot
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  try {
    const session = await requireAuth();
    const { agentId } = await params;

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

    const body: unknown = await request.json();
    const parsed = createVersionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Invalid input",
          },
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const version = await createAgentVersion({
      agentId,
      version: parsed.data.version,
      changelog: parsed.data.changelog,
      createdById: session.userId,
    });

    return NextResponse.json({ success: true, data: version }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }
    if (message.includes("already exists")) {
      return NextResponse.json(
        { success: false, error: { code: "CONFLICT", message } } satisfies ApiResponse<never>,
        { status: 409 },
      );
    }
    console.error("[POST /api/agents/[agentId]/versions]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
