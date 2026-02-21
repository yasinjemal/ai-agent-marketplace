// =============================================================
// API Response Helper — Standardised API responses + caching
// Provides consistent response format and cache control headers.
// =============================================================

import { NextResponse } from "next/server";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface SuccessOptions {
  status?: number;
  /** Cache-Control max-age in seconds (0 = no-cache) */
  cache?: number;
  /** Allow CDN caching (s-maxage) in seconds */
  cdnCache?: number;
}

interface ErrorOptions {
  status?: number;
}

/**
 * Return a successful JSON response with optional caching.
 */
export function apiSuccess<T>(data: T, options: SuccessOptions = {}) {
  const { status = 200, cache = 0, cdnCache } = options;

  const headers: Record<string, string> = {};

  if (cache > 0 || cdnCache) {
    const parts: string[] = [];
    if (cache > 0) parts.push(`max-age=${cache}`);
    if (cdnCache) parts.push(`s-maxage=${cdnCache}`, "stale-while-revalidate=60");
    else parts.push("private");
    headers["Cache-Control"] = parts.join(", ");
  } else {
    headers["Cache-Control"] = "no-store, no-cache, must-revalidate";
  }

  return NextResponse.json({ success: true, data }, { status, headers });
}

/**
 * Return an error JSON response.
 */
export function apiError(
  code: string,
  message: string,
  options: ErrorOptions = {},
) {
  const { status = 400 } = options;
  return NextResponse.json(
    { success: false, error: { code, message } },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

/**
 * Standard error handler for API routes.
 * Maps known error messages to appropriate HTTP status codes.
 */
export function handleApiError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Internal server error";

  if (message === "UNAUTHORIZED") {
    return apiError("UNAUTHORIZED", "Authentication required", { status: 401 });
  }
  if (message === "FORBIDDEN") {
    return apiError("FORBIDDEN", "Insufficient permissions", { status: 403 });
  }
  if (message === "NOT_FOUND") {
    return apiError("NOT_FOUND", "Resource not found", { status: 404 });
  }
  if (message === "CONFLICT") {
    return apiError("CONFLICT", "Resource already exists", { status: 409 });
  }
  if (message === "RATE_LIMITED") {
    return apiError("RATE_LIMITED", "Too many requests", { status: 429 });
  }

  // Unknown errors
  console.error("[API Error]", error);
  return apiError("INTERNAL_ERROR", "Internal server error", { status: 500 });
}
