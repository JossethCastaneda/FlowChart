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
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
        case "customer.subscription.paused":
        case "customer.subscription.resumed": {
          const subscription = data;
          const customerId = subscription.customer;

          const billingCustomer = await tx.billingCustomer.findUnique({
            where: { stripeCustomerId: customerId }
          });

          if (billingCustomer) {
            const status = subscription.status; // active, past_due, unpaid, canceled, trialing, paused
            
            await tx.subscription.upsert({
              where: { stripeSubscriptionId: subscription.id },
              create: {
                workspaceId: billingCustomer.workspaceId,
                stripeSubscriptionId: subscription.id,
                status: status,
                plan: subscription.items?.data?.[0]?.price?.id || "unknown",
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end
              },
              update: {
                status: status,
                plan: subscription.items?.data?.[0]?.price?.id || "unknown",
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end
              }
            });

            // Trigger Entitlement Update based on Subscription State
            let budget = 0;
            if (status === "active" || status === "trialing") {
              budget = 100.0; // Normal active budget
            } else if (status === "past_due") {
              budget = 10.0; // Grace period budget
            } else {
              budget = 0.0; // unpaid, canceled, paused
            }

            await tx.workspaceEntitlement.upsert({
              where: { workspaceId: billingCustomer.workspaceId },
              create: {
                workspaceId: billingCustomer.workspaceId,
                monthlyAiBudget: budget
              },
              update: {
                monthlyAiBudget: budget
              }
            });
          }
          break;
        }

        case "invoice.payment_succeeded":
        case "invoice.payment_failed": {
          const invoice = data;
          const customerId = invoice.customer;
          
          const billingCustomer = await tx.billingCustomer.findUnique({
            where: { stripeCustomerId: customerId }
          });

          if (billingCustomer) {
            await tx.invoice.upsert({
              where: { stripeInvoiceId: invoice.id },
              create: {
                workspaceId: billingCustomer.workspaceId,
                stripeInvoiceId: invoice.id,
                status: invoice.status,
                currency: invoice.currency,
                amountDue: invoice.amount_due,
                amountPaid: invoice.amount_paid,
                hostedInvoiceUrl: invoice.hosted_invoice_url,
              },
              update: {
                status: invoice.status,
                amountDue: invoice.amount_due,
                amountPaid: invoice.amount_paid,
                hostedInvoiceUrl: invoice.hosted_invoice_url,
              }
            });
          }
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
