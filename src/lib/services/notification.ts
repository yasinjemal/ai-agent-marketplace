// =============================================================
// Notification Service
// Structured email dispatch for key platform events.
// Uses a transport-agnostic design: currently logs to console,
// ready for SendGrid / Resend / AWS SES integration.
// =============================================================

import { db } from "@/lib/db";
import { formatZAR } from "@/lib/utils";

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

type NotificationType =
  | "subscription_created"
  | "subscription_canceled"
  | "payment_received"
  | "agent_approved"
  | "agent_rejected"
  | "execution_failed"
  | "referral_rewarded"
  | "welcome";

// -------------------------------------------------------------
// Email Transport — Swap this for a real provider
// -------------------------------------------------------------

async function sendEmail(payload: EmailPayload): Promise<void> {
  // TODO: Replace with actual email provider (SendGrid, Resend, etc.)
  console.log("[NOTIFICATION] Email queued:", {
    to: payload.to,
    subject: payload.subject,
  });

  // In production, this would be:
  // await resend.emails.send({ from: "noreply@...", ...payload });
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
// WELCOME — New user sign-up
// -------------------------------------------------------------

export async function notifyWelcome(userId: string): Promise<void> {
  const email = await getUserEmail(userId);
  if (!email) return;

  await sendEmail({
    to: email,
    subject: "Welcome to AI Agent Marketplace 🇿🇦",
    html: `
      <h1>Welcome aboard!</h1>
      <p>Your account has been created successfully. You're now part of South Africa's AI Agent Marketplace.</p>
      <p>Here's what you can do:</p>
      <ul>
        <li>Browse and execute AI agents from the marketplace</li>
        <li>Subscribe to a plan that fits your business</li>
        <li>If you're a developer, publish your own agents</li>
      </ul>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/agents">Explore the Marketplace →</a></p>
    `,
    text: "Welcome to AI Agent Marketplace! Your account has been created successfully.",
  });
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

  await sendEmail({
    to: email,
    subject: `Subscription Activated — ${planName} Plan`,
    html: `
      <h1>Your subscription is active! 🎉</h1>
      <p>You've subscribed to the <strong>${planName}</strong> plan at <strong>${formatZAR(priceInCents)}/month</strong>.</p>
      <p>You can manage your subscription from the <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing">billing dashboard</a>.</p>
    `,
    text: `Your ${planName} plan subscription is now active at ${formatZAR(priceInCents)}/month.`,
  });
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

  await sendEmail({
    to: email,
    subject: "Subscription Canceled",
    html: `
      <h1>Your subscription has been canceled</h1>
      <p>Your <strong>${planName}</strong> plan will remain active until <strong>${formattedDate}</strong>.</p>
      <p>You can resubscribe anytime from the <a href="${process.env.NEXT_PUBLIC_APP_URL}/pricing">pricing page</a>.</p>
    `,
    text: `Your ${planName} subscription has been canceled. It remains active until ${formattedDate}.`,
  });
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

  await sendEmail({
    to: email,
    subject: `Payment Received — ${formatZAR(amountInCents)}`,
    html: `
      <h1>Payment Confirmed ✅</h1>
      <p>We've received your payment of <strong>${formatZAR(amountInCents)}</strong> for the <strong>${planName}</strong> plan.</p>
      <p>View your billing history on the <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing">billing dashboard</a>.</p>
    `,
    text: `Payment of ${formatZAR(amountInCents)} received for your ${planName} plan.`,
  });
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

  await sendEmail({
    to: email,
    subject: `Agent Approved — ${agentName}`,
    html: `
      <h1>Your agent has been approved! 🎉</h1>
      <p><strong>${agentName}</strong> is now live on the marketplace.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/agents/${agentSlug}">View your agent listing →</a></p>
    `,
    text: `Your agent "${agentName}" has been approved and is now live on the marketplace.`,
  });
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

  await sendEmail({
    to: email,
    subject: `Agent Needs Changes — ${agentName}`,
    html: `
      <h1>Your agent needs some changes</h1>
      <p><strong>${agentName}</strong> was not approved. Here's why:</p>
      <blockquote style="border-left: 3px solid #e2e8f0; padding-left: 12px; color: #64748b;">
        ${reason}
      </blockquote>
      <p>Please update your agent and resubmit from the <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/agents">developer dashboard</a>.</p>
    `,
    text: `Your agent "${agentName}" needs changes. Reason: ${reason}`,
  });
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

  await sendEmail({
    to: email,
    subject: `Execution Failed — ${agentName}`,
    html: `
      <h1>Agent Execution Failed ⚠️</h1>
      <p>An execution of <strong>${agentName}</strong> has failed.</p>
      <p><strong>Error:</strong> ${errorMessage}</p>
      <p><strong>Execution ID:</strong> <code>${executionId}</code></p>
      <p>Check your agent's endpoint and logs to investigate.</p>
    `,
    text: `Execution of "${agentName}" failed. Error: ${errorMessage}. ID: ${executionId}`,
  });
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

  await sendEmail({
    to: email,
    subject: `Referral Reward — ${formatZAR(rewardInCents)} Credit!`,
    html: `
      <h1>Referral Reward Earned! 🎁</h1>
      <p><strong>${referredBusinessName}</strong> upgraded to a paid plan through your referral.</p>
      <p>You've earned <strong>${formatZAR(rewardInCents)}</strong> in credit.</p>
      <p>Keep sharing your referral link to earn more! <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/referrals">View your referrals →</a></p>
    `,
    text: `You earned ${formatZAR(rewardInCents)} from referring ${referredBusinessName}.`,
  });
}
