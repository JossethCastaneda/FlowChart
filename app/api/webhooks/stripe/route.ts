import { NextResponse } from "next/server";
import { StripeBillingProvider } from "@/lib/ai/finops/stripe-billing-provider";
import prisma from "@/lib/prisma"; // Adjust according to your project structure

export async function POST(req: Request) {
  try {
    // Read raw body bytes for Stripe signature verification
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
    }

    const provider = new StripeBillingProvider();
    
    // 1. Verify Signature
    const verification = await provider.verifyWebhook(rawBody, signature);
    
    if (!verification.success || !verification.event) {
      console.error("[Stripe Webhook] Verification failed:", verification.error);
      return NextResponse.json({ error: verification.error }, { status: 400 });
    }

    const { event } = verification;

    // 2. Idempotency Check & Transaction
    // Ensure we don't process the same webhook event twice
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.billingEvent.findUnique({
        where: { stripeEventId: event.id }
      });

      if (existing) {
        return { message: "Already processed" };
      }

      // Record incoming event
      await tx.billingEvent.create({
        data: {
          stripeEventId: event.id,
          eventType: event.type,
          livemode: event.livemode,
          processingStatus: "pending"
        }
      });

      // Handle specific events (e.g., subscription lifecycle)
      const data = event.data as any; // Type narrowed by event type below

      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const subscription = data;
          const customerId = subscription.customer;

          const billingCustomer = await tx.billingCustomer.findUnique({
            where: { stripeCustomerId: customerId }
          });

          if (billingCustomer) {
            await tx.subscription.upsert({
              where: { stripeSubscriptionId: subscription.id },
              create: {
                workspaceId: billingCustomer.workspaceId,
                stripeSubscriptionId: subscription.id,
                status: subscription.status,
                plan: subscription.items?.data?.[0]?.price?.id || "unknown",
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end
              },
              update: {
                status: subscription.status,
                plan: subscription.items?.data?.[0]?.price?.id || "unknown",
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end
              }
            });

            // Trigger Entitlement Update if active
            if (subscription.status === "active") {
              await tx.workspaceEntitlement.upsert({
                where: { workspaceId: billingCustomer.workspaceId },
                create: {
                  workspaceId: billingCustomer.workspaceId,
                  // Default budget values for an active sub
                  monthlyAiBudget: 100.0
                },
                update: {
                  // Keep existing budget or update if plan dictates
                }
              });
            }
          }
          break;
        }
        case "customer.subscription.deleted": {
          const subscription = data;
          await tx.subscription.update({
            where: { stripeSubscriptionId: subscription.id },
            data: { status: "canceled" }
          });
          break;
        }
        default:
          console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
          break;
      }

      // Mark as processed
      await tx.billingEvent.update({
        where: { stripeEventId: event.id },
        data: {
          processingStatus: "processed",
          processedAt: new Date()
        }
      });

      return { message: "Success" };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Stripe Webhook] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
