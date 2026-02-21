// =============================================================
// Execution Zod Validation Schemas
// Validates agent execution requests and query parameters.
// =============================================================

import { z } from "zod";

// -------------------------------------------------------------
// Execute Agent — Request body validation
// The inputPayload must conform to the agent's inputSchema,
// but we validate shape here (object) and let the agent
// itself enforce its own field-level rules.
// -------------------------------------------------------------

export const executeAgentSchema = z.object({
  /** Input payload to send to the agent's execution endpoint */
  inputPayload: z
    .record(z.string(), z.unknown())
    .refine((val) => Object.keys(val).length > 0, {
      message: "Input payload must have at least one field",
    }),
});

export type ExecuteAgentInput = z.infer<typeof executeAgentSchema>;

// -------------------------------------------------------------
// Execution Query — List/filter executions
// -------------------------------------------------------------

export const executionQuerySchema = z.object({
  agentId: z.string().optional(),
  status: z
    .enum(["PENDING", "RUNNING", "SUCCESS", "FAILED", "TIMEOUT"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum(["newest", "oldest", "duration", "cost"])
    .default("newest"),
});

export type ExecutionQueryInput = z.infer<typeof executionQuerySchema>;
