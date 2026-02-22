// =============================================================
// Notification Service — Real email delivery via Resend
// Structured email dispatch for key platform events.
// Falls back to console logging if Resend is not configured.
// =============================================================

import { db } from "@/lib/db";
import { resend, fromEmail } from "@/lib/resend";
import { formatZAR } from "@/lib/utils";
import {
  welcomeEmail,
  subscriptionCreatedEmail,
  subscriptionCanceledEmail,
  paymentReceivedEmail,
  agentApprovedEmail,
  agentRejectedEmail,
  executionFailedEmail,
  referralRewardedEmail,
  teamInviteEmail,
} from "@/lib/email-templates";

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// -------------------------------------------------------------
// Email Transport — Resend with console fallback
// -------------------------------------------------------------

async function sendEmail(payload: EmailPayload): Promise<boolean> {
  // Check if user has opted out of emails
  const hasOptedOut = await checkEmailOptOut(payload.to);
  if (hasOptedOut) {
    console.log("[NOTIFICATION] Email skipped (user opted out):", payload.to);
    return false;
  }

  if (!resend) {
    // No Resend API key — log to console (development mode)
    console.log("[NOTIFICATION] 📧 Email (console):", {
      to: payload.to,
      subject: payload.subject,
    });
    return true;
  }

  try {
    const { error } = await resend.emails.send({
      from: `AI Agent Marketplace <${fromEmail}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    if (error) {
      console.error("[NOTIFICATION] Resend error:", error);
      return false;
    }

    console.log("[NOTIFICATION] ✅ Email sent:", {
      to: payload.to,
      subject: payload.subject,
    });
    return true;
  } catch (err) {
    // Non-fatal: log and continue — never block business logic for email
    console.error("[NOTIFICATION] Failed to send email:", err);
    return false;
  }
}

// -------------------------------------------------------------
// Helper — Look up user email by ID
// -------------------------------------------------------------

async function getUserEmail(userId: string): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return user?.email ?? null;
}

// -------------------------------------------------------------
// Helper — Check email opt-out
// -------------------------------------------------------------

async function checkEmailOptOut(email: string): Promise<boolean> {
  const user = await db.user.findFirst({
    where: { email },
    select: { emailOptOut: true },
  });
  return user?.emailOptOut === true;
}

// -------------------------------------------------------------
// WELCOME — New user sign-up
// -------------------------------------------------------------

export async function notifyWelcome(userId: string): Promise<void> {
  const email = await getUserEmail(userId);
  if (!email) return;

  const template = welcomeEmail();
  await sendEmail({ to: email, ...template });
}

// -------------------------------------------------------------
// SUBSCRIPTION CREATED
// -------------------------------------------------------------

export async function notifySubscriptionCreated(
  userId: string,
  planName: string,
  priceInCents: number,
): Promise<void> {
  const email = await getUserEmail(userId);
  if (!email) return;

  const template = subscriptionCreatedEmail(planName, formatZAR(priceInCents));
  await sendEmail({ to: email, ...template });
}

// -------------------------------------------------------------
// SUBSCRIPTION CANCELED
// -------------------------------------------------------------

export async function notifySubscriptionCanceled(
  userId: string,
  planName: string,
  endDate: Date,
): Promise<void> {
  const email = await getUserEmail(userId);
  if (!email) return;

  const formattedDate = endDate.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const template = subscriptionCanceledEmail(planName, formattedDate);
  await sendEmail({ to: email, ...template });
}

// -------------------------------------------------------------
// PAYMENT RECEIVED
// -------------------------------------------------------------

export async function notifyPaymentReceived(
  userId: string,
  amountInCents: number,
  planName: string,
): Promise<void> {
  const email = await getUserEmail(userId);
  if (!email) return;

  const template = paymentReceivedEmail(formatZAR(amountInCents), planName);
  await sendEmail({ to: email, ...template });
}

// -------------------------------------------------------------
// AGENT APPROVED
// -------------------------------------------------------------

export async function notifyAgentApproved(
  developerId: string,
  agentName: string,
  agentSlug: string,
): Promise<void> {
  const email = await getUserEmail(developerId);
  if (!email) return;

  const template = agentApprovedEmail(agentName, agentSlug);
  await sendEmail({ to: email, ...template });
}

// -------------------------------------------------------------
// AGENT REJECTED
// -------------------------------------------------------------

export async function notifyAgentRejected(
  developerId: string,
  agentName: string,
  reason: string,
): Promise<void> {
  const email = await getUserEmail(developerId);
  if (!email) return;

  const template = agentRejectedEmail(agentName, reason);
  await sendEmail({ to: email, ...template });
}

// -------------------------------------------------------------
// EXECUTION FAILED — Notify agent developer
// -------------------------------------------------------------

export async function notifyExecutionFailed(
  developerId: string,
  agentName: string,
  errorMessage: string,
  executionId: string,
): Promise<void> {
  const email = await getUserEmail(developerId);
  if (!email) return;

  const template = executionFailedEmail(agentName, errorMessage, executionId);
  await sendEmail({ to: email, ...template });
}

// -------------------------------------------------------------
// REFERRAL REWARDED
// -------------------------------------------------------------

export async function notifyReferralRewarded(
  userId: string,
  rewardInCents: number,
  referredBusinessName: string,
): Promise<void> {
  const email = await getUserEmail(userId);
  if (!email) return;

  const template = referralRewardedEmail(
    formatZAR(rewardInCents),
    referredBusinessName,
  );
  await sendEmail({ to: email, ...template });
}

// -------------------------------------------------------------
// TEAM INVITE — Send invitation email (Phase 11)
// -------------------------------------------------------------

export async function notifyTeamInvite(
  toEmail: string,
  inviterName: string,
  tenantName: string,
  inviteCode: string,
): Promise<void> {
  const template = teamInviteEmail(inviterName, tenantName, inviteCode);
  await sendEmail({ to: toEmail, ...template });
}

// -------------------------------------------------------------
// Direct send helper (for ad-hoc emails)
// -------------------------------------------------------------

export { sendEmail };
