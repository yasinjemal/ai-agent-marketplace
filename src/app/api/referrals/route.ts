// =============================================================
// GET  /api/referrals — Get referral stats + history
// POST /api/referrals — Apply a referral code (onboarding)
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getReferralStats,
  getReferralHistory,
  applyReferralCode,
} from "@/lib/services/referral";
import type { ApiResponse } from "@/types";

// ----- GET — Referral dashboard data --------------------------

export async function GET(_request: NextRequest) {
  try {
    const session = await requireAuth();

    const [stats, history] = await Promise.all([
      getReferralStats(session.tenantId),
      getReferralHistory(session.tenantId),
    ]);

    const data = { stats, history };

    return NextResponse.json({
      success: true,
      data,
    } satisfies ApiResponse<typeof data>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";

    if (message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }

    console.error("[GET /api/referrals]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

// ----- POST — Apply referral code during onboarding -----------

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = (await request.json()) as { code?: string };
    const code = body.code?.trim();

    if (!code) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Referral code is required" } } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const applied = await applyReferralCode(code, session.tenantId);

    if (!applied) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CODE",
            message: "Invalid, expired, or already used referral code",
          },
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { applied: true },
    } satisfies ApiResponse<{ applied: boolean }>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";

    if (message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }

    console.error("[POST /api/referrals]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
