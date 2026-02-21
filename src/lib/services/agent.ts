// =============================================================
// Agent Service
// Business logic for agent CRUD, approval workflow, and queries.
// All operations enforce tenant isolation and role checks.
// =============================================================

import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/services/audit-log";
import { slugify } from "@/lib/utils";
import type { CreateAgentInput, UpdateAgentInput, AgentQueryInput } from "@/lib/validations/agent";
import type { Prisma } from "@prisma/client";

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------

interface ServiceContext {
  userId: string;
  tenantId: string;
}

interface AdminContext {
  userId: string;
}

// -------------------------------------------------------------
// CREATE — Developer creates a new agent
// -------------------------------------------------------------

export async function createAgent(
  input: CreateAgentInput,
  ctx: ServiceContext,
) {
  // Generate a unique slug
  let slug = slugify(input.name);
  const existingSlug = await db.agent.findUnique({ where: { slug } });
  if (existingSlug) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const agent = await db.agent.create({
    data: {
      name: input.name,
      slug,
      description: input.description,
      longDescription: input.longDescription ?? null,
      category: input.category,
      tags: input.tags,
      developerId: ctx.userId,
      tenantId: ctx.tenantId,
      inputSchema: input.inputSchema,
      outputSchema: input.outputSchema,
      executionEndpoint: input.executionEndpoint,
      pricingModel: input.pricingModel,
      priceInCents: input.priceInCents,
      status: "DRAFT",
      isPublished: false,
    },
  });

  await createAuditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "CREATE",
    entityType: "Agent",
    entityId: agent.id,
    metadata: { name: agent.name, slug: agent.slug },
  });

  return agent;
}

// -------------------------------------------------------------
// READ — Get paginated list of agents with filters
// -------------------------------------------------------------

export async function getAgents(query: AgentQueryInput, options?: {
  /** Only return approved+published agents (for public marketplace) */
  publicOnly?: boolean;
  /** Only return agents by this developer */
  developerId?: string;
  /** Only return agents for admin review */
  adminReview?: boolean;
}) {
  const { search, category, status, pricingModel, page, limit, sortBy } = query;

  const where: Prisma.AgentWhereInput = {};

  // Public marketplace: only approved + published
  if (options?.publicOnly) {
    where.status = "APPROVED";
    where.isPublished = true;
  }

  // Developer dashboard: only their own agents
  if (options?.developerId) {
    where.developerId = options.developerId;
  }

  // Admin review: pending agents
  if (options?.adminReview) {
    where.status = "PENDING_REVIEW";
  }

  // Filters
  if (status && !options?.publicOnly && !options?.adminReview) {
    where.status = status;
  }
  if (category) {
    where.category = category;
  }
  if (pricingModel) {
    where.pricingModel = pricingModel;
  }

  // Search by name or description
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { tags: { has: search.toLowerCase() } },
    ];
  }

  // Sort order
  let orderBy: Prisma.AgentOrderByWithRelationInput;
  switch (sortBy) {
    case "rating":
      orderBy = { averageRating: "desc" };
      break;
    case "popular":
      orderBy = { totalExecutions: "desc" };
      break;
    case "price_asc":
      orderBy = { priceInCents: "asc" };
      break;
    case "price_desc":
      orderBy = { priceInCents: "desc" };
      break;
    default:
      orderBy = { createdAt: "desc" };
  }

  const skip = (page - 1) * limit;

  const [agents, total] = await Promise.all([
    db.agent.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        iconUrl: true,
        category: true,
        tags: true,
        pricingModel: true,
        priceInCents: true,
        averageRating: true,
        totalExecutions: true,
        status: true,
        version: true,
        isPublished: true,
        createdAt: true,
        developer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    db.agent.count({ where }),
  ]);

  return {
    agents,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// -------------------------------------------------------------
// READ — Get single agent by slug (public detail page)
// -------------------------------------------------------------

export async function getAgentBySlug(slug: string) {
  const agent = await db.agent.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      longDescription: true,
      iconUrl: true,
      category: true,
      tags: true,
      inputSchema: true,
      outputSchema: true,
      executionEndpoint: true,
      pricingModel: true,
      priceInCents: true,
      status: true,
      version: true,
      isPublished: true,
      averageRating: true,
      totalExecutions: true,
      createdAt: true,
      updatedAt: true,
      developer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      reviews: {
        where: { isVisible: true },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  return agent;
}

// -------------------------------------------------------------
// READ — Get single agent by ID (for developer editing)
// -------------------------------------------------------------

export async function getAgentById(agentId: string, developerId: string) {
  const agent = await db.agent.findFirst({
    where: {
      id: agentId,
      developerId,
    },
  });

  return agent;
}

// -------------------------------------------------------------
// UPDATE — Developer updates their agent
// -------------------------------------------------------------

export async function updateAgent(
  agentId: string,
  input: UpdateAgentInput,
  ctx: ServiceContext,
) {
  // Verify ownership
  const existing = await db.agent.findFirst({
    where: { id: agentId, developerId: ctx.userId },
  });

  if (!existing) {
    throw new Error("AGENT_NOT_FOUND");
  }

  // If agent was approved/published, editing resets to draft
  const needsReReview =
    existing.status === "APPROVED" || existing.status === "PENDING_REVIEW";

  const updateData: Prisma.AgentUpdateInput = {
    ...input,
    // Re-generate slug if name changed
    ...(input.name ? { slug: slugify(input.name) + "-" + Date.now().toString(36) } : {}),
    // Reset status if substantive edits on approved agent
    ...(needsReReview ? { status: "DRAFT", isPublished: false } : {}),
  };

  const agent = await db.agent.update({
    where: { id: agentId },
    data: updateData,
  });

  await createAuditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "UPDATE",
    entityType: "Agent",
    entityId: agent.id,
    metadata: {
      updatedFields: Object.keys(input),
      resetToDraft: needsReReview,
    },
  });

  return agent;
}

// -------------------------------------------------------------
// DELETE — Developer deletes their draft agent
// -------------------------------------------------------------

export async function deleteAgent(agentId: string, ctx: ServiceContext) {
  // Verify ownership
  const existing = await db.agent.findFirst({
    where: { id: agentId, developerId: ctx.userId },
  });

  if (!existing) {
    throw new Error("AGENT_NOT_FOUND");
  }

  // Only allow deleting draft or rejected agents
  if (existing.status !== "DRAFT" && existing.status !== "REJECTED") {
    throw new Error("AGENT_CANNOT_DELETE_ACTIVE");
  }

  await db.agent.delete({ where: { id: agentId } });

  await createAuditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "DELETE",
    entityType: "Agent",
    entityId: agentId,
    metadata: { name: existing.name, previousStatus: existing.status },
  });

  return { deleted: true };
}

// -------------------------------------------------------------
// WORKFLOW — Developer submits agent for review
// -------------------------------------------------------------

export async function submitAgentForReview(
  agentId: string,
  ctx: ServiceContext,
) {
  const existing = await db.agent.findFirst({
    where: { id: agentId, developerId: ctx.userId },
  });

  if (!existing) {
    throw new Error("AGENT_NOT_FOUND");
  }

  if (existing.status !== "DRAFT" && existing.status !== "REJECTED") {
    throw new Error("AGENT_NOT_SUBMITTABLE");
  }

  const agent = await db.agent.update({
    where: { id: agentId },
    data: {
      status: "PENDING_REVIEW",
      rejectionReason: null,
    },
  });

  await createAuditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "UPDATE",
    entityType: "Agent",
    entityId: agent.id,
    metadata: { action: "submit_for_review" },
  });

  return agent;
}

// -------------------------------------------------------------
// ADMIN — Approve an agent
// -------------------------------------------------------------

export async function approveAgent(agentId: string, ctx: AdminContext) {
  const existing = await db.agent.findUnique({ where: { id: agentId } });

  if (!existing) {
    throw new Error("AGENT_NOT_FOUND");
  }

  if (existing.status !== "PENDING_REVIEW") {
    throw new Error("AGENT_NOT_PENDING");
  }

  const agent = await db.agent.update({
    where: { id: agentId },
    data: {
      status: "APPROVED",
      isPublished: true,
      rejectionReason: null,
    },
  });

  await createAuditLog({
    userId: ctx.userId,
    tenantId: null,
    action: "APPROVAL",
    entityType: "Agent",
    entityId: agent.id,
    metadata: { name: agent.name, developerId: agent.developerId },
  });

  return agent;
}

// -------------------------------------------------------------
// ADMIN — Reject an agent
// -------------------------------------------------------------

export async function rejectAgent(
  agentId: string,
  reason: string,
  ctx: AdminContext,
) {
  const existing = await db.agent.findUnique({ where: { id: agentId } });

  if (!existing) {
    throw new Error("AGENT_NOT_FOUND");
  }

  if (existing.status !== "PENDING_REVIEW") {
    throw new Error("AGENT_NOT_PENDING");
  }

  const agent = await db.agent.update({
    where: { id: agentId },
    data: {
      status: "REJECTED",
      isPublished: false,
      rejectionReason: reason,
    },
  });

  await createAuditLog({
    userId: ctx.userId,
    tenantId: null,
    action: "REJECTION",
    entityType: "Agent",
    entityId: agent.id,
    metadata: { name: agent.name, reason, developerId: agent.developerId },
  });

  return agent;
}
