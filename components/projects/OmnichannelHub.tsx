"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, ArrowRight, TrendingUp, TrendingDown, Globe, BarChart3 } from "lucide-react";
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

const MetaIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const TiktokIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.78-1.15 5.54-3.33 7.37-1.87 1.57-4.4 2.21-6.81 1.83-2.6-.4-4.88-2.02-6.07-4.38-1.07-2.12-1.17-4.66-.27-6.85 1.08-2.63 3.65-4.58 6.47-4.78.13-.01.26-.01.39-.01v4.19c-.87.05-1.74.33-2.45.89-.88.69-1.34 1.83-1.2 2.94.13 1.05.84 2.03 1.79 2.45 1.02.44 2.23.36 3.17-.2.95-.57 1.55-1.58 1.64-2.68.04-3.69.02-7.39.02-11.08.01-2.73.01-5.45.02-8.18z"/>
  </svg>
);

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
                  <span className="flex items-center gap-1.5"><MetaIcon /> Meta Ads</span>
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
                  <span className="flex items-center gap-1.5"><GoogleIcon /> Google Ads</span>
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
                  <span className="flex items-center gap-1.5"><TiktokIcon /> TikTok Ads</span>
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
                      {c.plat === "google" && <GoogleIcon />}
                      {c.plat === "meta" && <MetaIcon />}
                      {c.plat === "tiktok" && <TiktokIcon />}
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
