// =============================================================
// DELETE /api/team/[memberId] — Remove a team member
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { removeTeamMember } from "@/lib/services/team";
import type { ApiResponse } from "@/types";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> },
) {
  try {
    const session = await requireAuth();
    const { memberId } = await params;

    // Only admins can remove members
    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only admins can remove team members" } } satisfies ApiResponse<never>,
        { status: 403 },
      );
    }

    await removeTeamMember(memberId, session.tenantId, session.userId);

    return NextResponse.json({
      success: true,
      data: { message: "Member removed successfully" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }
    if (message.includes("cannot remove yourself") || message.includes("not found")) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message } } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }
    console.error("[DELETE /api/team/[memberId]]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
