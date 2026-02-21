// =============================================================
// Review Service
// Business logic for agent ratings and reviews.
// Handles creation, listing, moderation, and rating recalculation.
// =============================================================

import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/services/audit-log";
import type { CreateReviewInput, ReviewQueryInput } from "@/lib/validations/review";

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------

interface ReviewContext {
  userId: string;
  tenantId: string;
}

// -------------------------------------------------------------
// CREATE — Submit a review for an agent
// Business users only. One review per user per agent.
// Must have executed the agent at least once.
// -------------------------------------------------------------

export async function createReview(
  agentId: string,
  input: CreateReviewInput,
  ctx: ReviewContext,
) {
  // Verify agent exists and is published
  const agent = await db.agent.findUnique({
    where: { id: agentId },
    select: { id: true, name: true, status: true, isPublished: true },
  });

  if (!agent || agent.status !== "APPROVED" || !agent.isPublished) {
    throw new Error("AGENT_NOT_FOUND");
  }

  // Check if user has executed this agent at least once
  const hasExecuted = await db.agentExecution.findFirst({
    where: {
      agentId,
      userId: ctx.userId,
      status: "SUCCESS",
    },
    select: { id: true },
  });

  if (!hasExecuted) {
    throw new Error("MUST_EXECUTE_FIRST");
  }

  // Check for existing review (upsert pattern)
  const existingReview = await db.review.findUnique({
    where: { agentId_userId: { agentId, userId: ctx.userId } },
  });

  let review;

  if (existingReview) {
    // Update existing review
    review = await db.review.update({
      where: { id: existingReview.id },
      data: {
        rating: input.rating,
        comment: input.comment ?? null,
      },
    });
  } else {
    // Create new review
    review = await db.review.create({
      data: {
        agentId,
        userId: ctx.userId,
        tenantId: ctx.tenantId,
        rating: input.rating,
        comment: input.comment ?? null,
      },
    });
  }

  // Recalculate agent average rating
  await recalculateAgentRating(agentId);

  // Audit log
  void createAuditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: existingReview ? "UPDATE" : "CREATE",
    entityType: "Review",
    entityId: review.id,
    metadata: {
      agentId,
      agentName: agent.name,
      rating: input.rating,
    },
  });

  return review;
}

// -------------------------------------------------------------
// LIST — Get reviews for an agent (public)
// -------------------------------------------------------------

export async function getReviews(agentId: string, query: ReviewQueryInput) {
  const { page, limit, sortBy } = query;

  let orderBy: Record<string, "asc" | "desc">;
  switch (sortBy) {
    case "oldest":
      orderBy = { createdAt: "asc" };
      break;
    case "highest":
      orderBy = { rating: "desc" };
      break;
    case "lowest":
      orderBy = { rating: "asc" };
      break;
    default:
      orderBy = { createdAt: "desc" };
  }

  const skip = (page - 1) * limit;

  const [reviews, total, ratingDistribution] = await Promise.all([
    db.review.findMany({
      where: { agentId, isVisible: true },
      orderBy,
      skip,
      take: limit,
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
    }),
    db.review.count({ where: { agentId, isVisible: true } }),
    // Rating distribution (1-5 star counts)
    db.review.groupBy({
      by: ["rating"],
      where: { agentId, isVisible: true },
      _count: true,
    }),
  ]);

  // Convert groupBy to a clean distribution object
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const group of ratingDistribution) {
    distribution[group.rating] = group._count;
  }

  return {
    reviews,
    distribution,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// -------------------------------------------------------------
// GET USER REVIEW — Check if user has reviewed an agent
// -------------------------------------------------------------

export async function getUserReview(agentId: string, userId: string) {
  return db.review.findUnique({
    where: { agentId_userId: { agentId, userId } },
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
    },
  });
}

// -------------------------------------------------------------
// DELETE — User deletes their own review
// -------------------------------------------------------------

export async function deleteReview(
  reviewId: string,
  ctx: ReviewContext,
) {
  const review = await db.review.findFirst({
    where: { id: reviewId, userId: ctx.userId },
    select: { id: true, agentId: true },
  });

  if (!review) {
    throw new Error("REVIEW_NOT_FOUND");
  }

  await db.review.delete({ where: { id: reviewId } });

  // Recalculate agent rating
  await recalculateAgentRating(review.agentId);

  void createAuditLog({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    action: "DELETE",
    entityType: "Review",
    entityId: reviewId,
    metadata: { agentId: review.agentId },
  });

  return { deleted: true };
}

// -------------------------------------------------------------
// MODERATE — Admin hides/shows a review
// -------------------------------------------------------------

export async function moderateReview(
  reviewId: string,
  isVisible: boolean,
  adminUserId: string,
) {
  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { id: true, agentId: true },
  });

  if (!review) {
    throw new Error("REVIEW_NOT_FOUND");
  }

  const updated = await db.review.update({
    where: { id: reviewId },
    data: { isVisible },
  });

  // Recalculate rating with updated visibility
  await recalculateAgentRating(review.agentId);

  void createAuditLog({
    userId: adminUserId,
    tenantId: null,
    action: "UPDATE",
    entityType: "Review",
    entityId: reviewId,
    metadata: { action: isVisible ? "show" : "hide", agentId: review.agentId },
  });

  return updated;
}

// -------------------------------------------------------------
// RECALCULATE — Update cached average rating on Agent
// -------------------------------------------------------------

async function recalculateAgentRating(agentId: string): Promise<void> {
  const result = await db.review.aggregate({
    where: { agentId, isVisible: true },
    _avg: { rating: true },
    _count: true,
  });

  await db.agent.update({
    where: { id: agentId },
    data: {
      averageRating: result._avg.rating ?? 0,
    },
  });
}
