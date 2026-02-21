// =============================================================
// POST /api/subscriptions/checkout — Generate PayFast checkout URL
// Creates a subscription + payment record, returns the redirect URL.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { checkoutSchema } from "@/lib/validations/subscription";
import { createSubscription } from "@/lib/services/subscription";
import { generateCheckoutUrl } from "@/lib/services/payfast";
import type { ApiResponse } from "@/types";

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

    // Only BUSINESS_USER and DEVELOPER can subscribe (not ADMIN)
    if (session.role === "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Admins do not need subscriptions",
          },
        } satisfies ApiResponse<never>,
        { status: 403 },
      );
    }

    const body: unknown = await request.json();
    const parseResult = checkoutSchema.safeParse(body);

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

    const { planId } = parseResult.data;

    // Create subscription + pending payment in DB
    const { subscription, payment } = await createSubscription(planId, {
      userId: session.userId,
      tenantId: session.tenantId,
    });

    // Generate PayFast checkout URL
    const checkoutUrl = generateCheckoutUrl({
      paymentId: payment.id,
      planId,
      tenantId: session.tenantId,
      userId: session.userId,
      email: session.email,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          checkoutUrl,
          subscriptionId: subscription.id,
          paymentId: payment.id,
        },
      } satisfies ApiResponse<{
        checkoutUrl: string;
        subscriptionId: string;
        paymentId: string;
      }>,
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    console.error("[POST /api/subscriptions/checkout]", message);

    // Handle known business errors
    if (message.includes("already has an active subscription")) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "CONFLICT", message },
        } satisfies ApiResponse<never>,
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message },
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
