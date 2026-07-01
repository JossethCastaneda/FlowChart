"use client";
import { PageHeader } from "@/components/ui/PageHeader";
import { useState, useEffect, useRef } from "react";
import { Check, Lock, Send, Sparkles, Star } from "lucide-react";

interface CatalogModel {
  id: string;
  label: string;
  note: string;
}
interface CatalogProvider {
  id: string;
  label: string;
  vendor: string;
  tagline: string;
  strengths: string[];
  accent: string;
  recommendedModel: string;
  models: CatalogModel[];
  envVar: string;
  configured: boolean;
}
interface ProvidersResponse {
  providers: CatalogProvider[];
  selectedModel: string;
  activeProviderId: string | null;
  activeModel: string | null;
}
interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  meta?: string;
}

export default function AriaCopilotPage() {
  const [data, setData] = useState<ProvidersResponse | null>(null);
  const [savingModel, setSavingModel] = useState<string | null>(null);
  const [modelChoice, setModelChoice] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const load = () =>
    fetch("/api/crecimiento/providers")
      .then((r) => r.json())
      .then((j) => {
        if (j?.success) setData(j.data as ProvidersResponse);
      })
      .catch(console.error);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectProvider = async (p: CatalogProvider) => {
    if (!p.configured) return;
    const model = modelChoice[p.id] ?? p.recommendedModel;
    setSavingModel(model);
    try {
      const res = await fetch("/api/workspace/ai-model", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });
      if (res.ok) await load();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingModel(null);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/crecimiento/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const j = await res.json();
      if (j?.success) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: j.data.reply, meta: `${j.data.provider} · ${j.data.model}` },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: j?.error ?? "No se pudo obtener respuesta.", meta: "error" },
        ]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Error de conexión.", meta: "error" }]);
    } finally {
      setSending(false);
    }
  };

  const activeLabel =
    data?.providers.find((p) => p.id === data.activeProviderId)?.label ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Aria Copilot"
        description="Elige la IA que prefieras y conversa con Aria sobre tus modelos predictivos."
      />

      {/* ── Catálogo deslizable de IAs ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> Selecciona tu IA
          </h2>
          {activeLabel && (
            <span className="text-sm text-muted-foreground">
              Activa: <strong className="text-foreground">{activeLabel}</strong>
              {data?.activeModel ? ` · ${data.activeModel}` : ""}
            </span>
          )}
        </div>

        <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory">
          {data?.providers.map((p) => {
            const isActive = data.activeProviderId === p.id;
            const chosen = modelChoice[p.id] ?? p.recommendedModel;
            return (
              <div
                key={p.id}
                className={`relative shrink-0 snap-start w-[320px] bg-card border rounded-xl overflow-hidden transition ${
                  isActive ? "ring-2 ring-primary" : ""
                } ${!p.configured ? "opacity-70" : ""}`}
              >
                <div className={`h-1.5 w-full bg-gradient-to-r ${p.accent}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">{p.vendor}</div>
                      <div className="text-xl font-bold">{p.label}</div>
                      <div className="text-sm text-muted-foreground">{p.tagline}</div>
                    </div>
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-primary text-primary-foreground px-2 py-1 rounded-full">
                        <Check className="w-3 h-3" /> Activa
                      </span>
                    ) : !p.configured ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-muted text-muted-foreground px-2 py-1 rounded-full">
                        <Lock className="w-3 h-3" /> No conectada
                      </span>
                    ) : null}
                  </div>

                  <ul className="mt-4 space-y-1.5 text-sm">
                    {p.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Star className="w-3.5 h-3.5 mt-0.5 text-amber-400 shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5">
                    {p.configured ? (
                      <>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Modelo</label>
                        <select
                          className="w-full bg-background border rounded-md p-2 text-sm mb-3"
                          value={chosen}
                          onChange={(e) => setModelChoice((c) => ({ ...c, [p.id]: e.target.value }))}
                        >
                          {p.models.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label} — {m.note}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => selectProvider(p)}
                          disabled={savingModel !== null || (isActive && chosen === data.activeModel)}
                          className="w-full bg-primary text-primary-foreground py-2 rounded-md text-sm font-semibold disabled:opacity-50 transition"
                        >
                          {savingModel === chosen
                            ? "Guardando..."
                            : isActive && chosen === data.activeModel
                              ? "En uso"
                              : "Usar esta IA"}
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Para activarla, agrega <code className="bg-muted px-1 rounded">{p.envVar}</code> en las
                        variables de entorno de Vercel y vuelve a desplegar.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {!data && (
            <div className="text-sm text-muted-foreground p-4">Cargando catálogo de IAs…</div>
          )}
        </div>
      </div>

      {/* ── Chat con Aria ── */}
      <div className="bg-card border rounded-xl flex flex-col h-[460px]">
        <div className="px-5 py-3 border-b text-sm font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Conversa con Aria
          {activeLabel && <span className="text-muted-foreground font-normal">· responde {activeLabel}</span>}
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Pregúntale a Aria, por ejemplo: <em>&quot;¿Qué leads debo contactar primero?&quot;</em> o
              <em> &quot;¿Qué variables influyen más en la conversión?&quot;</em>. Aria responde con base en las
              métricas reales de tus modelos.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : m.meta === "error"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted"
                }`}
              >
                {m.content}
                {m.role === "assistant" && m.meta && m.meta !== "error" && (
                  <div className="mt-1 text-[10px] uppercase tracking-wide opacity-60">{m.meta}</div>
                )}
              </div>
            </div>
          ))}
          {sending && <div className="text-sm text-muted-foreground">Aria está pensando…</div>}
          <div ref={chatEndRef} />
        </div>
        <div className="p-3 border-t flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Escribe tu pregunta…"
            className="flex-1 bg-background border rounded-md px-3 py-2 text-sm"
          />
          <button
            onClick={send}
            disabled={sending || input.trim() === ""}
            className="bg-primary text-primary-foreground px-4 rounded-md disabled:opacity-50 flex items-center gap-1 text-sm font-medium"
          >
            <Send className="w-4 h-4" /> Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
