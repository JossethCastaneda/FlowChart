"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, ArrowRight, TrendingUp, TrendingDown, Globe, BarChart3 } from "lucide-react";
import { MetaIcon, GoogleAdsIcon as GoogleIcon, TikTokIcon as TiktokIcon } from "@/components/ui/BrandIcons";
import Link from "next/link";

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const start = 0;
    const end = value;
    const duration = 900;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value]);
  return <>{prefix}{display.toLocaleString("es-MX")}{suffix}</>;
}



function HeroMetric({ label, value, prevValue, prefix = "", suffix = "", isCurrency = false, invertTrend = false }: any) {
  const diff = value - prevValue;
  const pct = prevValue > 0 ? (diff / prevValue) * 100 : 0;
  const isPositive = diff >= 0;
  const isGood = invertTrend ? !isPositive : isPositive;
  const color = isGood ? "var(--fc-success)" : "var(--fc-danger)";

  return (
    <div className="flex flex-col bg-card border rounded-2xl p-5 relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
      <div className="flex items-end gap-3">
        <span className="font-display text-3xl font-extrabold leading-none">
          {prefix}<AnimatedNumber value={value} />{suffix}
        </span>
        <span className="flex items-center gap-1 text-xs font-bold mb-1" style={{ color }}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {Math.abs(pct).toFixed(1)}%
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-2">Vs. periodo anterior ({prefix}{isCurrency ? prevValue.toLocaleString("es-MX") : prevValue}{suffix})</p>
    </div>
  );
}

export function OmnichannelHub({ project, dateStart, dateEnd, preset }: any) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  
  // Extraemos las plataformas conectadas reales del proyecto
  const connectedPlatforms = project?.channels?.map((c: any) => c.platformId) || [];
  const hasMeta = connectedPlatforms.includes("meta");
  const hasGoogle = connectedPlatforms.includes("google");
  const hasTikTok = connectedPlatforms.includes("tiktok");

  useEffect(() => {
    // Aquí implementaremos la llamada real al Async ETL en el futuro.
    // Por ahora proveemos los datos simulados basados en las plataformas reales.
    setTimeout(() => {
      setMetrics({
        global: {
          spend: 1450230, prevSpend: 1300000,
          revenue: 4230100, prevRevenue: 3800000,
          roas: 2.91, prevRoas: 2.92,
          cac: 345, prevCac: 380,
        },
        platforms: {
          meta: hasMeta ? { spend: 700000, conv: 1200, roas: 3.2, cac: 583 } : { spend: 0, conv: 0, roas: 0, cac: 0 },
          google: hasGoogle ? { spend: 600000, conv: 2100, roas: 2.8, cac: 285 } : { spend: 0, conv: 0, roas: 0, cac: 0 },
          tiktok: hasTikTok ? { spend: 150230, conv: 940, roas: 2.1, cac: 159 } : { spend: 0, conv: 0, roas: 0, cac: 0 },
        },
        campaigns: [
          { id: 1, name: "Search - Brand - Q3", plat: "google", spend: 150000, roas: 4.1, cpa: 120, status: "active" },
          { id: 2, name: "Adv+ Catalog Sales", plat: "meta", spend: 320000, roas: 3.8, cpa: 210, status: "active" },
          { id: 3, name: "PMax - All Products", plat: "google", spend: 450000, roas: 2.4, cpa: 350, status: "active" },
          { id: 4, name: "UGC Retargeting", plat: "tiktok", spend: 150230, roas: 2.1, cpa: 159, status: "warning" },
          { id: 5, name: "Lookalike 1% Buyers", plat: "meta", spend: 380000, roas: 2.7, cpa: 650, status: "danger" },
        ].filter(c => connectedPlatforms.includes(c.plat))
      });
      setLoading(false);
    }, 800);
  }, [project, dateStart, dateEnd, preset, hasMeta, hasGoogle, hasTikTok, connectedPlatforms]);

  if (loading || !metrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
        <div className="relative">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          <div className="absolute -inset-2 rounded-full border border-cyan-500/20 animate-pulse" />
        </div>
        <p className="font-display text-xs tracking-[0.2em] text-cyan-500 uppercase">Sincronizando Omnicanal...</p>
      </div>
    );
  }

  const displayMetrics = metrics.global;
  const totalPlatformSpend = metrics.platforms.meta.spend + metrics.platforms.google.spend + metrics.platforms.tiktok.spend;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 mt-4">
      
      {/* ── HERO METRICS (Bento Box Row 1) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroMetric label="Inversión Total" value={displayMetrics.spend} prevValue={displayMetrics.prevSpend} prefix="$" isCurrency />
        <HeroMetric label="Ingresos Atribuidos" value={displayMetrics.revenue} prevValue={displayMetrics.prevRevenue} prefix="$" isCurrency />
        <HeroMetric label="ROAS Global" value={displayMetrics.roas} prevValue={displayMetrics.prevRoas} suffix="x" />
        <HeroMetric label="CPA / CAC Medio" value={displayMetrics.cac} prevValue={displayMetrics.prevCac} prefix="$" isCurrency invertTrend />
      </div>

      {/* ── MIDDLE SECTION (Bento Box Row 2) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Chart (Takes 2/3 width) */}
        <div className="lg:col-span-2 bg-card border rounded-2xl p-6 relative overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Evolución de Ingresos vs Gasto</h2>
              <p className="text-xs text-muted-foreground mt-1">Comparativa unificada de canales</p>
            </div>
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
          </div>
          
          <div className="flex-1 flex items-center justify-center min-h-[200px] border border-dashed border-muted-foreground/20 rounded-xl bg-muted/10 relative overflow-hidden">
             {/* Simulated Chart Bars for Aesthetics */}
             <div className="absolute inset-0 flex items-end justify-between p-4 px-8 opacity-40">
                {[40, 60, 30, 80, 50, 90, 70, 100, 80, 60, 90, 70].map((h, i) => (
                  <div key={i} className="flex flex-col justify-end gap-1 w-6 h-full">
                    <div className="w-full bg-cyan-500 rounded-t-sm transition-all duration-1000" style={{ height: `${h}%` }} />
                    <div className="w-full bg-blue-600 rounded-b-sm transition-all duration-1000" style={{ height: `${h * 0.4}%` }} />
                  </div>
                ))}
             </div>
             <p className="text-sm font-medium text-muted-foreground/80 z-10 bg-background/80 px-4 py-2 rounded-full border backdrop-blur-sm">
               Próximamente: Integración Async ETL
             </p>
          </div>
        </div>

        {/* Share of Spend (Takes 1/3 width) */}
        <div className="bg-card border rounded-2xl p-6 relative overflow-hidden flex flex-col">
          <div className="mb-6">
            <h2 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Distribución de Inversión</h2>
            <p className="text-xs text-muted-foreground mt-1">Share of Spend por canal</p>
          </div>
          
          <div className="flex-1 flex flex-col gap-6 justify-center">
            {hasMeta && (
              <div>
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="flex items-center gap-1.5"><MetaIcon width={16} height={16} /> Meta Ads</span>
                  <span>{totalPlatformSpend > 0 ? ((metrics.platforms.meta.spend / totalPlatformSpend) * 100).toFixed(1) : 0}%</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${totalPlatformSpend > 0 ? (metrics.platforms.meta.spend / totalPlatformSpend) * 100 : 0}%` }} />
                </div>
              </div>
            )}
            
            {hasGoogle && (
              <div>
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="flex items-center gap-1.5"><GoogleIcon width={16} height={16} /> Google Ads</span>
                  <span>{totalPlatformSpend > 0 ? ((metrics.platforms.google.spend / totalPlatformSpend) * 100).toFixed(1) : 0}%</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${totalPlatformSpend > 0 ? (metrics.platforms.google.spend / totalPlatformSpend) * 100 : 0}%` }} />
                </div>
              </div>
            )}
            
            {hasTikTok && (
              <div>
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="flex items-center gap-1.5"><TiktokIcon width={16} height={16} /> TikTok Ads</span>
                  <span>{totalPlatformSpend > 0 ? ((metrics.platforms.tiktok.spend / totalPlatformSpend) * 100).toFixed(1) : 0}%</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden border">
                  <div className="h-full bg-black dark:bg-white rounded-full transition-all duration-1000" style={{ width: `${totalPlatformSpend > 0 ? (metrics.platforms.tiktok.spend / totalPlatformSpend) * 100 : 0}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM SECTION: CROSS-PLATFORM TABLE ── */}
      <div className="bg-card border rounded-2xl overflow-hidden flex flex-col">
        <div className="p-5 border-b flex justify-between items-center bg-muted/10">
          <div>
            <h2 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Top Campañas Omnicanal</h2>
            <p className="text-xs text-muted-foreground mt-1">Rendimiento consolidado (Ordenado por ROAS)</p>
          </div>
          <Link href="/dashboard/ads-manager" className="text-xs font-bold text-cyan-500 hover:text-cyan-400 flex items-center gap-1 transition-colors">
            IR A ADS MANAGER <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-semibold">Campaña</th>
                <th className="px-5 py-3 font-semibold">Plataforma</th>
                <th className="px-5 py-3 font-semibold text-right">Inversión</th>
                <th className="px-5 py-3 font-semibold text-right">CPA</th>
                <th className="px-5 py-3 font-semibold text-right">ROAS</th>
                <th className="px-5 py-3 font-semibold text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {metrics.campaigns.length === 0 && (
                 <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No hay campañas activas en los canales seleccionados.</td></tr>
              )}
              {metrics.campaigns.map((c: any) => (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3 font-medium whitespace-nowrap">{c.name}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {c.plat === "google" && <GoogleIcon width={16} height={16} />}
                      {c.plat === "meta" && <MetaIcon width={16} height={16} />}
                      {c.plat === "tiktok" && <TiktokIcon width={16} height={16} />}
                      <span className="capitalize">{c.plat}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-medium">${c.spend.toLocaleString("es-MX")}</td>
                  <td className="px-5 py-3 text-right">${c.cpa.toLocaleString("es-MX")}</td>
                  <td className="px-5 py-3 text-right font-bold text-emerald-500">{c.roas}x</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      c.status === "active" ? "bg-emerald-500/10 text-emerald-500" :
                      c.status === "warning" ? "bg-amber-500/10 text-amber-500" :
                      "bg-red-500/10 text-red-500"
                    }`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
