// =============================================================
// GET  /api/agents/[agentId]/reviews — Public: list reviews
// POST /api/agents/[agentId]/reviews — Auth:   submit/update
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { getSession, requireAuth } from "@/lib/auth";
import { createReview, getReviews, getUserReview } from "@/lib/services/review";
import { createReviewSchema, reviewQuerySchema } from "@/lib/validations/review";
import type { ApiResponse } from "@/types";

type RouteParams = { params: Promise<{ agentId: string }> };

// ----- GET — Public review listing --------------------------

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { agentId } = await params;
    const { searchParams } = new URL(request.url);

    const query = reviewQuerySchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      sortBy: searchParams.get("sortBy"),
    });

    const result = await getReviews(agentId, query);

    // If user is signed in, include their review
    const session = await getSession();
    let userReview = null;
    if (session) {
      userReview = await getUserReview(agentId, session.userId);
    }

    return NextResponse.json({
      success: true,
      data: { ...result, userReview },
    } satisfies ApiResponse<typeof result & { userReview: typeof userReview }>);
  } catch (error) {
    console.error("[GET /api/agents/:id/reviews]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

// ----- POST — Create or update a review ---------------------

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const session = await requireAuth();
    const { agentId } = await params;

    const body: unknown = await request.json();
    const parseResult = createReviewSchema.safeParse(body);

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

    const review = await createReview(agentId, parseResult.data, {
      userId: session.userId,
      tenantId: session.tenantId,
    });

    return NextResponse.json(
      { success: true, data: review } satisfies ApiResponse<typeof review>,
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";

    if (message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }
    if (message === "AGENT_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Agent not found" } } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }
    if (message === "MUST_EXECUTE_FIRST") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PRECONDITION_FAILED",
            message: "You must execute this agent at least once before reviewing it",
          },
        } satisfies ApiResponse<never>,
        { status: 412 },
      );
    }

    console.error("[POST /api/agents/:id/reviews]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
