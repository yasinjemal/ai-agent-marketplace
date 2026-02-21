// =============================================================
// Clerk Middleware — Route protection + auth context
// Public routes: landing, marketplace, agent detail, webhooks
// Protected: dashboard, admin, API mutations
// =============================================================

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Public routes — accessible without authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/agents(.*)",
  "/pricing",                // Public pricing page
  "/api/agents(.*)",         // Public GET for marketplace browsing
  "/api/webhooks(.*)",       // Clerk + PayFast webhooks must be public
]);

// Admin-only routes
const isAdminRoute = createRouteMatcher([
  "/admin(.*)",
]);

// Developer-only routes
const isDeveloperRoute = createRouteMatcher([
  "/dashboard/agents(.*)",
]);

type SessionRole = "ADMIN" | "DEVELOPER" | "BUSINESS_USER";

export default clerkMiddleware(async (auth, request) => {
  const { userId, sessionClaims } = await auth();

  // Allow public routes without auth
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  // Protect all non-public routes
  if (!userId) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // Check if user has completed onboarding (has metadata.onboardingComplete)
  const metadata = sessionClaims?.metadata as Record<string, unknown> | undefined;
  const onboardingComplete = metadata?.onboardingComplete === true;
  const isOnboardingRoute =
    request.nextUrl.pathname === "/onboarding" ||
    request.nextUrl.pathname === "/api/onboarding";

  // Redirect to onboarding if not completed (unless already on onboarding page/API)
  if (!onboardingComplete && !isOnboardingRoute) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // If onboarding is complete and user is on /onboarding, redirect away
  if (onboardingComplete && isOnboardingRoute) {
    return NextResponse.redirect(new URL("/agents", request.url));
  }

  // Enforce role-based access for protected route groups.
  const role = metadata?.role as SessionRole | undefined;
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");

  if (isAdminRoute(request) && role !== "ADMIN") {
    if (isApiRoute) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Admin access required" },
        },
        { status: 403 },
      );
    }
    return NextResponse.redirect(new URL("/agents", request.url));
  }

  if (isDeveloperRoute(request) && role !== "DEVELOPER" && role !== "ADMIN") {
    if (isApiRoute) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Developer or admin access required",
          },
        },
        { status: 403 },
      );
    }
    return NextResponse.redirect(new URL("/agents", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
