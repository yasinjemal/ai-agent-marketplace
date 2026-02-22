// =============================================================
// Resend Email Client — Singleton for email delivery
// =============================================================

import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.warn("[EMAIL] RESEND_API_KEY not set — emails will be logged only");
}

const globalForResend = globalThis as unknown as {
  resend: Resend | undefined;
};

export const resend =
  globalForResend.resend ?? (apiKey ? new Resend(apiKey) : null);

if (process.env.NODE_ENV !== "production" && resend) {
  globalForResend.resend = resend;
}

export const fromEmail =
  process.env.FROM_EMAIL ?? "noreply@aimarketplace.co.za";
