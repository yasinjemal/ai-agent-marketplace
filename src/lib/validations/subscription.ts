// =============================================================
// Subscription Zod Validation Schemas
// Used for checkout and subscription management API validation.
// =============================================================

import { z } from "zod";

// -------------------------------------------------------------
// Plan Selection — choosing a subscription plan at checkout
// -------------------------------------------------------------

export const checkoutSchema = z.object({
  planId: z.enum(["starter", "growth"], {
    message: "Plan must be 'starter' or 'growth'",
  }),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

// -------------------------------------------------------------
// Cancel Subscription — optional cancellation reason
// -------------------------------------------------------------

export const cancelSubscriptionSchema = z.object({
  reason: z
    .string()
    .max(500, "Cancellation reason must be under 500 characters")
    .optional(),
});

export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
