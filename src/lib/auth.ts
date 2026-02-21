// =============================================================
// Auth Helpers — Clerk-backed authentication (Phase 3)
// Uses Clerk auth() to get the current user, then looks up the
// Prisma User record by clerkId. Same API surface as Phase 2.
// =============================================================

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

export interface AuthSession {
  userId: string;
  clerkId: string;
  tenantId: string;
  role: Role;
  email: string;
}

/**
 * Get the current authenticated user session.
 *
 * Uses Clerk auth() to get the clerkId, then looks up the
 * corresponding Prisma User record.
 *
 * Returns null if not authenticated or user not found in DB.
 */
export async function getSession(): Promise<AuthSession | null> {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      clerkId: true,
      tenantId: true,
      role: true,
      email: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    clerkId: user.clerkId,
    tenantId: user.tenantId,
    role: user.role,
    email: user.email,
  };
}

/**
 * Require authentication. Throws if not authenticated.
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

/**
 * Require a specific role. Throws if unauthorized.
 */
export async function requireRole(
  ...allowedRoles: Role[]
): Promise<AuthSession> {
  const session = await requireAuth();
  if (!allowedRoles.includes(session.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
