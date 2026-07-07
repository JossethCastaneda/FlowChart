"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, RefreshCw, Plus, AlertCircle, Database, Building, FolderGit2, Loader2
} from "lucide-react";
import { openConnectPopup } from "@/lib/connect-popup";
import { useLanguage } from "@/components/layout/LanguageContext";

// ─── Translations ────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  es: {
    title: "Meta Ads",
    subtitle: "Cuentas publicitarias vinculadas a tu cuenta de Meta.",
    connectedOn: "Conectado el",
    grantPermissions: "Renovar accesos",
    opening: "Abriendo…",
    errorLoading: "Error cargando cuentas",
    errorNetwork: "Error de red",
    retry: "Reintentar",
    notConnected: "No conectado",
    connectPrompt: "Conecta tu cuenta de Meta para gestionar tus anuncios",
    connectBtn: "Conectar Meta Ads",
    enabledAccounts: "Cuentas Publicitarias Habilitadas",
    noPages: "No hay cuentas disponibles. Asegúrate de tener acceso a cuentas publicitarias de Meta y vuelve a dar permisos.",
    pageLinked: "cuenta publicitaria encontrada",
    pagesLinked: "cuentas publicitarias encontradas",
    noPagesConnected: "Sin cuentas conectadas",
    renewAuth: "Renovar autorizaciones",
    portfolio: "PORTAFOLIO COMERCIAL",
    adAccount: "CUENTA PUBLICITARIA",
    noPortfolio: "Sin Portafolio Comercial",
  },
  en: {
    title: "Meta Ads",
    subtitle: "Ad accounts linked to your Meta account.",
    connectedOn: "Connected on",
    grantPermissions: "Renew access",
    opening: "Opening...",
    errorLoading: "Error loading accounts",
    errorNetwork: "Network error",
    retry: "Retry",
    notConnected: "Not connected",
    connectPrompt: "Connect your Meta account to manage your ads",
    connectBtn: "Connect Meta Ads",
    enabledAccounts: "Enabled Ad Accounts",
    noPages: "No accounts available. Make sure you have access to Meta ad accounts and grant permissions again.",
    pageLinked: "ad account found",
    pagesLinked: "ad accounts found",
    noPagesConnected: "No connected accounts",
    renewAuth: "Renew authorizations",
    portfolio: "BUSINESS PORTFOLIO",
    adAccount: "AD ACCOUNT",
    noPortfolio: "No Business Portfolio",
  }
};

interface AdAccount {
  id: string;
  name: string;
  portfolio: string;
  spend: number;
}

const MetaIcon = () => (
  <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export default function MetaAdsPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];

  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/meta/adaccounts");
      const data = await res.json();
      if (data.source === "no_session" || data.error) {
        setConnected(false);
        if (data.error) setError(data.error);
      } else {
        setConnected(true);
        setAccounts(data.data || []);
      }
    } catch (e: any) {
      setError(e.message || t.errorNetwork);
    }
    setLoading(false);
  }, [t.errorNetwork]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleReconnect = () => {
    setReconnecting(true);
    openConnectPopup("ads", () => {
      setReconnecting(false);
      fetchAccounts();
    });
  };

  // Group by portfolio
  const groupedAccounts = accounts.reduce((acc, curr) => {
    const p = curr.portfolio || t.noPortfolio;
    if (!acc[p]) acc[p] = [];
    acc[p].push(curr);
    return acc;
  }, {} as Record<string, AdAccount[]>);

  const portfolios = Object.keys(groupedAccounts).sort((a, b) => {
    if (a === t.noPortfolio) return 1;
    if (b === t.noPortfolio) return -1;
    return a.localeCompare(b);
  });

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        .portfolio-row { margin-bottom: 24px; }
        .adaccount-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--surface-hover); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 8px; }
      `}</style>

      <div style={{
        display: "flex", flexDirection: "column", gap: 0,
        minHeight: "100vh", padding: "0 0 40px",
        animation: "fadeIn 0.25s ease",
        fontFamily: "inherit",
      }}>

        {/* ── Top bar ─────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 28px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)", backdropFilter: "blur(20px)",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              onClick={() => router.back()}
              style={{
                background: "var(--surface-hover)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "5px 8px", cursor: "pointer", color: "var(--text-secondary)",
                display: "flex", alignItems: "center",
              }}
            >
              <ChevronLeft size={16} />
            </button>

            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "#0081FB",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,129,251,0.3)",
              color: "var(--foreground)",
            }}>
              <MetaIcon />
            </div>

            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: 0, letterSpacing: "-0.02em" }}>
                {t.title}
              </h1>
            </div>
          </div>

          <button
            onClick={handleReconnect}
            disabled={reconnecting}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 16px", borderRadius: 8,
              background: "var(--cyan-dim)",
              border: "1px solid var(--border-strong)",
              color: "var(--cyan)", fontSize: 12, fontWeight: 600,
              cursor: reconnecting ? "wait" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {reconnecting ? (
              <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Plus size={13} />
            )}
            {reconnecting ? t.opening : t.grantPermissions}
          </button>
        </div>

        {/* ── Subtitle ───────────────────────────────────────────── */}
        <div style={{ padding: "12px 28px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
            {t.subtitle}
          </p>
        </div>

        {/* ── Content ────────────────────────────────────────────── */}
        <div style={{ padding: "28px 28px 0" }}>

          {/* Error */}
          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 16px", borderRadius: 10,
              background: "var(--red-dim)", border: "1px solid var(--red)",
              color: "var(--red)", fontSize: 12, marginBottom: 20,
            }}>
              <AlertCircle size={14} />
              {error}
              <button onClick={fetchAccounts} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--red)", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontFamily: "inherit" }}>
                <RefreshCw size={11} /> {t.retry}
              </button>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...Array(2)].map((_, i) => (
                <div key={i} style={{ height: 68, borderRadius: 10, background: "var(--surface-hover)", animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}

          {/* Not connected */}
          {!loading && !connected && !error && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--cyan-dim)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "var(--cyan)" }}>
                <MetaIcon />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: "0 0 6px" }}>{t.notConnected}</p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 20px" }}>{t.connectPrompt}</p>
              <button
                onClick={handleReconnect}
                style={{ padding: "10px 20px", borderRadius: 8, background: "var(--cyan-dim)", border: "1px solid var(--border-strong)", color: "var(--cyan)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Plus size={13} /> {t.connectBtn}
              </button>
            </div>
          )}

          {/* Connected — Hierarchical List */}
          {!loading && connected && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{t.enabledAccounts}</h2>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 0" }}>
                    {accounts.length === 0 ? t.noPagesConnected : `${accounts.length} ${accounts.length !== 1 ? t.pagesLinked : t.pageLinked}`}
                  </p>
                </div>
                <button
                  onClick={handleReconnect}
                  disabled={reconnecting}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: "none", border: "none", cursor: reconnecting ? "wait" : "pointer",
                    color: "var(--cyan)", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                  }}
                >
                  <RefreshCw size={12} style={{ animation: reconnecting ? "spin 1s linear infinite" : "none" }} />
                  {t.renewAuth}
                </button>
              </div>

              {accounts.length === 0 && (
                <div style={{ padding: "40px 20px", textAlign: "center", borderRadius: 12, border: "1px dashed var(--border)", background: "var(--surface)" }}>
                  <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>
                    {t.noPages}
                  </p>
                </div>
              )}

              {portfolios.map(portfolio => (
                <div key={portfolio} className="portfolio-row">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: "var(--surface-hover)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                      <Building size={14} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", letterSpacing: "0.02em" }}>
                      {portfolio}
                    </span>
                  </div>
                  
                  <div style={{ paddingLeft: 12, borderLeft: "2px solid var(--border)", marginLeft: 11 }}>
                    {groupedAccounts[portfolio].map(account => (
                      <div key={account.id} className="adaccount-row">
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--cyan-dim)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cyan)", flexShrink: 0 }}>
                          <Database size={14} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{account.name}</p>
                          <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>ID: {account.id.replace('act_', '')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
