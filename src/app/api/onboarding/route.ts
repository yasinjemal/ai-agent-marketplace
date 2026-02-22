// =============================================================
// POST /api/onboarding — Complete user onboarding
// Creates Tenant + User record, then updates Clerk metadata.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type { ApiResponse } from "@/types";

const onboardingSchema = z.object({
  businessName: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(100, "Business name must be at most 100 characters"),
  role: z.enum(["DEVELOPER", "BUSINESS_USER"], {
    message: "Role must be DEVELOPER or BUSINESS_USER",
  }),
});

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }

    const body: unknown = await request.json();
    const parseResult = onboardingSchema.safeParse(body);

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

    const { businessName, role } = parseResult.data;

    // Check if user already exists — if so, sync Clerk metadata and return
    const existingUser = await db.user.findUnique({
      where: { clerkId },
      include: { tenant: { select: { id: true } } },
    });

    if (existingUser) {
      // User exists in DB but Clerk metadata may be out of sync — fix it
      try {
        const client = await clerkClient();
        await client.users.updateUserMetadata(clerkId, {
          publicMetadata: {
            onboardingComplete: true,
            role: existingUser.role,
            tenantId: existingUser.tenant.id,
            dbUserId: existingUser.id,
          },
        });
      } catch (metaError) {
        console.error("[POST /api/onboarding] Clerk metadata sync failed:", metaError);
      }

      // Set cookies so middleware can bypass stale JWT claims
      const response = NextResponse.json(
        {
          success: true,
          data: {
            userId: existingUser.id,
            tenantId: existingUser.tenant.id,
            role: existingUser.role,
          },
        } satisfies ApiResponse<{
          userId: string;
          tenantId: string;
          role: string;
        }>,
        { status: 200 },
      );
      response.cookies.set("onboarding_complete", "1", { path: "/", httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
      response.cookies.set("onboarding_role", existingUser.role, { path: "/", httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
      return response;
    }

    // Get Clerk user data (with retry for transient network errors)
    let clerkUser;
    try {
      const client = await clerkClient();
      clerkUser = await client.users.getUser(clerkId);
    } catch (clerkError) {
      console.error("[POST /api/onboarding] Clerk API error:", clerkError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CLERK_UNAVAILABLE",
            message: "Unable to reach authentication service. Please check your internet connection and try again.",
          },
        } satisfies ApiResponse<never>,
        { status: 503 },
      );
    }

    const primaryEmail = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    );

    if (!primaryEmail) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "No primary email found" } } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    // Create tenant + user in a transaction
    // Note: Prisma v7 infers the transaction client type automatically
    const result = await db.$transaction(async (tx) => {
      // Generate unique slug
      let slug = slugify(businessName);
      const existingTenant = await tx.tenant.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (existingTenant) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }

      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: businessName,
          slug,
        },
      });

      // Create user
      const user = await tx.user.create({
        data: {
          clerkId,
          email: primaryEmail.emailAddress,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          role: role as "ADMIN" | "DEVELOPER" | "BUSINESS_USER",
          tenantId: tenant.id,
          popiaConsent: true,
          consentDate: new Date(),
        },
      });

      return { tenant, user };
    });

    // Update Clerk user metadata to mark onboarding complete
    try {
      const client = await clerkClient();
      await client.users.updateUserMetadata(clerkId, {
        publicMetadata: {
          onboardingComplete: true,
          role: role,
          tenantId: result.tenant.id,
          dbUserId: result.user.id,
        },
      });
    } catch (metaError) {
      // Non-fatal: DB records are created, metadata update can be retried
      console.error("[POST /api/onboarding] Clerk metadata update failed:", metaError);
      // Still return success — the user is created in DB, metadata can be synced later
    }

    // Set cookies so middleware can bypass stale JWT claims immediately
    const response = NextResponse.json(
      {
        success: true,
        data: {
          userId: result.user.id,
          tenantId: result.tenant.id,
          role: result.user.role,
        },
      } satisfies ApiResponse<{
        userId: string;
        tenantId: string;
        role: string;
      }>,
      { status: 201 },
    );
    response.cookies.set("onboarding_complete", "1", { path: "/", httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
    response.cookies.set("onboarding_role", role, { path: "/", httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
    return response;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    console.error("[POST /api/onboarding] ERROR:", errMsg);
    if (errStack) console.error("[POST /api/onboarding] STACK:", errStack);

    // Categorize error for better debugging
    const isDbError =
      errMsg.includes("ECONNRESET") ||
      errMsg.includes("ECONNREFUSED") ||
      errMsg.includes("socket") ||
      errMsg.includes("TLS") ||
      errMsg.includes("connection");
    const code = isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR";
    const userMessage = isDbError
      ? "Database connection issue. Please try again in a moment."
      : process.env.NODE_ENV === "development"
        ? errMsg
        : "Something went wrong";

    return NextResponse.json(
      { success: false, error: { code, message: userMessage } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
