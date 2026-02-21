// =============================================================
// Audit Log Service
// Centralized logging for POPIA compliance and security.
// All sensitive operations MUST be logged via this service.
// =============================================================

import { db } from "@/lib/db";
import type { AuditAction } from "@prisma/client";

interface AuditLogParams {
  userId?: string | null;
  tenantId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Create an immutable audit log entry.
 * This is fire-and-forget — we don't want audit logging failures
 * to block business operations, but we DO log the error.
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId ?? null,
        tenantId: params.tenantId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        metadata: params.metadata ?? null,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  } catch (error) {
    // Audit log failures must never crash the app,
    // but MUST be reported to error monitoring.
    console.error("[AUDIT_LOG_FAILURE]", {
      params,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
