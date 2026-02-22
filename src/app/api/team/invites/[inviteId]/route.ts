// =============================================================
// DELETE /api/team/invites/[inviteId] — Revoke a pending invite
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { revokeTeamInvite } from "@/lib/services/team";
import type { ApiResponse } from "@/types";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> },
) {
  try {
    const session = await requireAuth();
    const { inviteId } = await params;

    await revokeTeamInvite(inviteId, session.tenantId);

    return NextResponse.json({
      success: true,
      data: { message: "Invite revoked" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }
    if (message.includes("not found") || message.includes("only revoke")) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message } } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }
    console.error("[DELETE /api/team/invites/[inviteId]]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
