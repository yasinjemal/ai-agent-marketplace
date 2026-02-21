// =============================================================
// Review Zod Validation Schemas
// Validates review creation and query parameters.
// =============================================================

import { z } from "zod";

// -------------------------------------------------------------
// Create Review — Business user submits a review
// -------------------------------------------------------------

export const createReviewSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
  comment: z
    .string()
    .max(2000, "Review must be under 2000 characters")
    .optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

// -------------------------------------------------------------
// Review Query — List reviews for an agent
// -------------------------------------------------------------

export const reviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sortBy: z.enum(["newest", "oldest", "highest", "lowest"]).default("newest"),
});

export type ReviewQueryInput = z.infer<typeof reviewQuerySchema>;
