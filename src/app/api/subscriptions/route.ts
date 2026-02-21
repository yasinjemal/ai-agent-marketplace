// =============================================================
// GET  /api/subscriptions — Get current subscription + usage
// POST /api/subscriptions — Cancel current subscription
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cancelSubscriptionSchema } from "@/lib/validations/subscription";
import {
  getCurrentSubscription,
  cancelSubscription,
  getPlanUsage,
  getPaymentHistory,
} from "@/lib/services/subscription";
import type { ApiResponse } from "@/types";

// -------------------------------------------------------------
// GET — Current subscription + plan usage
// -------------------------------------------------------------

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Not authenticated" },
        } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }

    const [subscription, usage, history] = await Promise.all([
      getCurrentSubscription(session.tenantId),
      getPlanUsage(session.tenantId),
      getPaymentHistory(session.tenantId, 1, 10),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        subscription,
        usage,
        payments: history.payments,
        totalPayments: history.total,
      },
    });
  } catch (error) {
    console.error("[GET /api/subscriptions]", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

// -------------------------------------------------------------
// POST — Cancel current subscription
// Body: { reason?: string }
// -------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Not authenticated" },
        } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }

    const body: unknown = await request.json();
    const parseResult = cancelSubscriptionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              parseResult.error.issues[0]?.message ?? "Invalid input",
          },
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    // Find current active subscription
    const current = await getCurrentSubscription(session.tenantId);

    if (!current) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "No active subscription to cancel",
          },
        } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const canceled = await cancelSubscription(
      current.id,
      parseResult.data.reason,
      {
        userId: session.userId,
        tenantId: session.tenantId,
      },
    );

    return NextResponse.json({
      success: true,
      data: {
        id: canceled.id,
        status: canceled.status,
        canceledAt: canceled.canceledAt,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    console.error("[POST /api/subscriptions]", message);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message },
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
