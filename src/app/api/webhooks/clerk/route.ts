// =============================================================
// POST /api/webhooks/clerk — Clerk webhook handler
// Handles user.created, user.updated, user.deleted events.
// Verifies webhook signature using Svix.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";

// Clerk webhook event types we handle
interface ClerkEmailAddress {
  email_address: string;
  id: string;
}

interface ClerkUserEvent {
  data: {
    id: string;
    email_addresses: ClerkEmailAddress[];
    primary_email_address_id: string;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
    public_metadata: Record<string, unknown>;
  };
  type: string;
}

export async function POST(request: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.warn("[Clerk Webhook] CLERK_WEBHOOK_SECRET not set — skipping verification in dev");
  }

  // Get the Svix headers
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  const body = await request.text();

  // Verify the webhook signature if secret is configured
  let event: ClerkUserEvent;

  if (WEBHOOK_SECRET && svixId && svixTimestamp && svixSignature) {
    const wh = new Webhook(WEBHOOK_SECRET);
    try {
      event = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as ClerkUserEvent;
    } catch (err) {
      console.error("[Clerk Webhook] Signature verification failed:", err);
      return NextResponse.json(
        { success: false, error: "Invalid webhook signature" },
        { status: 400 },
      );
    }
  } else {
    // In development without webhook secret, parse directly
    try {
      event = JSON.parse(body) as ClerkUserEvent;
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 },
      );
    }
  }

  const { type, data } = event;

  console.log(`[Clerk Webhook] Received event: ${type} for user ${data.id}`);

  try {
    switch (type) {
      case "user.created":
      case "user.updated": {
        const primaryEmail = data.email_addresses.find(
          (e) => e.id === data.primary_email_address_id,
        );

        if (!primaryEmail) {
          console.error("[Clerk Webhook] No primary email found for user", data.id);
          return NextResponse.json({ success: true, message: "No primary email — skipped" });
        }

        // Check if user already exists
        const existingUser = await db.user.findUnique({
          where: { clerkId: data.id },
          select: { id: true, tenantId: true },
        });

        if (existingUser) {
          // Update existing user
          await db.user.update({
            where: { clerkId: data.id },
            data: {
              email: primaryEmail.email_address,
              firstName: data.first_name,
              lastName: data.last_name,
            },
          });
          console.log(`[Clerk Webhook] Updated user ${data.id}`);
        } else if (type === "user.created") {
          // For new users, we DON'T create the DB record here.
          // The onboarding flow will create the user + tenant.
          // This ensures every user goes through onboarding.
          console.log(`[Clerk Webhook] New user ${data.id} — will be created during onboarding`);
        }

        break;
      }

      case "user.deleted": {
        // Soft-delete: deactivate user
        const user = await db.user.findUnique({
          where: { clerkId: data.id },
          select: { id: true },
        });

        if (user) {
          await db.user.update({
            where: { clerkId: data.id },
            data: { isActive: false },
          });
          console.log(`[Clerk Webhook] Deactivated user ${data.id}`);
        }

        break;
      }

      default:
        console.log(`[Clerk Webhook] Unhandled event type: ${type}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Clerk Webhook] Error processing event:", error);
    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
