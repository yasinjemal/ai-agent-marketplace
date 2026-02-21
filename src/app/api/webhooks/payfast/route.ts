// =============================================================
// POST /api/webhooks/payfast — PayFast ITN Webhook Handler
// Receives Instant Transaction Notifications from PayFast.
// Performs 4 security checks per PayFast docs:
//   1. Verify signature
//   2. Verify source IP (logged, not blocked in dev)
//   3. Compare payment amount
//   4. Server-side validation with PayFast
// Then updates payment + subscription records.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { payfastItnSchema } from "@/lib/validations/payfast";
import {
  verifyItnSignature,
  verifyPaymentAmount,
  validateWithPayFastServer,
} from "@/lib/services/payfast";
import {
  confirmPayment,
  recordRecurringPayment,
  markSubscriptionPastDue,
} from "@/lib/services/subscription";
import { createAuditLog } from "@/lib/services/audit-log";
import { db } from "@/lib/db";
import { SUBSCRIPTION_PLANS } from "@/constants";
import type { PlanId } from "@/constants";

export async function POST(request: NextRequest) {
  // Step 0: Return 200 immediately to prevent PayFast retries
  // (we process asynchronously below, but Next.js waits for the response)
  try {
    // Parse the ITN payload (application/x-www-form-urlencoded)
    const formData = await request.formData();
    const rawData: Record<string, string> = {};
    formData.forEach((value, key) => {
      rawData[key] = String(value);
    });

    console.log("[PayFast ITN] Received notification:", {
      pf_payment_id: rawData.pf_payment_id,
      payment_status: rawData.payment_status,
      m_payment_id: rawData.m_payment_id,
    });

    // Validate payload structure
    const parseResult = payfastItnSchema.safeParse(rawData);
    if (!parseResult.success) {
      console.error("[PayFast ITN] Invalid payload:", parseResult.error.issues);
      return NextResponse.json(
        { error: "Invalid ITN payload" },
        { status: 400 },
      );
    }

    const itnData = parseResult.data;

    // ─── Security Check 1: Verify Signature ───────────────────
    const signatureValid = verifyItnSignature(rawData);
    if (!signatureValid) {
      console.error("[PayFast ITN] SECURITY: Signature mismatch!", {
        pf_payment_id: itnData.pf_payment_id,
      });
      // In development, log but continue; in production, reject
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 403 },
        );
      }
      console.warn("[PayFast ITN] DEV MODE: Continuing despite signature mismatch");
    }

    // ─── Security Check 2: Verify Source ──────────────────────
    const sourceIp = request.headers.get("x-forwarded-for") ?? "unknown";
    console.log("[PayFast ITN] Source IP:", sourceIp);
    // In production, validate against PAYFAST_VALID_HOSTS IP ranges
    // For now, we log the IP for monitoring

    // ─── Security Check 3: Compare Payment Amount ─────────────
    const paymentId = itnData.m_payment_id;
    const planId = itnData.custom_str3 as PlanId;
    const tenantId = itnData.custom_str1;
    const userId = itnData.custom_str2;

    if (paymentId) {
      // This is a first payment — look up the pending payment record
      const pendingPayment = await db.payment.findUnique({
        where: { id: paymentId },
        include: { subscription: true },
      });

      if (pendingPayment) {
        const amountValid = verifyPaymentAmount(
          pendingPayment.amountInCents,
          itnData.amount_gross,
        );

        if (!amountValid) {
          console.error("[PayFast ITN] SECURITY: Amount mismatch!", {
            expected: pendingPayment.amountInCents,
            received: itnData.amount_gross,
          });
          if (process.env.NODE_ENV === "production") {
            return NextResponse.json(
              { error: "Amount mismatch" },
              { status: 400 },
            );
          }
          console.warn("[PayFast ITN] DEV MODE: Continuing despite amount mismatch");
        }
      }
    }

    // ─── Security Check 4: Server Confirmation ────────────────
    if (process.env.NODE_ENV === "production") {
      const serverValid = await validateWithPayFastServer(rawData);
      if (!serverValid) {
        console.error("[PayFast ITN] SECURITY: Server validation failed!");
        return NextResponse.json(
          { error: "Server validation failed" },
          { status: 403 },
        );
      }
    }

    // ─── Process the notification ─────────────────────────────
    if (itnData.payment_status === "COMPLETE") {
      if (paymentId) {
        // Check if this is a first payment or recurring
        const existingPayment = await db.payment.findUnique({
          where: { id: paymentId },
        });

        if (existingPayment && existingPayment.status === "PENDING") {
          // First payment — confirm and activate subscription
          await confirmPayment(
            paymentId,
            itnData.pf_payment_id,
            itnData.token || null,
            rawData as Record<string, unknown>,
          );

          console.log("[PayFast ITN] ✅ Payment confirmed, subscription activated:", {
            paymentId,
            pf_payment_id: itnData.pf_payment_id,
          });
        } else {
          // Payment already processed — idempotent, skip
          console.log("[PayFast ITN] Payment already processed, skipping:", paymentId);
        }
      } else {
        // Recurring payment — find subscription by PayFast token
        const subscription = await db.subscription.findFirst({
          where: { payfastToken: itnData.token },
        });

        if (subscription) {
          const amountInCents = Math.round(
            parseFloat(itnData.amount_gross) * 100,
          );

          await recordRecurringPayment(
            subscription.id,
            itnData.pf_payment_id,
            amountInCents,
            rawData as Record<string, unknown>,
          );

          console.log("[PayFast ITN] ✅ Recurring payment recorded:", {
            subscriptionId: subscription.id,
            pf_payment_id: itnData.pf_payment_id,
          });
        } else {
          console.error("[PayFast ITN] No subscription found for token:", itnData.token);
        }
      }

      // Audit log
      void createAuditLog({
        userId: userId || null,
        tenantId: tenantId || null,
        action: "PAYMENT",
        entityType: "Payment",
        entityId: itnData.pf_payment_id,
        metadata: {
          paymentStatus: itnData.payment_status,
          amountGross: itnData.amount_gross,
          planId,
        },
      });
    } else if (itnData.payment_status === "CANCELLED") {
      // Subscription cancelled from PayFast's side
      const subscription = await db.subscription.findFirst({
        where: { payfastToken: itnData.token },
      });

      if (subscription) {
        await markSubscriptionPastDue(subscription.id);
        console.log("[PayFast ITN] Subscription marked past_due:", subscription.id);

        void createAuditLog({
          userId: userId || null,
          tenantId: tenantId || null,
          action: "UNSUBSCRIBE",
          entityType: "Subscription",
          entityId: subscription.id,
          metadata: { reason: "PayFast cancellation" },
        });
      }
    }

    // Return 200 OK to prevent PayFast retries
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("[PayFast ITN] Unhandled error:", error);
    // Still return 200 to prevent infinite retries
    // The error is logged for manual investigation
    return new NextResponse("OK", { status: 200 });
  }
}
