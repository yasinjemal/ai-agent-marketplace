// =============================================================
// PayFast Zod Validation Schemas
// Validates ITN (Instant Transaction Notification) payloads.
// =============================================================

import { z } from "zod";

// -------------------------------------------------------------
// ITN Payload — received from PayFast via POST to notify_url
// All fields arrive as strings from the form POST.
// -------------------------------------------------------------

export const payfastItnSchema = z.object({
  // Merchant details
  merchant_id: z.string().min(1),

  // Transaction details
  m_payment_id: z.string().optional().default(""),
  pf_payment_id: z.string().min(1),
  payment_status: z.enum(["COMPLETE", "CANCELLED"]),
  item_name: z.string().min(1),
  item_description: z.string().optional().default(""),
  amount_gross: z.string().min(1),
  amount_fee: z.string().optional().default(""),
  amount_net: z.string().optional().default(""),

  // Custom passthrough variables
  custom_str1: z.string().optional().default(""), // tenantId
  custom_str2: z.string().optional().default(""), // userId
  custom_str3: z.string().optional().default(""), // planId
  custom_str4: z.string().optional().default(""),
  custom_str5: z.string().optional().default(""),
  custom_int1: z.string().optional().default(""),
  custom_int2: z.string().optional().default(""),
  custom_int3: z.string().optional().default(""),
  custom_int4: z.string().optional().default(""),
  custom_int5: z.string().optional().default(""),

  // Customer details
  name_first: z.string().optional().default(""),
  name_last: z.string().optional().default(""),
  email_address: z.string().optional().default(""),

  // Security
  signature: z.string().optional().default(""),

  // Recurring billing
  token: z.string().optional().default(""),
  billing_date: z.string().optional().default(""),
});

export type PayFastITNData = z.infer<typeof payfastItnSchema>;
