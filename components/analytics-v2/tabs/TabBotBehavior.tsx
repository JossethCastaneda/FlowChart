"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { RefreshCw, Clock, MousePointerClick, AlertTriangle, ShoppingCart, MessageSquare, GitBranch, Bot, KeyRound, Users, ChevronDown } from "lucide-react";
import { useAnalyticsData } from "../useAnalyticsData";
import type { BotBehavior, BotSummary, DataRequestFunnel } from "@/lib/botmaker";
import type { CariResults } from "@/lib/crm/cari";

interface BotBehaviorResponse {
  provider: string | null;
  connected: boolean;
  channel: string;
  behavior: BotBehavior | null;
  byBot?: BotSummary[];
  cari: CariResults | null;
}

const PALETTE = ["#00d4ff", "#06d6a0", "#ffbe0b", "#a855f7", "#f472b6", "#fb923c", "#22d3ee", "#f87171"];

function fmtDuration(sec: number): string {
  if (!sec || sec < 0) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

const panel: React.CSSProperties = { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20 };
const h3: React.CSSProperties = { color: "white", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, marginBottom: 16 };

function Kpi({ label, value, sub, color = "#00d4ff", icon }: { label: string; value: string; sub?: string; color?: string; icon?: React.ReactNode }) {
  return (
    <div style={{ ...panel, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 11, marginBottom: 8 }}>
        {icon} {label}
      </div>
      <div style={{ color, fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: "#64748b", fontSize: 11, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export function TabBotBehavior({ query, base }: { query: string; base: string }) {
  const { data, loading, error } = useAnalyticsData<BotBehaviorResponse>(`${base}/bot-behavior`, query);

  if (loading && !data) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: "#00d4ff" }} />
        <p style={{ fontSize: 14 }}>Analizando comportamiento del bot…</p>
      </div>
    );
  }
  if (error) return <div style={{ padding: 60, textAlign: "center", color: "#f87171" }}>{error}</div>;
  if (!data) return <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>Sin datos.</div>;

  if (!data.connected) {
    return (
      <div style={{ ...panel, padding: 48, textAlign: "center" }}>
        <Bot className="w-10 h-10 mx-auto mb-3" style={{ color: "#64748b" }} />
        <p style={{ color: "#94a3b8", fontSize: 14 }}>La plataforma analítica del proyecto no está conectada.</p>
        <p style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>Asocia Botmaker o Cari AI y sincroniza para ver el análisis.</p>
      </div>
    );
  }

  // ── Cari: solo reportes agregados ──────────────────────────────────────────
  if (data.cari) return <CariBehavior cari={data.cari} />;

  // ── Botmaker: análisis profundo ────────────────────────────────────────────
  if (data.behavior) return <BotmakerBehavior b={data.behavior} byBot={data.byBot || []} base={base} query={query} />;

  return <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>Sin resultados para este periodo.</div>;
}

/** Barras de un funnel de captura/conversión (reutilizable global y por bot). */
function FunnelSteps({ steps }: { steps: DataRequestFunnel["steps"] }) {
  const top = steps[0]?.reached || 1;
  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        const w = Math.round((s.reached / top) * 100);
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 150, fontSize: 12, color: "#cbd5e1", textAlign: "right" }}>{i + 1}. {s.label}</div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 6, height: 26, position: "relative" }}>
              <div style={{ width: `${w}%`, background: PALETTE[i % PALETTE.length], height: "100%", borderRadius: 6, transition: "width .3s" }} />
              <span style={{ position: "absolute", left: 8, top: 4, fontSize: 11, color: "white" }}>{s.reached.toLocaleString("es-MX")}</span>
            </div>
            <div style={{ width: 90, fontSize: 11, color: s.dropOff ? "#f87171" : "#64748b" }}>
              {s.dropOff ? `-${s.dropOff} (${s.dropOffPct}%)` : "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BotmakerBehavior({ b, byBot, base, query }: { b: BotBehavior; byBot: BotSummary[]; base: string; query: string }) {
  const msgData = b.messageTypes.byType.map((t) => ({ name: t.type, value: t.count, pct: t.pct }));
  const ttsData = b.timeToSale.distribution.map((d) => ({ name: d.bucket, value: d.count }));

  return (
    <div className="space-y-6">
      <ExecutiveSummary b={b} />

      {/* Tiempos de respuesta */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        <Kpi label="1ª respuesta (prom.)" value={fmtDuration(b.responseTimes.avgFirstResponseSec)} icon={<Clock className="w-3.5 h-3.5" />} color="#00d4ff" />
        <Kpi label="Respuesta del bot (prom.)" value={fmtDuration(b.responseTimes.avgBotSec)} icon={<Clock className="w-3.5 h-3.5" />} color="#06d6a0" />
        <Kpi label="Respuesta del usuario (prom.)" value={fmtDuration(b.responseTimes.avgUserSec)} icon={<Clock className="w-3.5 h-3.5" />} color="#a855f7" />
        <Kpi label="Conversaciones analizadas" value={b.sampleSize.toLocaleString("es-MX")} icon={<MessageSquare className="w-3.5 h-3.5" />} color="#ffbe0b" />
      </div>

      {/* Por bot (G1): global Y por bot lado a lado */}
      <ByBotSection byBot={byBot} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
        {/* Tipos de mensaje */}
        <div style={panel}>
          <h3 style={h3}><MessageSquare className="w-4 h-4 text-cyan-400" /> Tipos de mensaje</h3>
          {msgData.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={msgData} layout="vertical" margin={{ left: 12, right: 16 }}>
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={92} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} formatter={(value: unknown, _name: unknown, entry: unknown) => {
                  const pct = (entry as { payload?: { pct?: number } })?.payload?.pct ?? 0;
                  return [`${value} (${pct}%)`, "Mensajes"] as [string, string];
                }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {msgData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
          <div style={{ color: "#64748b", fontSize: 11, marginTop: 8 }}>
            {b.messageTypes.userTotal.toLocaleString("es-MX")} recibidos · {b.messageTypes.botTotal.toLocaleString("es-MX")} enviados
          </div>
        </div>

        {/* Botones */}
        <div style={panel}>
          <h3 style={h3}><MousePointerClick className="w-4 h-4 text-cyan-400" /> Botones mostrados vs elegidos</h3>
          <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
            <Mini label="Mensajes con botones" value={b.buttons.shownMessages.toLocaleString("es-MX")} />
            <Mini label="Opciones mostradas" value={b.buttons.shownOptions.toLocaleString("es-MX")} />
            <Mini label="Selecciones" value={b.buttons.selected.toLocaleString("es-MX")} />
            <Mini label="Tasa de selección" value={`${Math.round(b.buttons.selectRate * 100)}%`} color="#06d6a0" />
          </div>
          {b.buttons.topButtons.length ? (
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              <table style={{ width: "100%", fontSize: 12, color: "#cbd5e1" }}>
                <thead><tr style={{ color: "#64748b", textAlign: "left" }}><th style={{ padding: "4px 6px" }}>Botón</th><th>Mostrado</th><th>Elegido</th><th>CTR</th></tr></thead>
                <tbody>
                  {b.buttons.topButtons.map((bt) => (
                    <tr key={bt.label} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "4px 6px", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bt.label}</td>
                      <td>{bt.shown}</td><td>{bt.selected}</td>
                      <td style={{ color: bt.ctr >= 50 ? "#06d6a0" : bt.ctr > 0 ? "#ffbe0b" : "#64748b" }}>{bt.ctr}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty text="El bot no mostró botones en este periodo." />}
        </div>

        {/* Errores del bot */}
        <div style={panel}>
          <h3 style={h3}><AlertTriangle className="w-4 h-4" style={{ color: "#f87171" }} /> Errores del bot</h3>
          <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
            <Mini label="Errores totales" value={b.errors.total.toLocaleString("es-MX")} color="#f87171" />
            <Mini label="Sesiones con error" value={b.errors.sessionsWithError.toLocaleString("es-MX")} />
            <Mini label="Prom. por sesión" value={String(b.errors.perSessionAvg)} />
          </div>
          {b.errors.byType.length ? (
            <div style={{ maxHeight: 180, overflowY: "auto" }}>
              {b.errors.byType.map((e) => (
                <div key={e.type} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#cbd5e1", padding: "4px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.type}</span>
                  <span style={{ color: "#f87171" }}>{e.count}</span>
                </div>
              ))}
            </div>
          ) : <Empty text="Sin errores registrados." />}
        </div>

        {/* Ventas (felicidades) y tiempo a cierre */}
        <div style={panel}>
          <h3 style={h3}><ShoppingCart className="w-4 h-4" style={{ color: "#06d6a0" }} /> Ventas (felicidades) y tiempo a cierre</h3>
          <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
            <Mini label="Ventas" value={b.timeToSale.count.toLocaleString("es-MX")} color="#06d6a0" />
            <Mini label="Conversión" value={`${Math.round(b.timeToSale.conversionRate * 1000) / 10}%`} color="#06d6a0" />
            <Mini label="Tiempo prom." value={fmtDuration(b.timeToSale.avgSec)} />
            <Mini label="Mediana" value={fmtDuration(b.timeToSale.medianSec)} />
          </div>
          {b.timeToSale.count ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={ttsData} margin={{ left: 0, right: 8 }}>
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="#06d6a0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty text="Sin ventas (felicidades) en este periodo." />}
        </div>

        {/* NIP */}
        <div style={panel}>
          <h3 style={h3}><KeyRound className="w-4 h-4" style={{ color: "#ffbe0b" }} /> NIP · obtención y tiempo</h3>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Mini label="Bot pidió NIP" value={b.nip.prompted.toLocaleString("es-MX")} />
            <Mini label="Respondió (cualquiera)" value={b.nip.responded.toLocaleString("es-MX")} color="#a855f7" />
            <Mini label="Entrega válida" value={b.nip.delivered.toLocaleString("es-MX")} color="#06d6a0" />
            <Mini label="Tasa de entrega" value={`${Math.round(b.nip.firstResponseRate * 1000) / 10}%`} />
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10 }}>
            <Mini label="Tiempo 1ª respuesta" value={fmtDuration(b.nip.avgRespondedSec)} color="#a855f7" />
            <Mini label="Tiempo entrega válida" value={fmtDuration(b.nip.avgSec)} />
            <Mini label="Mediana (válida)" value={fmtDuration(b.nip.medianSec)} />
          </div>
          <div style={{ color: "#64748b", fontSize: 10, marginTop: 8 }}>
            &quot;Respondió&quot; = primer mensaje del usuario tras el prompt (cualquier texto). &quot;Entrega válida&quot; = primer NIP de 4–8 dígitos.
          </div>
          {!b.nip.prompted && <Empty text="El bot no pidió NIP en este periodo (o no se detectó en el texto)." />}
        </div>

        {/* Funnel 1: reacción al primer menú */}
        <div style={panel}>
          <h3 style={h3}><MousePointerClick className="w-4 h-4 text-cyan-400" /> Funnel 1 · Reacción al primer menú</h3>
          {b.firstMenu.total ? (
            <div className="space-y-2">
              {b.firstMenu.byType.map((r, i) => {
                const w = b.firstMenu.total ? Math.round((r.count / b.firstMenu.total) * 100) : 0;
                return (
                  <div key={r.type} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 120, fontSize: 12, color: "#cbd5e1", textAlign: "right" }}>{r.label}</div>
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 6, height: 24, position: "relative" }}>
                      <div style={{ width: `${w}%`, background: PALETTE[i % PALETTE.length], height: "100%", borderRadius: 6 }} />
                      <span style={{ position: "absolute", left: 8, top: 3, fontSize: 11, color: "white" }}>{r.count.toLocaleString("es-MX")} · {r.pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <Empty />}
        </div>
      </div>

      {/* Funnel 2 GLOBAL: orden fijo número → NIP → nombre → venta (G2) */}
      <div style={panel}>
        <h3 style={h3}><GitBranch className="w-4 h-4 text-cyan-400" /> Funnel 2 global · número → NIP → nombre → venta</h3>
        {b.globalFunnel2.steps.length ? (
          <>
            <div style={{ color: "#64748b", fontSize: 11, marginBottom: 12 }}>
              Orden fijo (BAIT) · {b.globalFunnel2.totalSessions.toLocaleString("es-MX")} sesiones · venta = mensaje del bot con &quot;felicidades&quot;.
            </div>
            <FunnelSteps steps={b.globalFunnel2.steps} />
          </>
        ) : <Empty />}
      </div>

      {/* Funnel 2 POR TIPO DE BOT: orden real del flujo (o inferido) */}
      <div style={panel}>
        <h3 style={h3}><GitBranch className="w-4 h-4 text-cyan-400" /> Funnel 2 · por tipo de bot (orden del flujo)</h3>
        {b.dataRequestFunnel.steps.length ? (
          <>
            <div style={{ color: "#64748b", fontSize: 11, marginBottom: 12 }}>
              Método: {b.dataRequestFunnel.method === "configured" ? "orden fijo del tipo de bot" : b.dataRequestFunnel.method === "set-variable" ? "variables capturadas por el bot" : b.dataRequestFunnel.method === "heuristic" ? "inferido del texto de los mensajes" : "—"} · {b.dataRequestFunnel.totalSessions.toLocaleString("es-MX")} sesiones
            </div>
            <FunnelSteps steps={b.dataRequestFunnel.steps} />
          </>
        ) : <Empty text="No se detectó un orden de captura de datos (sin eventos set-variable ni patrones en el texto)." />}
      </div>

      {/* Objeciones / tipificaciones */}
      <div style={panel}>
        <h3 style={h3}><MessageSquare className="w-4 h-4 text-cyan-400" /> Tipos de objeción / tipificación</h3>
        {b.objections.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {b.objections.map((o, i) => (
              <span key={o.label} style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)", color: "#cbd5e1", padding: "6px 10px", borderRadius: 8, fontSize: 12 }}>
                {o.label} <strong style={{ color: PALETTE[i % PALETTE.length] }}>{o.count}</strong>
              </span>
            ))}
          </div>
        ) : <Empty text="Sin tipificaciones de cierre en este periodo." />}
      </div>

      {/* Rechazos de portabilidad (mensajes del bot) */}
      <div style={panel}>
        <h3 style={h3}><AlertTriangle className="w-4 h-4" style={{ color: "#f87171" }} /> Rechazos de portabilidad (detectados en conversación)</h3>
        <div style={{ color: "#64748b", fontSize: 11, marginBottom: 10 }}>
          Sesiones con mensaje de rechazo del bot: <strong style={{ color: "#f87171" }}>{b.rejections.total.toLocaleString("es-MX")}</strong>. El conteo definitivo de &quot;primer rechazo Botmaker&quot; (ventas dashboard − ventas en sábana) requiere el cruce con la sábana de ventas.
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {b.rejections.byReason.map((r) => (
            <div key={r.key} style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#cbd5e1" }}>
              {r.label}: <strong style={{ color: "#f87171" }}>{r.count.toLocaleString("es-MX")}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Cruce con sábana de ventas (secciones 9-10) */}
      <SalesReconciliation base={base} query={query} />

      {/* Ventas, derivaciones y reactivaciones (sección 8) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <div style={panel}>
          <h3 style={h3}><GitBranch className="w-4 h-4" style={{ color: "#a855f7" }} /> Derivaciones a agente</h3>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Mini label="Sesiones derivadas" value={b.derivations.count.toLocaleString("es-MX")} color="#a855f7" />
            <Mini label="Tasa de derivación" value={`${Math.round(b.derivations.rate * 1000) / 10}%`} />
          </div>
          <div style={{ color: "#64748b", fontSize: 10, marginTop: 8 }}>Transferencias a un agente humano (mensaje de agente o evento de transferencia).</div>
        </div>
        <div style={panel}>
          <h3 style={h3}><MessageSquare className="w-4 h-4 text-cyan-400" /> SIM vs eSIM</h3>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Mini label="SIM física" value={b.simEsim.sim.toLocaleString("es-MX")} />
            <Mini label="eSIM" value={b.simEsim.esim.toLocaleString("es-MX")} color="#06d6a0" />
            <Mini label="Sin dato" value={b.simEsim.sinDato.toLocaleString("es-MX")} />
          </div>
          <div style={{ color: "#64748b", fontSize: 10, marginTop: 8 }}>Por menciones en la conversación. Relevante en Lira.</div>
        </div>
        <div style={panel}>
          <h3 style={h3}><RefreshCw className="w-4 h-4 text-cyan-400" /> Reactivaciones</h3>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Mini label="Reenganches del bot" value={b.reactivations.withGap.toLocaleString("es-MX")} />
            <Mini label="Con respuesta" value={b.reactivations.reactivated.toLocaleString("es-MX")} color="#06d6a0" />
            <Mini label="Tasa de éxito" value={`${Math.round(b.reactivations.rate * 1000) / 10}%`} />
          </div>
          <div style={{ color: "#64748b", fontSize: 10, marginTop: 8 }}>Mensaje del bot tras ≥30 min de silencio que logró respuesta.</div>
        </div>
      </div>
    </div>
  );
}

function CariBehavior({ cari }: { cari: CariResults }) {
  return (
    <div className="space-y-6">
      <div style={{ ...panel, padding: 14, color: "#94a3b8", fontSize: 12 }}>
        Cari AI reporta métricas <strong>agregadas</strong> (no a nivel mensaje), así que el análisis profundo de botones y tipos de mensaje no aplica para esta plataforma.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
        <Kpi label="Conversaciones" value={cari.kpis.totalConversations.toLocaleString("es-MX")} color="#00d4ff" />
        <Kpi label="Contención del bot" value={`${cari.kpis.botContainmentPct}%`} color="#06d6a0" />
        <Kpi label="Transferidas" value={cari.kpis.transferred.toLocaleString("es-MX")} color="#ffbe0b" />
        <Kpi label="Abandonadas" value={`${cari.kpis.abandonedPct}%`} color="#f87171" />
        <Kpi label="Interacciones (prom.)" value={String(cari.kpis.avgInteractions)} color="#a855f7" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
        <div style={panel}>
          <h3 style={h3}><GitBranch className="w-4 h-4 text-cyan-400" /> Funnel de contención</h3>
          {cari.funnel.length ? (
            <div className="space-y-2">
              {cari.funnel.map((s, i) => {
                const top = cari.funnel[0]?.count || 1;
                const w = Math.round((s.count / top) * 100);
                return (
                  <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 160, fontSize: 12, color: "#cbd5e1", textAlign: "right" }}>{s.label}</div>
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 6, height: 26, position: "relative" }}>
                      <div style={{ width: `${w}%`, background: PALETTE[i % PALETTE.length], height: "100%", borderRadius: 6 }} />
                      <span style={{ position: "absolute", left: 8, top: 4, fontSize: 11, color: "white" }}>{s.count.toLocaleString("es-MX")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <Empty />}
        </div>

        <div style={panel}>
          <h3 style={h3}><AlertTriangle className="w-4 h-4" style={{ color: "#ffbe0b" }} /> Razones de no-finalización</h3>
          {cari.dropOffReasons.length ? (
            <div className="space-y-2">
              {cari.dropOffReasons.map((r) => (
                <div key={r.key} style={{ fontSize: 12, color: "#cbd5e1", padding: "6px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>{r.label}</span><span style={{ color: "#ffbe0b" }}>{r.count} ({r.pct}%)</span></div>
                </div>
              ))}
            </div>
          ) : <Empty />}
        </div>
      </div>

      <div style={panel}>
        <h3 style={h3}><MessageSquare className="w-4 h-4" style={{ color: "#f87171" }} /> Frases sin respuesta del bot ({cari.botErrors.totalUnanswered})</h3>
        {cari.botErrors.unanswered.length ? (
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {cari.botErrors.unanswered.slice(0, 20).map((u, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#cbd5e1", padding: "4px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.phrase}</span>
                <span style={{ color: "#f87171" }}>{u.count}×</span>
              </div>
            ))}
          </div>
        ) : <Empty text="Sin frases sin respuesta registradas." />}
      </div>

      {cari.insights.length > 0 && (
        <div style={panel}>
          <h3 style={h3}><Bot className="w-4 h-4 text-cyan-400" /> Lecturas del periodo</h3>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#cbd5e1", fontSize: 12, lineHeight: 1.7 }}>
            {cari.insights.map((ins, i) => <li key={i}>{ins}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Hallazgos accionables autogenerados desde las métricas en vivo (sección 11). */
function buildFindings(b: BotBehavior): string[] {
  const out: string[] = [];
  if (b.sampleSize > 0) {
    const conv = Math.round(b.timeToSale.conversionRate * 1000) / 10;
    out.push(`Conversión a venta (felicidades): ${conv}% — ${b.timeToSale.count.toLocaleString("es-MX")} de ${b.sampleSize.toLocaleString("es-MX")} sesiones.`);
  }
  const noResp = b.firstMenu.byType.find((x) => x.type === "sin_respuesta");
  if (noResp && noResp.pct >= 20) out.push(`${noResp.pct}% no responde al primer menú: revisar el mensaje/CTA inicial.`);
  if (b.nip.prompted > 0) {
    const rate = Math.round(b.nip.firstResponseRate * 1000) / 10;
    if (rate < 70) out.push(`Solo ${rate}% entrega un NIP válido tras pedirlo: el NIP es un cuello de botella.`);
  }
  const steps = b.dataRequestFunnel.steps;
  if (steps.length) {
    const worst = steps.reduce((a, c) => (c.dropOffPct > a.dropOffPct ? c : a), steps[0]);
    if (worst.dropOffPct > 0) out.push(`Mayor caída en captura de datos: "${worst.label}" pierde ${worst.dropOffPct}%.`);
  }
  if (b.errors.total > 0) out.push(`${b.errors.total.toLocaleString("es-MX")} errores del bot en ${b.errors.sessionsWithError.toLocaleString("es-MX")} sesiones: revisar los flujos con error.`);
  if (b.rejections.total > 0) out.push(`${b.rejections.total.toLocaleString("es-MX")} sesiones con mensaje de rechazo de portabilidad detectado (cruzar con sábana para el conteo definitivo).`);
  if (b.buttons.shownMessages > 0 && b.buttons.selectRate < 0.5) out.push(`Tasa de selección de botones ${Math.round(b.buttons.selectRate * 100)}%: muchos usuarios ignoran los botones mostrados.`);
  return out.slice(0, 6);
}

/** Resumen ejecutivo (sección 1) + hallazgos accionables (sección 11). */
function ExecutiveSummary({ b }: { b: BotBehavior }) {
  const findings = buildFindings(b);
  const conv = Math.round(b.timeToSale.conversionRate * 1000) / 10;
  const nipRate = b.nip.prompted ? Math.round(b.nip.firstResponseRate * 1000) / 10 : 0;
  return (
    <div style={{ ...panel, borderColor: "rgba(0,212,255,0.25)" }}>
      <h3 style={h3}><Bot className="w-4 h-4 text-cyan-400" /> Resumen ejecutivo</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 14 }}>
        <Mini label="Sesiones" value={b.sampleSize.toLocaleString("es-MX")} color="#00d4ff" />
        <Mini label="Ventas (felicidades)" value={b.timeToSale.count.toLocaleString("es-MX")} color="#06d6a0" />
        <Mini label="Conversión" value={`${conv}%`} color="#06d6a0" />
        <Mini label="NIP entregado" value={`${nipRate}%`} color="#ffbe0b" />
        <Mini label="Rechazos detectados" value={b.rejections.total.toLocaleString("es-MX")} color="#f87171" />
        <Mini label="Errores del bot" value={b.errors.total.toLocaleString("es-MX")} color="#f87171" />
      </div>
      {findings.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Hallazgos accionables</div>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#cbd5e1", fontSize: 12, lineHeight: 1.7 }}>
            {findings.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}
      <div style={{ color: "#64748b", fontSize: 10, marginTop: 10 }}>Fuente: conversaciones Botmaker en vivo (regla de venta = mensaje del bot con &quot;felicidades&quot;).</div>
    </div>
  );
}

interface ReconResult {
  columns: { phone: string; bot: string | null; capturista: string | null };
  sheetRows: number;
  sheetPhones: number;
  dashboardSales: number;
  exitosas: number;
  firstRejection: number;
  byBot: { key: string; count: number }[];
  byCapturista: { key: string; count: number }[];
  rejectionReasons: string[];
}

// Cruce con sábana de ventas: sube CSV/XLSX → ventas exitosas (en sábana) y
// primer rechazo Botmaker (ventas dashboard − exitosas). Claridad de fuente.
function SalesReconciliation({ base, query }: { base: string; query: string }) {
  const [result, setResult] = React.useState<ReconResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState("");

  const onFile = async (file: File) => {
    setLoading(true); setError(null); setResult(null); setFileName(file.name);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${base}/sales-reconciliation?${query}`, { method: "POST", body: fd });
      const j = await res.json();
      if (j.success) setResult(j.data as ReconResult); else setError(j.error || "Error en el cruce");
    } catch { setError("Error de red"); } finally { setLoading(false); }
  };

  const chip: React.CSSProperties = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "4px 8px", fontSize: 11, color: "#cbd5e1" };

  return (
    <div style={panel}>
      <h3 style={h3}><ShoppingCart className="w-4 h-4" style={{ color: "#06d6a0" }} /> Cruce con sábana de ventas (éxitos y rechazos)</h3>
      <div style={{ color: "#64748b", fontSize: 11, marginBottom: 10 }}>
        Sube tu sábana (CSV/XLSX); detectamos la columna de teléfono automáticamente. <strong>Exitosas</strong> = ventas del dashboard (felicidades) que aparecen en la sábana; <strong>primer rechazo Botmaker</strong> = ventas dashboard − exitosas.
      </div>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.3)", color: "#7dd3fc", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? "Procesando…" : "Subir sábana (CSV/XLSX)"}
        <input type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} disabled={loading}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      </label>
      {fileName && <span style={{ marginLeft: 10, fontSize: 11, color: "#94a3b8" }}>{fileName}</span>}
      {error && <div style={{ color: "#f87171", fontSize: 12, marginTop: 10 }}>{error}</div>}
      {result && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
            <Mini label="Ventas dashboard (felicidades)" value={result.dashboardSales.toLocaleString("es-MX")} color="#00d4ff" />
            <Mini label="Exitosas (en sábana)" value={result.exitosas.toLocaleString("es-MX")} color="#06d6a0" />
            <Mini label="Primer rechazo Botmaker" value={result.firstRejection.toLocaleString("es-MX")} color="#f87171" />
            <Mini label="Filas en sábana" value={result.sheetRows.toLocaleString("es-MX")} />
          </div>
          <div style={{ color: "#64748b", fontSize: 11, marginBottom: 10 }}>
            Columna de teléfono: <strong>{result.columns.phone}</strong>{result.columns.bot ? ` · bot: ${result.columns.bot}` : ""}{result.columns.capturista ? ` · capturista: ${result.columns.capturista}` : ""}. Fuente ventas: Botmaker (felicidades); fuente exitosas: cruce con sábana.
          </div>
          {result.firstRejection > 0 && (
            <div style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 6 }}>El primer rechazo Botmaker puede corresponder a estos 2 motivos (sin reparto artificial):</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: "#cbd5e1", fontSize: 12, lineHeight: 1.6 }}>
                {result.rejectionReasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
          {result.byCapturista.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>Exitosas por capturista</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {result.byCapturista.map((c) => <span key={c.key} style={chip}>{c.key}: <strong style={{ color: "#06d6a0" }}>{c.count}</strong></span>)}
              </div>
            </div>
          )}
          {result.byBot.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>Exitosas por bot</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {result.byBot.map((c) => <span key={c.key} style={chip}>{c.key}: <strong style={{ color: "#00d4ff" }}>{c.count}</strong></span>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Sección "Por bot" (G1): tabla comparativa por canal Botmaker + funnels por bot. */
function ByBotSection({ byBot }: { byBot: BotSummary[] }) {
  const [expanded, setExpanded] = React.useState<string | null>(null);
  if (!byBot.length) return null;
  const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;
  const th: React.CSSProperties = { padding: "6px 8px", color: "#64748b", fontWeight: 600, textAlign: "left", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "6px 8px", color: "#cbd5e1", whiteSpace: "nowrap" };
  const tdR: React.CSSProperties = { ...td, textAlign: "right" };
  return (
    <div style={panel}>
      <h3 style={h3}><Users className="w-4 h-4 text-cyan-400" /> Por bot (canales Botmaker)</h3>
      <div style={{ color: "#64748b", fontSize: 11, marginBottom: 12 }}>
        Universo: conversaciones Botmaker en vivo · venta = &quot;felicidades&quot;. Una fila por canal/bot; clic para ver sus funnels.
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <th style={th}>Bot</th>
              <th style={th}>Plataforma</th>
              <th style={{ ...th, textAlign: "right" }}>Sesiones</th>
              <th style={{ ...th, textAlign: "right" }}>Ventas</th>
              <th style={{ ...th, textAlign: "right" }}>Conversión</th>
              <th style={{ ...th, textAlign: "right" }}>NIP entreg.</th>
              <th style={{ ...th, textAlign: "right" }}>Derivación</th>
              <th style={{ ...th, textAlign: "right" }}>Reactivación</th>
            </tr>
          </thead>
          <tbody>
            {byBot.map((bot) => {
              const open = expanded === bot.channelId;
              return (
                <React.Fragment key={bot.channelId}>
                  <tr onClick={() => setExpanded(open ? null : bot.channelId)}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", background: open ? "rgba(0,212,255,0.05)" : "transparent" }}>
                    <td style={{ ...td, maxWidth: 220 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, maxWidth: "100%", overflow: "hidden" }}>
                        <ChevronDown className="w-3 h-3" style={{ transform: open ? "rotate(0)" : "rotate(-90deg)", transition: "transform .15s", color: "#64748b", flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bot.name}{bot.number ? ` · ${bot.number}` : ""}</span>
                      </span>
                    </td>
                    <td style={td}>{bot.canonical || bot.platform || "—"}</td>
                    <td style={tdR}>{bot.sampleSize.toLocaleString("es-MX")}</td>
                    <td style={{ ...tdR, color: "#06d6a0" }}>{bot.sales.toLocaleString("es-MX")}</td>
                    <td style={tdR}>{pct(bot.conversionRate)}</td>
                    <td style={tdR}>{pct(bot.nipDeliveredRate)}</td>
                    <td style={tdR}>{pct(bot.derivations.rate)}</td>
                    <td style={tdR}>{pct(bot.reactivations.rate)}</td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={8} style={{ padding: "12px 8px", background: "rgba(255,255,255,0.02)" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
                          <div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>Funnel 1 · reacción al primer menú</div>
                            {bot.firstMenu.total ? (
                              <div className="space-y-2">
                                {bot.firstMenu.byType.map((r, i) => {
                                  const w = bot.firstMenu.total ? Math.round((r.count / bot.firstMenu.total) * 100) : 0;
                                  return (
                                    <div key={r.type} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                      <div style={{ width: 110, fontSize: 11, color: "#cbd5e1", textAlign: "right" }}>{r.label}</div>
                                      <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 6, height: 20, position: "relative" }}>
                                        <div style={{ width: `${w}%`, background: PALETTE[i % PALETTE.length], height: "100%", borderRadius: 6 }} />
                                        <span style={{ position: "absolute", left: 6, top: 2, fontSize: 10, color: "white" }}>{r.count.toLocaleString("es-MX")} · {r.pct}%</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : <div style={{ color: "#64748b", fontSize: 11 }}>Sin datos.</div>}
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>
                              Funnel 2 · {bot.flowType ? `tipo: ${bot.flowType}` : "orden inferido"}
                            </div>
                            {bot.funnel2.steps.length ? <FunnelSteps steps={bot.funnel2.steps} /> : <div style={{ color: "#64748b", fontSize: 11 }}>Sin orden detectado.</div>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Mini({ label, value, color = "#e2e8f0" }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ color: "#64748b", fontSize: 10 }}>{label}</div>
      <div style={{ color, fontSize: 18, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function Empty({ text = "Sin datos para este periodo." }: { text?: string }) {
  return <div style={{ color: "#64748b", fontSize: 12, padding: "24px 0", textAlign: "center" }}>{text}</div>;
}
