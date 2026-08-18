"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function BillingClient({ 
  initialWorkspaceId,
  entitlement,
  subscription,
  budgetBalance
}: { 
  initialWorkspaceId: string | null;
  entitlement: any;
  subscription: any;
  budgetBalance: { spentUsd: number; reservedUsd: number };
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(initialWorkspaceId);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  useEffect(() => {
    if (initialWorkspaceId) {
      setWorkspaceId(initialWorkspaceId);
    }
  }, [initialWorkspaceId]);

  const handleManageBilling = async () => {
    if (!workspaceId) return;
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to open billing portal");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPortal(false);
    }
  };

  const handleSubscribe = async (plan: string) => {
    if (!workspaceId) return;
    setLoadingCheckout(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to open checkout");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCheckout(false);
    }
  };

  if (!session) return <div>Loading...</div>;

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Commercial & Financial OS</h1>
          <p className="text-gray-400 mt-1">Manage your subscriptions, modules, AI fleet capacity, and invoices.</p>
        </div>
        <button
          onClick={handleManageBilling}
          disabled={loadingPortal}
          className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50 border border-zinc-700"
        >
          {loadingPortal ? "Redirecting..." : "Stripe Customer Portal"}
        </button>
      </div>
      
      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-sm text-zinc-200 col-span-1">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-2">Current Plan</h2>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-bold text-white">{subscription?.saasPlan || "Starter"}</span>
            <span className="text-zinc-500 text-sm">/ {subscription?.billingPeriod || "month"}</span>
          </div>
          <div className="space-y-2 text-sm text-zinc-400">
            <p>Status: <span className={`font-medium ${subscription?.status === 'ACTIVE' ? 'text-green-400' : 'text-zinc-300'}`}>{subscription?.status || "Free"}</span></p>
            <p>Next invoice: {subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "N/A"}</p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-sm text-zinc-200 col-span-1 md:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-2">Current Period AI Billing</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-zinc-400 text-xs mb-1">Period Start</p>
              <p className="text-sm text-white">{subscription?.currentPeriodStart ? new Date(subscription.currentPeriodStart).toLocaleDateString() : "N/A"}</p>
            </div>
            <div>
              <p className="text-zinc-400 text-xs mb-1">Period End (Cutoff)</p>
              <p className="text-sm text-white">{subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "N/A"}</p>
            </div>
            <div>
              <p className="text-zinc-400 text-xs mb-1">Included Allowance</p>
              <p className="text-sm text-white">${Number(entitlement?.monthlyAiBudget || 0).toFixed(2)} USD</p>
            </div>
            <div>
              <p className="text-zinc-400 text-xs mb-1">Uninvoiced Subtotal</p>
              <p className="text-sm font-bold text-amber-500">${budgetBalance.spentUsd.toFixed(2)} USD</p>
            </div>
          </div>
          
          <div className="bg-zinc-800 p-4 rounded-md mb-4 flex justify-between items-center text-sm">
             <div>
               <p className="text-zinc-400">Overage</p>
               <p className="text-white">${Math.max(0, budgetBalance.spentUsd - Number(entitlement?.monthlyAiBudget || 0)).toFixed(2)} USD</p>
             </div>
             <div>
               <p className="text-zinc-400">Tax Estimate (16%)</p>
               <p className="text-white">${(budgetBalance.spentUsd * 0.16).toFixed(2)} USD</p>
             </div>
             <div className="text-right">
               <p className="text-zinc-400">Estimated Total</p>
               <p className="text-lg font-bold text-white">${(budgetBalance.spentUsd * 1.16).toFixed(2)} USD</p>
             </div>
          </div>

          <div className="mt-2">
             <div className="w-full bg-zinc-800 rounded-full h-2 mb-2 relative overflow-hidden">
                <div 
                  className="bg-blue-600 h-full absolute left-0" 
                  style={{ width: `${Math.min(100, (budgetBalance.spentUsd / Math.max(1, Number(entitlement?.monthlyAiBudget || 10))) * 100)}%` }}
                ></div>
                <div 
                  className="bg-amber-500 h-full absolute opacity-50" 
                  style={{ 
                    left: `${Math.min(100, (budgetBalance.spentUsd / Math.max(1, Number(entitlement?.monthlyAiBudget || 10))) * 100)}%`,
                    width: `${Math.min(100, (budgetBalance.reservedUsd / Math.max(1, Number(entitlement?.monthlyAiBudget || 10))) * 100)}%` 
                  }}
                ></div>
             </div>
             <p className="text-xs text-zinc-500">Includes uninvoiced eligible ledger entries for this period. Reserved tasks: ${budgetBalance.reservedUsd.toFixed(2)} USD.</p>
          </div>
        </div>
      </div>

      {/* Plans & Modules section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-white mb-6">Upgrade Plan & Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {["STARTER", "PRO", "AGENCY", "ENTERPRISE"].map((planName) => (
            <div key={planName} className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg flex flex-col">
              <h3 className="text-lg font-bold text-white mb-2">{planName}</h3>
              <p className="text-zinc-400 text-sm mb-6 flex-grow">
                {planName === "STARTER" && "Essential tools for individuals. (Briefs, Analytics locked)"}
                {planName === "PRO" && "Advanced tools for professionals. (Includes Briefs & Reporting)"}
                {planName === "AGENCY" && "Scale your marketing operations. (Includes Aria & Advanced Models)"}
                {planName === "ENTERPRISE" && "Custom solutions for large teams. (All Modules Included)"}
              </p>
              <button
                onClick={() => handleSubscribe(planName.toLowerCase())}
                disabled={loadingCheckout}
                className="w-full bg-white hover:bg-zinc-200 text-black font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
              >
                {loadingCheckout ? "..." : "Select Plan"}
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
