// =============================================================
// Team Service — Invite, accept, remove team members (Phase 11)
// =============================================================

import { db } from "@/lib/db";
import { nanoid } from "@/lib/utils";
import { notifyTeamInvite } from "@/lib/services/notification";
import type { Role } from "@prisma/client";

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------

export interface TeamMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  isActive: boolean;
  createdAt: Date;
}

export interface TeamInviteItem {
  id: string;
  email: string;
  role: Role;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  invitedBy: {
    firstName: string | null;
    lastName: string | null;
  };
}

// -------------------------------------------------------------
// List team members for a tenant
// -------------------------------------------------------------

export async function listTeamMembers(tenantId: string): Promise<TeamMember[]> {
  return db.user.findMany({
    where: { tenantId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

// -------------------------------------------------------------
// List pending invites for a tenant
// -------------------------------------------------------------

export async function listTeamInvites(tenantId: string): Promise<TeamInviteItem[]> {
  return db.teamInvite.findMany({
    where: { tenantId, status: "PENDING" },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      invitedBy: {
        select: { firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// -------------------------------------------------------------
// Send team invite
// -------------------------------------------------------------

export async function sendTeamInvite(input: {
  tenantId: string;
  email: string;
  role: Role;
  invitedById: string;
  inviterName: string;
  tenantName: string;
}): Promise<TeamInviteItem> {
  // Check if user is already in the tenant
  const existingUser = await db.user.findFirst({
    where: { email: input.email, tenantId: input.tenantId },
  });
  if (existingUser) {
    throw new Error("User is already a member of this team");
  }

  // Check for existing pending invite
  const existingInvite = await db.teamInvite.findFirst({
    where: {
      tenantId: input.tenantId,
      email: input.email,
      status: "PENDING",
    },
  });
  if (existingInvite) {
    throw new Error("An invite has already been sent to this email");
  }

  const code = nanoid(32);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await db.teamInvite.create({
    data: {
      tenantId: input.tenantId,
      email: input.email.toLowerCase(),
      role: input.role,
      code,
      invitedById: input.invitedById,
      expiresAt,
    },
    include: {
      invitedBy: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  // Send email notification
  await notifyTeamInvite(
    input.email,
    input.inviterName,
    input.tenantName,
    code,
  );

  return invite;
}

// -------------------------------------------------------------
// Accept team invite
// -------------------------------------------------------------

export async function acceptTeamInvite(code: string, clerkId: string) {
  const invite = await db.teamInvite.findUnique({
    where: { code },
    include: { tenant: true },
  });

  if (!invite) throw new Error("Invalid invite code");
  if (invite.status !== "PENDING") throw new Error("Invite is no longer valid");
  if (invite.expiresAt < new Date()) {
    await db.teamInvite.update({
      where: { id: invite.id },
      data: { status: "EXPIRED" },
    });
    throw new Error("Invite has expired");
  }

  // Look up existing user by clerkId
  const user = await db.user.findUnique({ where: { clerkId } });

  if (user) {
    // Update existing user to join new tenant
    await db.user.update({
      where: { id: user.id },
      data: {
        tenantId: invite.tenantId,
        role: invite.role,
        email: invite.email,
      },
    });
  } else {
    // Create new user in tenant
    await db.user.create({
      data: {
        clerkId,
        email: invite.email,
        tenantId: invite.tenantId,
        role: invite.role,
      },
    });
  }

  // Mark invite as accepted
  await db.teamInvite.update({
    where: { id: invite.id },
    data: { status: "ACCEPTED", acceptedAt: new Date() },
  });

  return invite.tenant;
}

// -------------------------------------------------------------
// Revoke a pending invite
// -------------------------------------------------------------

export async function revokeTeamInvite(
  inviteId: string,
  tenantId: string,
): Promise<void> {
  const invite = await db.teamInvite.findUnique({
    where: { id: inviteId },
  });

  if (!invite || invite.tenantId !== tenantId) {
    throw new Error("Invite not found");
  }

  if (invite.status !== "PENDING") {
    throw new Error("Can only revoke pending invites");
  }

  await db.teamInvite.update({
    where: { id: inviteId },
    data: { status: "REVOKED" },
  });
}

// -------------------------------------------------------------
// Remove a team member (not self)
// -------------------------------------------------------------

export async function removeTeamMember(
  memberId: string,
  tenantId: string,
  currentUserId: string,
): Promise<void> {
  if (memberId === currentUserId) {
    throw new Error("You cannot remove yourself from the team");
  }

  const member = await db.user.findUnique({
    where: { id: memberId },
  });

  if (!member || member.tenantId !== tenantId) {
    throw new Error("Member not found in your team");
  }

  // Deactivate the user (soft delete)
  await db.user.update({
    where: { id: memberId },
    data: { isActive: false },
  });
}
