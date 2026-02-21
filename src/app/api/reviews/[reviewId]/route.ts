// =============================================================
// DELETE /api/reviews/[reviewId]      — User deletes own review
// PATCH  /api/reviews/[reviewId]      — Admin moderates review
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth";
import { deleteReview, moderateReview } from "@/lib/services/review";
import type { ApiResponse } from "@/types";

type RouteParams = { params: Promise<{ reviewId: string }> };

// ----- DELETE — User removes their own review ----------------

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const session = await requireAuth();
    const { reviewId } = await params;

    const result = await deleteReview(reviewId, {
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
    if (message === "REVIEW_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Review not found" } } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    console.error("[DELETE /api/reviews/:id]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

// ----- PATCH — Admin hides/shows a review --------------------

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const session = await requireRole("ADMIN");
    const { reviewId } = await params;

    const body = (await request.json()) as { isVisible?: boolean };

    if (typeof body.isVisible !== "boolean") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "isVisible (boolean) is required" } } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const review = await moderateReview(reviewId, body.isVisible, session.userId);

    return NextResponse.json({ success: true, data: review } satisfies ApiResponse<typeof review>);
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
        { success: false, error: { code: "FORBIDDEN", message: "Admin access required" } } satisfies ApiResponse<never>,
        { status: 403 },
      );
    }
    if (message === "REVIEW_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Review not found" } } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    console.error("[PATCH /api/reviews/:id]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
