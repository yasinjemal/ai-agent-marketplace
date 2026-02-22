// =============================================================
// GET /api/agents/[agentId]/export — Export agent as OpenClaw SKILL.md
// Requires authentication. Only the developer or admin can export.
// =============================================================

import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateSkillMd } from "@/lib/services/openclaw";
import { apiError, handleApiError } from "@/lib/api-response";

type RouteParams = { params: Promise<{ agentId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { agentId } = await params;

    // Find agent — try slug first, then ID
    const agent = await db.agent.findFirst({
      where: {
        OR: [{ id: agentId }, { slug: agentId }],
      },
      include: {
        developer: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!agent) {
      return apiError("NOT_FOUND", "Agent not found", { status: 404 });
    }

    // Only the developer who owns this agent or an admin can export
    const isOwner = agent.developer.id === session.userId;
    const isAdmin = session.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return apiError("FORBIDDEN", "Only the agent developer or admin can export", {
        status: 403,
      });
    }

    // Agent must be approved to export
    if (agent.status !== "APPROVED") {
      return apiError(
        "BAD_REQUEST",
        "Agent must be approved before exporting as an OpenClaw skill",
        { status: 400 },
      );
    }

    const skillMd = generateSkillMd(agent);

    // Check if raw download was requested
    const format = request.nextUrl.searchParams.get("format");

    if (format === "download") {
      return new Response(skillMd, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="SKILL.md"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // Default: return as JSON with the SKILL.md content
    return Response.json(
      {
        success: true,
        data: {
          skillMd,
          skillName: agent.slug,
          agentId: agent.id,
        },
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
