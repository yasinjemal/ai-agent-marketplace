// =============================================================
// GET /api/settings/tenant — Get current tenant info
// PATCH /api/settings/tenant — Update tenant name
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { slugify } from "@/lib/utils";
import type { ApiResponse } from "@/types";

const updateTenantSchema = z.object({
  name: z
    .string()
    .min(2, "Tenant name must be at least 2 characters")
    .max(100, "Tenant name must be at most 100 characters"),
});

// GET — Get current user's tenant
export async function GET() {
  try {
    const session = await requireAuth();

    const [tenant, agentCount] = await Promise.all([
      db.tenant.findUnique({
        where: { id: session.tenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          _count: { select: { users: true } },
        },
      }),
      // Agent belongs to a developer (User), not Tenant directly.
      // Count agents created by users in this tenant.
      db.agent.count({
        where: { developer: { tenantId: session.tenantId } },
      }),
    ]);

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Tenant not found" } } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...tenant,
        _count: { ...tenant._count, agents: agentCount },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }
    console.error("[GET /api/settings/tenant]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

// PATCH — Update tenant name
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body: unknown = await request.json();
    const parseResult = updateTenantSchema.safeParse(body);

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

    const { name } = parseResult.data;
    const newSlug = slugify(name);

    // Check slug uniqueness (excluding current tenant)
    const existing = await db.tenant.findFirst({
      where: {
        slug: newSlug,
        NOT: { id: session.tenantId },
      },
    });

    const finalSlug = existing ? `${newSlug}-${Date.now().toString(36)}` : newSlug;

    const tenant = await db.tenant.update({
      where: { id: session.tenantId },
      data: { name, slug: finalSlug },
      select: { id: true, name: true, slug: true },
    });

    return NextResponse.json({
      success: true,
      data: tenant,
    } satisfies ApiResponse<typeof tenant>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }
    console.error("[PATCH /api/settings/tenant]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
