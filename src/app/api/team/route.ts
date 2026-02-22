// =============================================================
// GET /api/team — List team members and pending invites
// POST /api/team — Send a team invite
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  listTeamMembers,
  listTeamInvites,
  sendTeamInvite,
} from "@/lib/services/team";
import type { ApiResponse } from "@/types";

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["BUSINESS_USER", "DEVELOPER"]).default("BUSINESS_USER"),
});

// GET — List team members + pending invites
export async function GET() {
  try {
    const session = await requireAuth();

    const [members, invites] = await Promise.all([
      listTeamMembers(session.tenantId),
      listTeamInvites(session.tenantId),
    ]);

    return NextResponse.json({
      success: true,
      data: { members, invites },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }
    console.error("[GET /api/team]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

// POST — Send a team invite
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Only admins and developers can invite
    if (session.role === "BUSINESS_USER") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only admins and developers can invite team members" } } satisfies ApiResponse<never>,
        { status: 403 },
      );
    }

    const body: unknown = await request.json();
    const parsed = inviteSchema.safeParse(body);

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

    // Get inviter info
    const [user, tenant] = await Promise.all([
      db.user.findUnique({
        where: { id: session.userId },
        select: { firstName: true, lastName: true },
      }),
      db.tenant.findUnique({
        where: { id: session.tenantId },
        select: { name: true },
      }),
    ]);

    const inviterName = [user?.firstName, user?.lastName]
      .filter(Boolean)
      .join(" ") || "A team member";

    const invite = await sendTeamInvite({
      tenantId: session.tenantId,
      email: parsed.data.email,
      role: parsed.data.role as "BUSINESS_USER" | "DEVELOPER",
      invitedById: session.userId,
      inviterName,
      tenantName: tenant?.name ?? "your team",
    });

    return NextResponse.json({ success: true, data: invite }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }
    if (
      message.includes("already a member") ||
      message.includes("already been sent")
    ) {
      return NextResponse.json(
        { success: false, error: { code: "CONFLICT", message } } satisfies ApiResponse<never>,
        { status: 409 },
      );
    }
    console.error("[POST /api/team]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
