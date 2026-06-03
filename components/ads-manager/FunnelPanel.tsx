import React, { useMemo } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { findActionValue, fmtNum, fmt$, fmtPct } from "@/lib/ads-metrics";

interface FunnelPanelProps {
  /** Array of insight rows (campaigns/adsets/ads) after filtering */
  data: any[];
  /** Whether to show e-commerce funnel steps (ATC, IC, Purchase) */
  showEcommerce?: boolean;
}

interface FunnelStep {
  key: string;
  label: string;
  value: number;
  cost: number;
  rate: number; // conversion rate from previous step
  rateLabel: string;
  color: string;
  icon: string;
}

function getRateColor(rate: number, threshold: { good: number; ok: number }): string {
  if (rate >= threshold.good) return "var(--emerald)";
  if (rate >= threshold.ok) return "var(--amber)";
  return "var(--red)";
}

export function FunnelPanel({ data, showEcommerce = false }: FunnelPanelProps) {
  const funnel = useMemo(() => {
    // Aggregate all visible rows
    let impressions = 0, clicks = 0, landingViews = 0, leads = 0;
    let addToCart = 0, initiateCheckout = 0, purchases = 0;
    let spend = 0, purchaseValue = 0;

    for (const row of data) {
      const ins = row;
      impressions += parseFloat(ins.impressions || "0");
      clicks += parseFloat(ins.clicks || "0");
      spend += parseFloat(ins.spend || "0");
      landingViews += findActionValue(ins.actions, "landing_page_view");
      leads += findActionValue(ins.actions, "lead") || 
               findActionValue(ins.actions, "onsite_conversion.messaging_conversation_started_7d");
      addToCart += findActionValue(ins.actions, "add_to_cart") || 
                   findActionValue(ins.actions, "omni_add_to_cart");
      initiateCheckout += findActionValue(ins.actions, "initiate_checkout") || 
                          findActionValue(ins.actions, "omni_initiate_checkout");
      purchases += findActionValue(ins.actions, "purchase") || 
                   findActionValue(ins.actions, "omni_purchase");
      
      if (ins.action_values) {
        purchaseValue += findActionValue(ins.action_values, "purchase") ||
                         findActionValue(ins.action_values, "omni_purchase");
      }
    }

    const steps: FunnelStep[] = [
      {
        key: "impressions",
        label: "Impresiones",
        value: impressions,
        cost: spend > 0 && impressions > 0 ? (spend / impressions) * 1000 : 0,
        rate: 100,
        rateLabel: "",
        color: "var(--cyan)",
        icon: "📡",
      },
      {
        key: "clicks",
        label: "Clics",
        value: clicks,
        cost: spend > 0 && clicks > 0 ? spend / clicks : 0,
        rate: impressions > 0 ? (clicks / impressions) * 100 : 0,
        rateLabel: "CTR",
        color: "#60a5fa",
        icon: "🖱️",
      },
      {
        key: "landing_views",
        label: "Landing Views",
        value: landingViews,
        cost: spend > 0 && landingViews > 0 ? spend / landingViews : 0,
        rate: clicks > 0 ? (landingViews / clicks) * 100 : 0,
        rateLabel: "LPV Rate",
        color: "#a78bfa",
        icon: "🌐",
      },
    ];

    if (showEcommerce && (addToCart > 0 || initiateCheckout > 0 || purchases > 0)) {
      if (addToCart > 0) {
        steps.push({
          key: "atc",
          label: "Add to Cart",
          value: addToCart,
          cost: spend > 0 && addToCart > 0 ? spend / addToCart : 0,
          rate: landingViews > 0 ? (addToCart / landingViews) * 100 : (clicks > 0 ? (addToCart / clicks) * 100 : 0),
          rateLabel: "ATC Rate",
          color: "#fb923c",
          icon: "🛒",
        });
      }
      if (initiateCheckout > 0) {
        steps.push({
          key: "ic",
          label: "Checkout",
          value: initiateCheckout,
          cost: spend > 0 && initiateCheckout > 0 ? spend / initiateCheckout : 0,
          rate: addToCart > 0 ? (initiateCheckout / addToCart) * 100 : 0,
          rateLabel: "IC Rate",
          color: "#f472b6",
          icon: "💳",
        });
      }
      if (purchases > 0) {
        steps.push({
          key: "purchase",
          label: "Compras",
          value: purchases,
          cost: spend > 0 && purchases > 0 ? spend / purchases : 0,
          rate: initiateCheckout > 0 ? (purchases / initiateCheckout) * 100 : (addToCart > 0 ? (purchases / addToCart) * 100 : 0),
          rateLabel: "Close Rate",
          color: "#34d399",
          icon: "✅",
        });
      }
    } else if (leads > 0) {
      steps.push({
        key: "leads",
        label: "Leads / Conv.",
        value: leads,
        cost: spend > 0 && leads > 0 ? spend / leads : 0,
        rate: landingViews > 0 ? (leads / landingViews) * 100 : (clicks > 0 ? (leads / clicks) * 100 : 0),
        rateLabel: "Conv Rate",
        color: "#34d399",
        icon: "📋",
      });
    }

    return { steps, spend, purchaseValue };
  }, [data, showEcommerce]);

  if (funnel.steps.length < 2 || funnel.steps[0].value === 0) {
    return null;
  }

  const maxValue = funnel.steps[0].value;

  return (
    <div style={{
      background: "rgba(255,255,255,0.015)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      padding: "16px 20px",
      marginBottom: "16px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#64748b" }}>
            Embudo de Conversión
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "10px", color: "#64748b" }}>
            Gasto total: <strong style={{ color: "var(--foreground)" }}>{fmt$(funnel.spend)}</strong>
          </span>
          {funnel.purchaseValue > 0 && (
            <span style={{ fontSize: "10px", color: "#64748b" }}>
              Revenue: <strong style={{ color: "var(--emerald)" }}>{fmt$(funnel.purchaseValue)}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Funnel Steps */}
      <div style={{ display: "flex", alignItems: "stretch", gap: "0" }}>
        {funnel.steps.map((step, i) => {
          const barHeight = Math.max(12, (step.value / maxValue) * 100);
          const isFirst = i === 0;
          const prevStep = i > 0 ? funnel.steps[i - 1] : null;

          return (
            <React.Fragment key={step.key}>
              {/* Connector arrow with rate */}
              {!isFirst && (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  padding: "0 4px", minWidth: "56px",
                }}>
                  <div style={{
                    fontSize: "11px", fontWeight: 700,
                    color: getRateColor(step.rate, { good: 50, ok: 20 }),
                    marginBottom: "2px",
                  }}>
                    {fmtPct(step.rate)}
                  </div>
                  <div style={{
                    width: "100%", height: "2px",
                    background: `linear-gradient(90deg, ${prevStep?.color || "var(--cyan)"}, ${step.color})`,
                    position: "relative",
                  }}>
                    <div style={{
                      position: "absolute", right: "-3px", top: "-3px",
                      width: 0, height: 0,
                      borderTop: "4px solid transparent", borderBottom: "4px solid transparent",
                      borderLeft: `6px solid ${step.color}`,
                    }} />
                  </div>
                  <div style={{ fontSize: "8px", color: "rgba(148,163,184,0.65)", marginTop: "3px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    {step.rateLabel}
                  </div>
                </div>
              )}

              {/* Step card */}
              <div style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                padding: "10px 8px", borderRadius: "6px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.03)",
                minWidth: "90px",
                transition: "all 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; e.currentTarget.style.borderColor = `${step.color}30`; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.03)"; }}
              >
                {/* Icon */}
                <span style={{ fontSize: "18px", marginBottom: "6px" }}>{step.icon}</span>

                {/* Bar */}
                <div style={{
                  width: "100%", height: "6px", borderRadius: "3px",
                  background: "rgba(255,255,255,0.1)", marginBottom: "8px", overflow: "hidden",
                }}>
                  <div style={{
                    width: `${barHeight}%`, height: "100%", borderRadius: "3px",
                    background: step.color,
                    transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                  }} />
                </div>

                {/* Value */}
                <span style={{
                  fontSize: "16px", fontWeight: 700, color: step.color,
                  fontFamily: "var(--font-display)", letterSpacing: "0.02em",
                }}>
                  {fmtNum(step.value)}
                </span>

                {/* Label */}
                <span style={{
                  fontSize: "9px", color: "#64748b", marginTop: "3px",
                  textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600,
                  textAlign: "center",
                }}>
                  {step.label}
                </span>

                {/* Cost per */}
                {step.cost > 0 && (
                  <span style={{
                    fontSize: "10px", color: "#64748b", marginTop: "4px",
                    fontWeight: 500,
                  }}>
                    {isFirst ? `CPM: ${fmt$(step.cost)}` : `${fmt$(step.cost)} c/u`}
                  </span>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
