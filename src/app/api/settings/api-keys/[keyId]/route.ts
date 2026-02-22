// =============================================================
// DELETE /api/settings/api-keys/[keyId] — Revoke an API key
// =============================================================

import { requireAuth } from "@/lib/auth";
import { revokeApiKey } from "@/lib/services/api-key";
import { apiSuccess, handleApiError } from "@/lib/api-response";

type RouteParams = { params: Promise<{ keyId: string }> };

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { keyId } = await params;

    await revokeApiKey(keyId, session.tenantId, session.userId);
    return apiSuccess({ revoked: true });
  } catch (error) {
    return handleApiError(error);
  }
}
