import { NextResponse } from "next/server";
import { StripeBillingProvider } from "@/lib/ai/finops/stripe-billing-provider";
import prisma from "@/lib/prisma"; // Adjust according to your project structure
import Stripe from "stripe";
import { getPlanByPriceId } from "@/lib/ai/finops/plan-catalog";
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

      try {
        switch (event.type) {
          case "customer.subscription.created":
          case "customer.subscription.updated":
          case "customer.subscription.deleted":
          case "customer.subscription.paused":
          case "customer.subscription.resumed": {
            const subscription = (event.data as any).object as Stripe.Subscription;
            const customerId = subscription.customer as string;

            const billingCustomer = await tx.billingCustomer.findUnique({
              where: { stripeCustomerId: customerId }
            });

            if (billingCustomer) {
              const status = subscription.status; // active, past_due, unpaid, canceled, trialing, paused
              const planPriceId = subscription.items?.data?.[0]?.price?.id || "unknown";

              await tx.subscription.upsert({
                where: { stripeSubscriptionId: subscription.id },
                create: {
                  workspaceId: billingCustomer.workspaceId,
                  stripeSubscriptionId: subscription.id,
                  status: status,
                  plan: planPriceId,
                  currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
                  cancelAtPeriodEnd: (subscription as any).cancel_at_period_end
                },
                update: {
                  status: status,
                  plan: planPriceId,
                  currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
                  cancelAtPeriodEnd: (subscription as any).cancel_at_period_end
                }
              });

              // Trigger Entitlement Update based on Subscription State and Plan Catalog
              let budget = 0;
              const planConfig = getPlanByPriceId(planPriceId);
              const maxBudget = planConfig ? planConfig.monthlyAiBudget : 0;

              if (status === "active" || status === "trialing") {
                budget = maxBudget;
              } else if (status === "past_due") {
                budget = Math.max(10, maxBudget * 0.1); // 10% grace period
              } else {
                budget = 0;
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
            const invoice = (event.data as any).object as Stripe.Invoice;
            const customerId = invoice.customer as string;
            
            const billingCustomer = await tx.billingCustomer.findUnique({
              where: { stripeCustomerId: customerId }
            });

            if (billingCustomer) {
              await tx.invoice.upsert({
                where: { stripeInvoiceId: invoice.id },
                create: {
                  workspaceId: billingCustomer.workspaceId,
                  stripeInvoiceId: invoice.id,
                  status: invoice.status || "unknown",
                  currency: invoice.currency,
                  amountDue: invoice.amount_due,
                  amountPaid: invoice.amount_paid,
                  hostedInvoiceUrl: invoice.hosted_invoice_url,
                },
                update: {
                  status: invoice.status || "unknown",
                  amountDue: invoice.amount_due,
                  amountPaid: invoice.amount_paid,
                  hostedInvoiceUrl: invoice.hosted_invoice_url,
                }
              });

              if (event.type === "invoice.payment_failed") {
                // Fetch active Recovery Policy (assumes version 1 is active, or order by latest)
                const policy = await tx.billingRecoveryPolicy.findFirst({ orderBy: { version: 'desc' } });
                const graceDays = policy?.gracePeriodDays || 3;
                
                // Create a Recovery Case and Notification
                const gracePeriod = new Date(Date.now() + graceDays * 24 * 60 * 60 * 1000);
                await tx.billingRecoveryCase.create({
                  data: {
                    workspaceId: billingCustomer.workspaceId,
                    invoiceId: invoice.id,
                    status: "ACTIVE",
                    gracePeriodEnd: gracePeriod
                  }
                });
                
                await tx.billingNotification.create({
                  data: {
                    workspaceId: billingCustomer.workspaceId,
                    invoiceId: invoice.id,
                    type: "PAYMENT_FAILED",
                    recipient: "OWNER",
                    channel: "EMAIL",
                    idempotencyKey: `notif_pf_${invoice.id}_${event.id}`
                  }
                });
              } else if (event.type === "invoice.payment_succeeded") {
                // Resolve any active recovery cases for this workspace
                await tx.billingRecoveryCase.updateMany({
                  where: { 
                    workspaceId: billingCustomer.workspaceId,
                    status: "ACTIVE"
                  },
                  data: {
                    status: "RESOLVED"
                  }
                });
                
                // Enqueue notification for invoice available
                await tx.billingNotification.create({
                  data: {
                    workspaceId: billingCustomer.workspaceId,
                    invoiceId: invoice.id,
                    type: "INVOICE_AVAILABLE",
                    recipient: "OWNER",
                    channel: "EMAIL",
                    idempotencyKey: `notif_is_${invoice.id}_${event.id}`
                  }
                });
              }
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
      } catch (err: any) {
        console.error(`[Stripe Webhook] Failed processing event ${event.id}:`, err);
        // Mark as failed
        await tx.billingEvent.update({
          where: { stripeEventId: event.id },
          data: {
            processingStatus: "failed",
            processedAt: new Date()
          }
        });
        return { message: "Failed", error: err.message || "Unknown error" };
      }

      return { message: "Success" };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Stripe Webhook] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
