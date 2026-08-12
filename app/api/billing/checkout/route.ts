import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth.config";
import { StripeBillingProvider } from "@/lib/ai/finops/stripe-billing-provider";
import prisma from "@/lib/prisma";

import { getPlan } from "@/lib/ai/finops/plan-catalog";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { workspaceId, plan } = body;

    if (!workspaceId || !plan) {
      return NextResponse.json({ error: "workspaceId and plan are required" }, { status: 400 });
    }

    const planConfig = getPlan(plan);
    const stripePriceId = planConfig.stripePriceId;

    // Verify user belongs to workspace and is OWNER/ADMIN
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: session.user.id
        }
      }
    });

    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    // Ensure they have a billing customer
    let billingCustomer = await prisma.billingCustomer.findUnique({
      where: { workspaceId }
    });

    const provider = new StripeBillingProvider();

    if (!billingCustomer) {
      // Lazy creation of billing customer before checkout
      const stripeCustomerId = await provider.createCustomer(workspaceId);
      billingCustomer = await prisma.billingCustomer.create({
        data: {
          workspaceId,
          stripeCustomerId
        }
      });
    }
    
    const checkoutUrl = await provider.createCheckout(workspaceId, billingCustomer.stripeCustomerId, stripePriceId);

    return NextResponse.json({ url: checkoutUrl });
  } catch (error: any) {
    console.error("[Billing Checkout] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
