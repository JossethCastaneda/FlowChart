/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-explicit-any */
﻿"use client";

import React, { useState } from "react";
import { Zap, X, Loader2, MapPin, DollarSign, Calendar, AlertCircle, Check } from "lucide-react";

/* ── Types ─────────────────────────────────────────────── */
interface Post {
  id: string;
  content: string;
  channels: string[];
  mediaUrls: string[];
  mediaUrl: string | null;
  status: string;
  pageId: string | null;
  pageName: string | null;
    [key: string]: any;
}

export interface BoostResult {
  campaignId: string;
  adsetId: string;
  adId: string;
}

export interface BoostModalProps {
  post: Post;
  onClose: () => void;
  onSuccess: (result: BoostResult) => void;
}

/* ── Constants ─────────────────────────────────────────── */
const PRESET_COUNTRIES = [
  { code: "MX", label: "México", flag: "" },
  { code: "US", label: "EE.UU", flag: "" },
  { code: "CO", label: "Colombia", flag: "" },
  { code: "AR", label: "Argentina", flag: "" },
  { code: "ES", label: "España", flag: "" },
  { code: "CL", label: "Chile", flag: "" },
];

const BUDGET_PRESETS = [50, 100, 200, 500];

/* ══════════════════════════════════════════════════════════
   BOOST MODAL COMPONENT
   ══════════════════════════════════════════════════════════ */
export function BoostModal({ post, onClose, onSuccess }: BoostModalProps) {
  const [budget, setBudget] = useState(100);
  const [days, setDays] = useState(3);
  const [countries, setCountries] = useState<string[]>(["MX"]);
  const [adAccountId, setAdAccountId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Country toggle ─────────────────────────────────── */
  const toggleCountry = (code: string) => {
    setCountries((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code]
    );
  };

  /* ── Submit ─────────────────────────────────────────── */
  const handleBoost = async () => {
    if (!adAccountId.trim()) {
      setError("Ingresa el ID de tu cuenta publicitaria de Meta");
      return;
    }
    if (countries.length === 0) {
      setError("Selecciona al menos un país");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ads/boost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          adAccountId: adAccountId.trim().replace("act_", ""),
          budgetCents: Math.round(budget * 100),
          durationDays: days,
          countries,
          pageId: post.pageId,
          // El page token se resuelve en el servidor; el clic en "Boostear"
          // es la confirmación explícita del usuario.
          confirmed_by_user: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error lanzando el boost");
      }
      onSuccess({
        campaignId: data.campaignId,
        adsetId: data.adsetId,
        adId: data.adId,
      });
        } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalEstimated = budget * days;

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "var(--overlay-dark)", 
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--fc-text)",
          border: "1px solid rgba(224,168,60,0.3)",
          borderRadius: 12, padding: 0, width: "100%", maxWidth: 420,
          maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(224,168,60,0.06)",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", borderBottom: "1px solid rgba(224,168,60,0.15)",
          background: "var(--fc-surface)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Zap style={{ width: 16, height: 16, color: "var(--fc-warning)" }} />
            <span style={{
              fontSize: 13, fontWeight: 700, color: "var(--fc-warning)",
              fontFamily: "var(--font-display)", letterSpacing: "0.1em",
            }}>
              CONFIGURAR IMPULSO
            </span>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "var(--fc-text-muted)",
            cursor: "pointer", padding: 4, display: "flex",
          }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* ── Post Preview ── */}
        <div style={{
          display: "flex", gap: 10, padding: "12px 20px",
          border: "1px solid var(--hairline)",
          background: "var(--fc-surface)",
        }}>
          {(post.mediaUrls?.[0] || post.mediaUrl) && (
            <div style={{
              width: 44, height: 44, borderRadius: 6, overflow: "hidden",
              flexShrink: 0, background: "var(--fc-bg)",
            }}>
                            <img
                src={post.mediaUrls?.[0] || post.mediaUrl || ""}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 12, color: "var(--fc-text)", margin: 0,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {post.content.length > 80 ? post.content.slice(0, 80) + "..." : post.content}
            </p>
            <p style={{ fontSize: 10, color: "var(--fc-text-muted)", margin: "2px 0 0" }}>
              {post.pageName || "Página"} · {post.channels.join(", ")}
            </p>
          </div>
        </div>

        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* ── Budget ── */}
          <div>
            <label style={{
              fontSize: 10, fontWeight: 700, color: "var(--fc-text-secondary)",
              fontFamily: "var(--font-display)", letterSpacing: "0.1em",
              display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
            }}>
              <DollarSign style={{ width: 12, height: 12 }} />
              PRESUPUESTO DIARIO
            </label>

            {/* Budget input */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px", borderRadius: 8,
              background: "var(--surface-hover)",
              border: "1px solid var(--hairline)",
            }}>
              <span style={{ fontSize: 14, color: "var(--fc-text-muted)", fontWeight: 600 }}>$</span>
              <input
                type="number"
                min={10}
                max={10000}
                value={budget}
                onChange={(e) => setBudget(Math.max(10, Number(e.target.value)))}
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  color: "var(--fc-text)", fontSize: 16, fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                }}
              />
              <span style={{ fontSize: 12, color: "var(--fc-text-muted)", fontWeight: 500 }}>MXN / día</span>
            </div>

            {/* Budget presets */}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {BUDGET_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setBudget(preset)}
                  style={{
                    padding: "4px 12px", borderRadius: 16, fontSize: 11, fontWeight: 600,
                    cursor: "pointer", transition: "all 0.15s",
                    background: budget === preset ? "rgba(224,168,60,0.15)" : "var(--surface-hover)",
                    border: budget === preset ? "1px solid rgba(224,168,60,0.4)" : "1px solid rgba(255,255,255,0.06)",
                    color: budget === preset ? "var(--fc-warning)" : "var(--fc-text-muted)",
                  }}
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>

          {/* ── Duration ── */}
          <div>
            <label style={{
              fontSize: 10, fontWeight: 700, color: "var(--fc-text-secondary)",
              fontFamily: "var(--font-display)", letterSpacing: "0.1em",
              display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
            }}>
              <Calendar style={{ width: 12, height: 12 }} />
              DURACIÓN
            </label>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="range"
                min={1}
                max={30}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                style={{
                  flex: 1, accentColor: "var(--fc-warning)", height: 4,
                  cursor: "pointer",
                }}
              />
              <span style={{
                fontSize: 13, fontWeight: 600, color: "var(--fc-text)",
                minWidth: 50, textAlign: "right",
              }}>
                {days} día{days > 1 ? "s" : ""}
              </span>
            </div>

            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginTop: 6, padding: "6px 10px", borderRadius: 6,
              background: "var(--fc-surface)",
              border: "1px solid rgba(224,168,60,0.15)",
            }}>
              <span style={{ fontSize: 11, color: "var(--fc-text-secondary)" }}>Total estimado:</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fc-warning)" }}>
                ${totalEstimated.toLocaleString()} MXN
              </span>
            </div>
          </div>

          {/* ── Countries ── */}
          <div>
            <label style={{
              fontSize: 10, fontWeight: 700, color: "var(--fc-text-secondary)",
              fontFamily: "var(--font-display)", letterSpacing: "0.1em",
              display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
            }}>
              <MapPin style={{ width: 12, height: 12 }} />
              PAÍSES DE ALCANCE
            </label>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PRESET_COUNTRIES.map((c) => {
                const active = countries.includes(c.code);
                return (
                  <button
                    key={c.code}
                    onClick={() => toggleCountry(c.code)}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "5px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                      cursor: "pointer", transition: "all 0.15s",
                      background: active ? "rgba(0,200,117,0.1)" : "var(--surface-hover)",
                      border: active ? "1px solid rgba(0,200,117,0.3)" : "1px solid rgba(255,255,255,0.06)",
                      color: active ? "var(--fc-success)" : "var(--fc-text-muted)",
                    }}
                  >
                    <span>{c.flag}</span>
                    <span>{c.label}</span>
                    {active && <Check style={{ width: 11, height: 11 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Ad Account ID ── */}
          <div>
            <label style={{
              fontSize: 10, fontWeight: 700, color: "var(--fc-text-secondary)",
              fontFamily: "var(--font-display)", letterSpacing: "0.1em",
              display: "block", marginBottom: 8,
            }}>
              CUENTA PUBLICITARIA
            </label>

            <input
              type="text"
              value={adAccountId}
              onChange={(e) => setAdAccountId(e.target.value)}
              placeholder="ID de cuenta (ej: 123456789)"
              style={{
                width: "100%", padding: "8px 12px", borderRadius: 8,
                background: "var(--surface-hover)",
                border: "1px solid var(--hairline)",
                color: "var(--fc-text)", fontSize: 13, fontFamily: "var(--font-sans)",
                outline: "none",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(224,168,60,0.4)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
            />
            <p style={{ fontSize: 10, color: "var(--fc-text-secondary)", margin: "4px 0 0" }}>
              Sin prefijo "act_" — lo encontrarás en Meta Business Suite → Configuración
            </p>
          </div>

          {/* ── Error ── */}
          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 12px", borderRadius: 6, fontSize: 12,
              background: "var(--fc-surface)",
              border: "1px solid rgba(226,68,92,0.25)",
              color: "var(--fc-danger)",
            }}>
              <AlertCircle style={{ width: 13, height: 13, flexShrink: 0 }} />
              {error}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          display: "flex", gap: 8, padding: "14px 20px",
          border: "1px solid var(--hairline)",
          background: "var(--fc-surface)",
          justifyContent: "flex-end",
        }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: "var(--surface-hover)", border: "1px solid var(--hairline)",
              color: "var(--fc-text-secondary)", cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleBoost}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 22px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: loading
                ? "rgba(224,168,60,0.2)"
                : "linear-gradient(135deg, var(--fc-warning), var(--fc-warning))",
              border: "none",
              color: "var(--fc-text)", cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 4px 16px rgba(224,168,60,0.25)",
              transition: "all 0.2s",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
            ) : (
              <Zap style={{ width: 14, height: 14 }} />
            )}
            {loading ? "LANZANDO..." : "LANZAR BOOST"}
          </button>
        </div>
      </div>
    </div>
  );
}
