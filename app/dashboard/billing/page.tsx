import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth.config";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { BillingClient } from "./billing-client";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect("/auth/signin");
  }

  const workspaceId = await getActiveWorkspaceId(session.user.id);

  if (!workspaceId) {
    return <div className="p-8 text-white">No active workspace selected.</div>;
  }

  const now = new Date();
  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const [entitlement, subscription, budgetBalance] = await Promise.all([
    prisma.workspaceEntitlement.findUnique({
      where: { workspaceId }
    }),
    prisma.subscription.findFirst({
      where: { workspaceId },
      orderBy: { currentPeriodEnd: "desc" }
    }),
    prisma.workspaceAiBudgetBalance.findUnique({
      where: {
        workspaceId_period: {
          workspaceId,
          period
        }
      }
    })
  ]);

  const spentUsd = budgetBalance?.spentUsd ? Number(budgetBalance.spentUsd) : 0;
  const reservedUsd = budgetBalance?.reservedUsd ? Number(budgetBalance.reservedUsd) : 0;

  return (
    <BillingClient 
      initialWorkspaceId={workspaceId} 
      entitlement={entitlement}
      subscription={subscription}
      budgetBalance={{ spentUsd, reservedUsd }}
    />
  );
}
