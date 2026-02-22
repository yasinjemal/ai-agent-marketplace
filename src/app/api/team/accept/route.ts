// =============================================================
// POST /api/team/accept — Accept a team invite
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { acceptTeamInvite } from "@/lib/services/team";
import type { ApiResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Sign in to accept this invite" } } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }

    const body = (await request.json()) as { code?: string };
    const code = body.code;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invite code is required" } } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const tenant = await acceptTeamInvite(code, clerkId);

    return NextResponse.json({
      success: true,
      data: { message: `You've joined ${tenant.name}!`, tenantName: tenant.name },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (
      message.includes("Invalid") ||
      message.includes("expired") ||
      message.includes("no longer valid")
    ) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message } } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }
    console.error("[POST /api/team/accept]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
