// =============================================================
// GET/PATCH /api/settings/email-preferences — Email opt-out toggle
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import type { ApiResponse } from "@/types";

const updateSchema = z.object({
  emailOptOut: z.boolean(),
});

// GET — Get current email preference
export async function GET() {
  try {
    const session = await requireAuth();
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { emailOptOut: true },
    });

    return NextResponse.json({
      success: true,
      data: { emailOptOut: user?.emailOptOut ?? false },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

// PATCH — Toggle email opt-out
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body: unknown = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input" } } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const user = await db.user.update({
      where: { id: session.userId },
      data: { emailOptOut: parsed.data.emailOptOut },
      select: { emailOptOut: true },
    });

    return NextResponse.json({
      success: true,
      data: { emailOptOut: user.emailOptOut },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
