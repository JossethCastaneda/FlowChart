"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { Sparkles, Send, Bot, User, AlertTriangle, Square } from "lucide-react";

/**
 * /dashboard/chat — Ventana de chat con Aria (Gemini 1.5 Flash).
 *
 * Vercel AI SDK v7 cambios clave:
 *   - useChat() devuelve `sendMessage`, no `handleSubmit`/`input`
 *   - El input se controla localmente con useState
 *   - UIMessage.parts[] contiene los fragmentos de texto
 *   - status: 'submitted' | 'streaming' | 'ready' | 'error'
 *   - ChatInit acepta `transport` o `messages` directamente
 */

const INITIAL_MESSAGES: UIMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    metadata: undefined,
    parts: [
      {
        type: "text",
        text: "¡Hola! Soy **Aria**, tu asistente de inteligencia en FlowChart. Puedo ayudarte con estrategias de marketing, análisis de campañas, redacción de contenido y mucho más. ¿En qué trabajamos hoy?",
      },
    ],
  },
];

export default function ChatPage() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    messages: INITIAL_MESSAGES,
  });

  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function getMessageText(msg: UIMessage): string {
    return msg.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
  }

  function renderText(text: string) {
    return text.split(/(\*\*[^*]+\*\*)/).map((part: string, i: number) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        part
      )
    );
  }

  function submit() {
    if (!input.trim() || isStreaming) return;
    sendMessage({ text: input.trim() });
    setInput("");
  }

  return (
    <div
      className="flex flex-col"
      style={{ height: "calc(100vh - 60px)", background: "var(--fc-bg)" }}
    >
      {/* ── Header ───────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-6 py-4 shrink-0"
        style={{
          borderBottom: "1px solid var(--fc-border)",
          background: "var(--fc-surface)",
        }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "var(--fc-accent-dim)", border: "1px solid var(--fc-border)" }}
        >
          <Sparkles className="w-4 h-4" style={{ color: "var(--fc-accent)" }} />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--fc-text)" }}>
            Aria
          </p>
          <p className="text-[11px]" style={{ color: "var(--fc-text-secondary)" }}>
            Gemini 1.5 Flash · {isStreaming ? "Escribiendo..." : "Lista"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full transition-all"
            style={{
              background: isStreaming ? "#f59e0b" : "#22c55e",
              boxShadow: isStreaming ? "0 0 6px #f59e0b" : "0 0 6px #22c55e",
            }}
          />
          <span className="text-[10px]" style={{ color: "var(--fc-text-muted)" }}>
            {isStreaming ? "Procesando" : "En línea"}
          </span>
        </div>
      </div>

      {/* ── Mensajes ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg: UIMessage) => {
          const isUser = msg.role === "user";
          const text = getMessageText(msg);
          if (!text) return null;

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-3 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mb-1"
                  style={{
                    background: "var(--fc-accent-dim)",
                    border: "1px solid var(--fc-border)",
                  }}
                >
                  <Bot className="w-3.5 h-3.5" style={{ color: "var(--fc-accent)" }} />
                </div>
              )}

              <div
                className="max-w-[72%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                style={
                  isUser
                    ? { background: "var(--fc-accent)", color: "#fff", borderRadius: "18px 18px 4px 18px" }
                    : {
                        background: "var(--fc-surface)",
                        color: "var(--fc-text)",
                        border: "1px solid var(--fc-border)",
                        borderRadius: "18px 18px 18px 4px",
                      }
                }
              >
                {renderText(text)}
              </div>

              {isUser && (
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mb-1"
                  style={{ background: "var(--fc-accent)" }}
                >
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {isStreaming && (
          <div className="flex items-end gap-3 justify-start">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "var(--fc-accent-dim)", border: "1px solid var(--fc-border)" }}
            >
              <Bot className="w-3.5 h-3.5" style={{ color: "var(--fc-accent)" }} />
            </div>
            <div
              className="px-4 py-3 flex items-center gap-1"
              style={{
                background: "var(--fc-surface)",
                border: "1px solid var(--fc-border)",
                borderRadius: "18px 18px 18px 4px",
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: "var(--fc-text-muted)",
                    animation: `aria-bounce 1s ease-in-out ${i * 0.15}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm mx-auto max-w-md"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#ef4444",
            }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error.message || "Ocurrió un error. Inténtalo de nuevo."}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ─────────────────────────────────────── */}
      <div
        className="px-4 py-4 shrink-0"
        style={{ borderTop: "1px solid var(--fc-border)", background: "var(--fc-surface)" }}
      >
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Escribe tu pregunta… (Enter para enviar, Shift+Enter para nueva línea)"
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
            style={{
              background: "var(--fc-surface-raised)",
              border: "1px solid var(--fc-border)",
              color: "var(--fc-text)",
              maxHeight: "160px",
              lineHeight: "1.5",
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 160) + "px";
            }}
          />

          {isStreaming ? (
            <button
              type="button"
              onClick={stop}
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all"
              style={{
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#ef4444",
                cursor: "pointer",
              }}
              title="Detener respuesta"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!input.trim()}
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all"
              style={
                input.trim()
                  ? { background: "var(--fc-accent)", border: "1px solid transparent", color: "#fff", cursor: "pointer" }
                  : { background: "var(--fc-surface-hover)", border: "1px solid var(--fc-border)", color: "var(--fc-text-muted)", cursor: "not-allowed" }
              }
              title="Enviar mensaje"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-center text-[10px] mt-2" style={{ color: "var(--fc-text-muted)" }}>
          Aria puede cometer errores. Verifica información importante.
        </p>
      </div>

      <style>{`
        @keyframes aria-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
