// =============================================================
// GET  /api/settings/api-keys — List tenant API keys
// POST /api/settings/api-keys — Generate a new API key
// =============================================================

import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createApiKey, listApiKeys } from "@/lib/services/api-key";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";

// -------------------------------------------------------------
// GET — List all active API keys for the current tenant
// -------------------------------------------------------------

export async function GET() {
  try {
    const session = await requireAuth();
    const keys = await listApiKeys(session.tenantId);
    return apiSuccess(keys);
  } catch (error) {
    return handleApiError(error);
  }
}

// -------------------------------------------------------------
// POST — Generate a new API key
// -------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const label = typeof body.label === "string" && body.label.trim()
      ? body.label.trim()
      : "Default Key";

    if (label.length > 100) {
      return apiError("BAD_REQUEST", "Label must be 100 characters or less", {
        status: 400,
      });
    }

    // Limit to 10 active keys per tenant
    const existing = await listApiKeys(session.tenantId);
    if (existing.length >= 10) {
      return apiError(
        "BAD_REQUEST",
        "Maximum 10 active API keys per tenant. Revoke unused keys first.",
        { status: 400 },
      );
    }

    const key = await createApiKey(session.tenantId, label, session.userId);
    return apiSuccess(key, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
