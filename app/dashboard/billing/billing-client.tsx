"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function BillingClient({ 
  initialWorkspaceId,
  entitlement,
  subscription,
  totalUsage
}: { 
  initialWorkspaceId: string | null;
  entitlement: any;
  subscription: any;
  totalUsage: number;
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
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight text-white">Billing & Usage</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Subscription Info */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg shadow-sm text-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-white">Current Plan: {subscription ? subscription.plan : "Free"}</h2>
          <p className="text-gray-400 mb-6">Status: <span className="font-bold text-white">{subscription ? subscription.status : "Inactive"}</span></p>
          <p className="text-gray-400 mb-6">Manage your subscription, payment methods, and invoices securely via Stripe.</p>
          
          <div className="space-y-4">
            <button
              onClick={handleManageBilling}
              disabled={loadingPortal}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
            >
              {loadingPortal ? "Opening Portal..." : "Manage Billing"}
            </button>
            <div className="text-sm text-gray-500">
              * Requires an active subscription or previous billing setup.
            </div>
          </div>
        </div>

        {/* Upgrade Options */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg shadow-sm text-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-white">Upgrade Plan</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-gray-800 p-4 rounded border border-gray-700">
              <div>
                <p className="font-medium text-white">Pro Plan</p>
                <p className="text-sm text-gray-400">$100/mo included AI budget</p>
              </div>
              <button
                onClick={() => handleSubscribe("pro")}
                disabled={loadingCheckout}
                className="bg-gray-200 hover:bg-white text-black font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
              >
                {loadingCheckout ? "..." : "Subscribe"}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Usage section placeholder */}
      <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg shadow-sm text-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-white">AI Consumption</h2>
        <p className="text-gray-400 mb-4">View your unbilled AI usage before it synchronizes to your invoice.</p>
        <div className="bg-gray-800 p-4 rounded border border-gray-700 text-sm text-gray-300">
          <p>Total AI Usage Generated: <span className="text-white font-bold">{totalUsage.toFixed(2)} Credits</span></p>
          <p>Monthly Budget: <span className="text-white font-bold">{entitlement ? entitlement.monthlyAiBudget : 0} Credits</span></p>
        </div>
      </div>
    </div>
  );
}
