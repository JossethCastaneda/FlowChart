import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth.config";
import { StripeBillingProvider } from "@/lib/ai/finops/stripe-billing-provider";
import prisma from "@/lib/prisma"; // Adjust

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    // Verify user belongs to workspace and is OWNER/ADMIN (simplified for example)
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

    // Fetch the billing customer
    const billingCustomer = await prisma.billingCustomer.findUnique({
      where: { workspaceId }
    });

    if (!billingCustomer) {
      return NextResponse.json({ error: "No billing customer found for this workspace" }, { status: 404 });
    }

    const provider = new StripeBillingProvider();
    
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing`;
    
    // Server-side boundary enforces that they can only request portal for THEIR own stripeCustomerId
    const portalUrl = await provider.createCustomerPortalSession(billingCustomer.stripeCustomerId, returnUrl);

    return NextResponse.json({ url: portalUrl });
  } catch (error: any) {
    console.error("[Billing Portal] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
