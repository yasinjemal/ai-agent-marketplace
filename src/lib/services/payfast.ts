// =============================================================
// PayFast Service
// Handles PayFast payment URL generation, signature creation,
// ITN verification, and server-side validation.
// Ref: https://developers.payfast.co.za/docs
// =============================================================

import crypto from "crypto";
import {
  PAYFAST_SANDBOX_HOST,
  PAYFAST_LIVE_HOST,
  PAYFAST_PROCESS_PATH,
  PAYFAST_VALIDATE_PATH,
  PAYFAST_FREQUENCY_MONTHLY,
  PAYFAST_CYCLES_INDEFINITE,
  PAYFAST_SUBSCRIPTION_TYPE,
  PAYFAST_VALID_HOSTS,
  SUBSCRIPTION_PLANS,
  PLATFORM_COMMISSION_RATE,
} from "@/constants";
import type { PlanId } from "@/constants";

// -------------------------------------------------------------
// Configuration
// -------------------------------------------------------------

function getPayFastConfig() {
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const passphrase = process.env.PAYFAST_PASSPHRASE ?? "";
  const isSandbox = process.env.NODE_ENV !== "production";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!merchantId || !merchantKey) {
    throw new Error("PayFast merchant credentials are not configured");
  }

  const host = isSandbox ? PAYFAST_SANDBOX_HOST : PAYFAST_LIVE_HOST;

  return { merchantId, merchantKey, passphrase, host, appUrl, isSandbox };
}

// -------------------------------------------------------------
// Signature Generation
// PayFast requires an MD5 hash of URL-encoded key=value pairs
// concatenated with & in the EXACT order of form fields.
// Passphrase is appended at the end before hashing.
// -------------------------------------------------------------

/**
 * Generate an MD5 signature for PayFast form data.
 * Fields must be in form-field order (NOT alphabetical).
 * Empty string values are excluded.
 */
export function generateSignature(
  data: Record<string, string>,
  passphrase: string,
): string {
  // Build the parameter string from non-empty values
  const paramString = Object.entries(data)
    .filter(([, value]) => value !== "")
    .map(([key, value]) => `${key}=${encodeURIComponent(value.trim()).replace(/%20/g, "+")}`)
    .join("&");

  // Append passphrase if set
  const stringToHash = passphrase
    ? `${paramString}&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, "+")}`
    : paramString;

  return crypto.createHash("md5").update(stringToHash).digest("hex");
}

// -------------------------------------------------------------
// Payment URL Generation
// Creates the full PayFast checkout URL for a subscription.
// -------------------------------------------------------------

interface CheckoutParams {
  /** Internal payment ID for tracking */
  paymentId: string;
  /** Plan to subscribe to */
  planId: PlanId;
  /** Tenant ID (passed through as custom_str1) */
  tenantId: string;
  /** User ID (passed through as custom_str2) */
  userId: string;
  /** Customer email */
  email: string;
  /** Customer first name */
  firstName?: string;
  /** Customer last name */
  lastName?: string;
}

export function generateCheckoutUrl(params: CheckoutParams): string {
  const config = getPayFastConfig();
  const plan = SUBSCRIPTION_PLANS[params.planId];

  if (!plan || plan.priceInCents === 0) {
    throw new Error(`Invalid plan for checkout: ${params.planId}`);
  }

  // Convert cents to Rands with 2 decimal places
  const amountInRands = (plan.priceInCents / 100).toFixed(2);

  // Build form data in PayFast's required field order
  const data: Record<string, string> = {
    // Merchant details
    merchant_id: config.merchantId,
    merchant_key: config.merchantKey,
    return_url: `${config.appUrl}/dashboard/billing?status=success`,
    cancel_url: `${config.appUrl}/dashboard/billing?status=cancelled`,
    notify_url: `${config.appUrl}/api/webhooks/payfast`,

    // Customer details
    name_first: params.firstName ?? "",
    name_last: params.lastName ?? "",
    email_address: params.email,

    // Transaction details
    m_payment_id: params.paymentId,
    amount: amountInRands,
    item_name: `AI Marketplace — ${plan.name} Plan`,
    item_description: plan.description,

    // Custom passthrough variables for ITN processing
    custom_str1: params.tenantId,
    custom_str2: params.userId,
    custom_str3: params.planId,

    // Recurring billing (subscription)
    subscription_type: String(PAYFAST_SUBSCRIPTION_TYPE),
    frequency: String(PAYFAST_FREQUENCY_MONTHLY),
    cycles: String(PAYFAST_CYCLES_INDEFINITE),
    recurring_amount: amountInRands,
  };

  // Generate and append signature
  const signature = generateSignature(data, config.passphrase);
  data.signature = signature;

  // Build the full URL with query params
  const processUrl = `https://${config.host}${PAYFAST_PROCESS_PATH}`;
  const queryString = Object.entries(data)
    .filter(([, value]) => value !== "")
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

  return `${processUrl}?${queryString}`;
}

// -------------------------------------------------------------
// ITN Signature Verification
// Reconstructs the parameter string from ITN data (excluding
// the signature field) and compares the MD5 hash.
// -------------------------------------------------------------

/**
 * Verify the signature of an incoming ITN payload.
 * Returns true if the signature matches.
 */
export function verifyItnSignature(
  itnData: Record<string, string>,
): boolean {
  const config = getPayFastConfig();
  const receivedSignature = itnData.signature ?? "";

  // Build param string from all fields EXCEPT signature, in received order
  const paramString = Object.entries(itnData)
    .filter(([key, value]) => key !== "signature" && value !== "")
    .map(([key, value]) => `${key}=${encodeURIComponent(value.trim()).replace(/%20/g, "+")}`)
    .join("&");

  const stringToHash = config.passphrase
    ? `${paramString}&passphrase=${encodeURIComponent(config.passphrase.trim()).replace(/%20/g, "+")}`
    : paramString;

  const expectedSignature = crypto.createHash("md5").update(stringToHash).digest("hex");

  return receivedSignature === expectedSignature;
}

// -------------------------------------------------------------
// Payment Amount Verification
// Compares the ITN gross amount with what we expected.
// -------------------------------------------------------------

/**
 * Verify the payment amount matches what we expected.
 * Tolerance of R0.01 to handle floating-point rounding.
 */
export function verifyPaymentAmount(
  expectedCents: number,
  receivedGross: string,
): boolean {
  const expectedRands = expectedCents / 100;
  const receivedRands = parseFloat(receivedGross);
  return Math.abs(expectedRands - receivedRands) <= 0.01;
}

// -------------------------------------------------------------
// Server Confirmation
// POSTs the ITN data back to PayFast to validate it.
// Returns true if PayFast responds with "VALID".
// -------------------------------------------------------------

/**
 * Validate the ITN with PayFast's server.
 * This is the final security check (check 4 of 4).
 */
export async function validateWithPayFastServer(
  itnData: Record<string, string>,
): Promise<boolean> {
  const config = getPayFastConfig();
  const validateUrl = `https://${config.host}${PAYFAST_VALIDATE_PATH}`;

  // Build the param string (all fields except signature)
  const paramString = Object.entries(itnData)
    .filter(([key, value]) => key !== "signature" && value !== "")
    .map(([key, value]) => `${key}=${encodeURIComponent(value.trim()).replace(/%20/g, "+")}`)
    .join("&");

  try {
    const response = await fetch(validateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: paramString,
    });

    const result = await response.text();
    return result.trim() === "VALID";
  } catch (error) {
    console.error("[PayFast] Server validation failed:", error);
    return false;
  }
}

// -------------------------------------------------------------
// Commission Calculation
// Platform takes 20% of each payment.
// -------------------------------------------------------------

/**
 * Calculate platform commission from a payment amount in cents.
 */
export function calculateCommission(amountInCents: number): number {
  return Math.round(amountInCents * PLATFORM_COMMISSION_RATE);
}

// -------------------------------------------------------------
// PayFast Host Validation
// Verifies that the ITN originates from a valid PayFast domain.
// Note: In production, also validate the source IP against
// PayFast's published IP ranges.
// -------------------------------------------------------------

/**
 * Check if a hostname is a valid PayFast server.
 */
export function isValidPayFastHost(hostname: string): boolean {
  return (PAYFAST_VALID_HOSTS as readonly string[]).includes(hostname);
}
