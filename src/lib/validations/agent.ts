// =============================================================
// Agent Zod Validation Schemas
// Used for API request validation and form validation.
// =============================================================

import { z } from "zod";

// -------------------------------------------------------------
// Enum mirrors (keep in sync with Prisma enums)
// -------------------------------------------------------------

export const AgentStatusEnum = z.enum([
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
]);

export const PricingModelEnum = z.enum([
  "FREE",
  "PER_EXECUTION",
  "MONTHLY_FLAT",
  "TIERED",
]);

// -------------------------------------------------------------
// Create Agent Schema — Developer submits a new agent
// -------------------------------------------------------------

export const createAgentSchema = z.object({
  name: z
    .string()
    .min(3, "Agent name must be at least 3 characters")
    .max(100, "Agent name must be under 100 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must be under 500 characters"),
  longDescription: z
    .string()
    .max(5000, "Long description must be under 5000 characters")
    .optional(),
  category: z
    .string()
    .min(1, "Category is required"),
  tags: z
    .array(z.string().max(30))
    .max(10, "Maximum 10 tags allowed")
    .default([]),
  inputSchema: z
    .record(z.string(), z.unknown())
    .refine((val) => Object.keys(val).length > 0, {
      message: "Input schema must define at least one field",
    }),
  outputSchema: z
    .record(z.string(), z.unknown())
    .refine((val) => Object.keys(val).length > 0, {
      message: "Output schema must define at least one field",
    }),
  executionEndpoint: z
    .string()
    .url("Execution endpoint must be a valid URL"),
  pricingModel: PricingModelEnum.default("FREE"),
  priceInCents: z
    .number()
    .int()
    .min(0, "Price cannot be negative")
    .default(0),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;

// -------------------------------------------------------------
// Update Agent Schema — Developer edits an existing agent
// -------------------------------------------------------------

export const updateAgentSchema = z.object({
  name: z
    .string()
    .min(3, "Agent name must be at least 3 characters")
    .max(100, "Agent name must be under 100 characters")
    .optional(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must be under 500 characters")
    .optional(),
  longDescription: z
    .string()
    .max(5000, "Long description must be under 5000 characters")
    .nullish(),
  category: z
    .string()
    .min(1)
    .optional(),
  tags: z
    .array(z.string().max(30))
    .max(10)
    .optional(),
  inputSchema: z
    .record(z.string(), z.unknown())
    .optional(),
  outputSchema: z
    .record(z.string(), z.unknown())
    .optional(),
  executionEndpoint: z
    .string()
    .url("Execution endpoint must be a valid URL")
    .optional(),
  pricingModel: PricingModelEnum.optional(),
  priceInCents: z
    .number()
    .int()
    .min(0)
    .optional(),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, "Version must be semver (e.g., 1.0.0)")
    .optional(),
});

export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;

// -------------------------------------------------------------
// Agent Approval Schema — Admin approves or rejects
// -------------------------------------------------------------

export const agentApprovalSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectionReason: z
    .string()
    .min(10, "Rejection reason must be at least 10 characters")
    .max(500)
    .optional(),
}).refine(
  (data) => {
    if (data.action === "reject" && !data.rejectionReason) {
      return false;
    }
    return true;
  },
  {
    message: "Rejection reason is required when rejecting an agent",
    path: ["rejectionReason"],
  }
);

export type AgentApprovalInput = z.infer<typeof agentApprovalSchema>;

// -------------------------------------------------------------
// Agent Query Schema — Filter/search agents
// -------------------------------------------------------------

export const agentQuerySchema = z.object({
  search: z.string().max(100).optional(),
  category: z.string().optional(),
  status: AgentStatusEnum.optional(),
  pricingModel: PricingModelEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  sortBy: z.enum(["newest", "rating", "popular", "price_asc", "price_desc"]).default("newest"),
});

export type AgentQueryInput = z.infer<typeof agentQuerySchema>;
