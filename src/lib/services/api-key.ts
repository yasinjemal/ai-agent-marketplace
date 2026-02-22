// =============================================================
// API Key Service
// Generate, validate, revoke, and list API keys for external
// integrations (OpenClaw webhooks, third-party tools).
// Keys are hashed with SHA-256 before storage.
// =============================================================

import { randomBytes, createHash } from "crypto";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/services/audit-log";

// -------------------------------------------------------------
// Constants
// -------------------------------------------------------------

/** Prefix for generated API keys */
const KEY_PREFIX = "mk_live_";

/** Length of the random portion (bytes → hex = 2× chars) */
const KEY_RANDOM_BYTES = 32;

/** Number of prefix chars stored for display */
const DISPLAY_PREFIX_LENGTH = 12;

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------

/** Generate a cryptographically random API key */
function generateRawKey(): string {
  const random = randomBytes(KEY_RANDOM_BYTES).toString("hex");
  return `${KEY_PREFIX}${random}`;
}

/** Hash a key with SHA-256 */
function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

// -------------------------------------------------------------
// CREATE — Generate a new API key
// -------------------------------------------------------------

export async function createApiKey(
  tenantId: string,
  label: string,
  userId: string,
) {
  const rawKey = generateRawKey();
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, DISPLAY_PREFIX_LENGTH);

  const apiKey = await db.apiKey.create({
    data: {
      tenantId,
      label,
      keyHash,
      keyPrefix,
    },
  });

  await createAuditLog({
    userId,
    tenantId,
    action: "CREATE",
    entityType: "ApiKey",
    entityId: apiKey.id,
    metadata: { label, keyPrefix },
  });

  // Return the raw key ONLY on creation (never stored)
  return {
    id: apiKey.id,
    label: apiKey.label,
    keyPrefix: apiKey.keyPrefix,
    rawKey,
    createdAt: apiKey.createdAt,
  };
}

// -------------------------------------------------------------
// LIST — Get all API keys for a tenant (no secrets)
// -------------------------------------------------------------

export async function listApiKeys(tenantId: string) {
  return db.apiKey.findMany({
    where: { tenantId, isRevoked: false },
    select: {
      id: true,
      label: true,
      keyPrefix: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

// -------------------------------------------------------------
// REVOKE — Soft-delete an API key
// -------------------------------------------------------------

export async function revokeApiKey(
  keyId: string,
  tenantId: string,
  userId: string,
) {
  const apiKey = await db.apiKey.findFirst({
    where: { id: keyId, tenantId, isRevoked: false },
  });

  if (!apiKey) {
    throw new Error("NOT_FOUND");
  }

  await db.apiKey.update({
    where: { id: keyId },
    data: { isRevoked: true },
  });

  await createAuditLog({
    userId,
    tenantId,
    action: "DELETE",
    entityType: "ApiKey",
    entityId: keyId,
    metadata: { label: apiKey.label, keyPrefix: apiKey.keyPrefix },
  });

  return { success: true };
}

// -------------------------------------------------------------
// VALIDATE — Verify an API key and return the tenant
// -------------------------------------------------------------

export async function validateApiKey(rawKey: string) {
  if (!rawKey || !rawKey.startsWith(KEY_PREFIX)) {
    return null;
  }

  const keyHash = hashKey(rawKey);

  const apiKey = await db.apiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      tenantId: true,
      isRevoked: true,
      expiresAt: true,
      tenant: {
        select: {
          id: true,
          isActive: true,
        },
      },
    },
  });

  if (!apiKey) return null;
  if (apiKey.isRevoked) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;
  if (!apiKey.tenant.isActive) return null;

  // Update last used timestamp (fire-and-forget)
  db.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      /* best-effort */
    });

  return {
    keyId: apiKey.id,
    tenantId: apiKey.tenantId,
  };
}
