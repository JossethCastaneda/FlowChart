import prisma from "../prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_mock");

export class BillingNotifier {
  /**
   * Dispatches pending billing notifications (like dunning or invoice available).
   * It uses idempotency keys and retry logic.
   */
  async dispatchPending(batchSize = 20) {
    // Atomic lease similar to outbox dispatcher
    const claimedNotifications = await prisma.$queryRaw<any[]>`
      UPDATE "BillingNotification"
      SET 
        status = 'PROCESSING', 
        attempts = attempts + 1
      WHERE id IN (
        SELECT id FROM "BillingNotification"
        WHERE attempts < 3
        AND (status = 'PENDING' OR status = 'FAILED')
        ORDER BY "createdAt" ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
    `;

    if (!claimedNotifications || claimedNotifications.length === 0) return;

    for (const notif of claimedNotifications) {
      try {
        const workspaceId = notif.workspaceId;
        const profile = await prisma.billingProfile.findUnique({
          where: { workspaceId }
        });

        // Resolve recipient email
        let emailTo = profile?.billingEmail;
        if (!emailTo) {
          // fallback to workspace owner
          const owner = await prisma.workspaceMember.findFirst({
            where: { workspaceId, role: "OWNER" },
            include: { user: true }
          });
          if (owner?.user?.email) {
            emailTo = owner.user.email;
          }
        }

        if (!emailTo) {
          throw new Error("No recipient email found for billing notification");
        }

        // Use Resend idempotency headers
        // Resend officially supports Idempotency-Key
        const emailParams = this.buildEmailTemplate(notif);

        await resend.emails.send({
          from: "billing@flowchart.com",
          to: emailTo,
          subject: emailParams.subject,
          html: emailParams.html,
          headers: {
            "Idempotency-Key": notif.idempotencyKey
          }
        });

        // Mark sent
        await prisma.billingNotification.update({
          where: { id: notif.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
            lastError: null
          }
        });
      } catch (err: any) {
        console.error(`[BillingNotifier] Failed to send ${notif.id}:`, err);
        await prisma.billingNotification.update({
          where: { id: notif.id },
          data: {
            status: "FAILED",
            lastError: err.message || "Unknown error",
          }
        });
      }
    }
  }

  private buildEmailTemplate(notif: any) {
    if (notif.type === "PAYMENT_FAILED") {
      return {
        subject: "Action Required: Your payment to FlowChart failed",
        html: `<p>We were unable to process your recent payment for invoice ${notif.invoiceId}. Please update your payment method to avoid service interruption.</p>`
      };
    } else if (notif.type === "INVOICE_AVAILABLE") {
      return {
        subject: "Your new FlowChart Invoice is available",
        html: `<p>A new invoice (${notif.invoiceId}) is available in your billing portal.</p>`
      };
    }

    return {
      subject: "FlowChart Billing Update",
      html: "<p>You have a new billing update.</p>"
    };
  }
}
