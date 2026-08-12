import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth.config";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { BillingClient } from "./billing-client";
import { redirect } from "next/navigation";

export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect("/auth/signin");
  }

  const workspaceId = await getActiveWorkspaceId(session.user.id);

  return <BillingClient initialWorkspaceId={workspaceId} />;
}
