// =============================================================
// Environment Variable Validation
// Crashes at startup if required variables are missing.
// =============================================================

import { z } from "zod";

/**
 * Server-side environment variables schema.
 * These are NEVER exposed to the client.
 */
const serverSchema = z.object({
  DATABASE_URL: z
    .string()
    .url({ message: "DATABASE_URL must be a valid PostgreSQL connection string" }),
  CLERK_SECRET_KEY: z
    .string()
    .min(1, { message: "CLERK_SECRET_KEY is required" }),
  CLERK_WEBHOOK_SECRET: z
    .string()
    .optional(),
  PAYFAST_MERCHANT_ID: z
    .string()
    .min(1, { message: "PAYFAST_MERCHANT_ID is required" }),
  PAYFAST_MERCHANT_KEY: z
    .string()
    .min(1, { message: "PAYFAST_MERCHANT_KEY is required" }),
  PAYFAST_PASSPHRASE: z
    .string()
    .optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

/**
 * Client-side environment variables schema.
 * These are exposed to the browser via NEXT_PUBLIC_ prefix.
 */
const clientSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, { message: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required" }),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url({ message: "NEXT_PUBLIC_APP_URL must be a valid URL" }),
});

/**
 * Combined schema for all environment variables.
 */
const envSchema = serverSchema.merge(clientSchema);

/**
 * Validate environment variables.
 * This runs at import time — if validation fails, the app crashes immediately.
 */
function validateEnv() {
  const parsed = envSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
    PAYFAST_MERCHANT_ID: process.env.PAYFAST_MERCHANT_ID,
    PAYFAST_MERCHANT_KEY: process.env.PAYFAST_MERCHANT_KEY,
    PAYFAST_PASSPHRASE: process.env.PAYFAST_PASSPHRASE,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([key, messages]) => `  ❌ ${key}: ${messages?.join(", ")}`)
      .join("\n");

    console.error(
      "\n🚨 FATAL: Invalid environment variables:\n" +
        errorMessages +
        "\n\nFix your .env file and restart.\n"
    );

    throw new Error("Invalid environment variables. Application cannot start.");
  }

  return parsed.data;
}

export const env = validateEnv();
