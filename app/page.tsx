"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { SodareLogo } from "@/components/ui/SodareLogo";
import { GalaxyBackground } from "@/components/ui/GalaxyBackground";
import { Orbi } from "@/components/ui/Orbi";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Zap,
  Target,
  Shield,
  Globe,
  TrendingUp,
  MessageSquare,
  ChevronDown,
  Sparkles,
  Activity,
  Eye,
  CheckCircle2,
  Clock,
  DollarSign,
  Users,
  LineChart,
  Inbox,
  MousePointerClick,
  X,
  ChevronRight,
  Play,
  Star,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   SODARE · Landing Page — Sales-Driven Design
   Optimized for LATAM market, conversion-first
   ═══════════════════════════════════════════════════════ */

// ── Animated counter ───────────────────────────────────
function useCounter(end: number, duration = 2000, start = 0, suffix = "") {
  const [value, setValue] = useState(start);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const steps = 60;
    const inc = (end - start) / steps;
    let current = start;
    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      current += inc;
      if (frame >= steps) { current = end; clearInterval(interval); }
      setValue(Math.round(current));
    }, duration / steps);
    return () => clearInterval(interval);
  }, [started, end, start, duration]);

  return { value: `${value.toLocaleString()}${suffix}`, ref };
}

// ── Scroll-reveal ──────────────────────────────────────
function useReveal(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setTimeout(() => setVisible(true), delay); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  return { ref, style: {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(28px)",
    transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  } as React.CSSProperties };
}

// ── Constants ──────────────────────────────────────────
const ORB = "'Orbitron', sans-serif";
const CYAN = "var(--cyan)";

const PAIN_POINTS = [
  { icon: <Clock style={{ width: 20, height: 20 }} />, stat: "10+", unit: "hrs/semana", problem: "perdidas cambiando entre plataformas", color: "var(--red)" },
  { icon: <DollarSign style={{ width: 20, height: 20 }} />, stat: "$500+", unit: "USD/mes", problem: "en herramientas que no se integran", color: "var(--amber)" },
  { icon: <Eye style={{ width: 20, height: 20 }} />, stat: "0%", unit: "visibilidad", problem: "del ROI real de tus campañas", color: "var(--purple)" },
];

const FEATURES = [
  { icon: <Target style={{ width: 20, height: 20 }} />, color: "var(--cyan)", title: "Anuncios", desc: "Meta, TikTok y Google Ads en una sola pantalla. Pausa, optimiza y escala campañas sin salir de Sodare.", tag: "IMPULSO", code: "Crecimiento" },
  { icon: <BarChart3 style={{ width: 20, height: 20 }} />, color: "var(--purple)", title: "Resumen", desc: "El pulso de tu operación en tiempo real. Dashboards que tu cliente entiende, con datos de todas tus cuentas.", tag: "PULSO", code: "Operación" },
  { icon: <MessageSquare style={{ width: 20, height: 20 }} />, color: "var(--emerald)", title: "Inbox", desc: "WhatsApp, Instagram DM y Messenger en un solo lugar. Nunca pierdas un lead por no responder a tiempo.", tag: "SEÑAL", code: "Operación" },
  { icon: <Sparkles style={{ width: 20, height: 20 }} />, color: "var(--amber)", title: "Briefs IA", desc: "Genera parrillas de contenido, copies y briefings en segundos. Personaliza tono, formato y canal.", tag: "NOVA", code: "Contenido" },
  { icon: <Bot style={{ width: 20, height: 20 }} />, color: "var(--red)", title: "Chatbots", desc: "Tu copiloto automático. Construye flujos conversacionales que atienden, califican y asignan leads 24/7.", tag: "PILOTO", code: "Automatización" },
  { icon: <Globe style={{ width: 20, height: 20 }} />, color: "#22d3ee", title: "Publicación", desc: "Programa y despega. Calendario visual para publicar en todas tus redes desde un solo lugar.", tag: "LANZADERA", code: "Contenido" },
];

const COMPARISONS = [
  { feature: "Anuncios multicanal (Meta, TikTok, Google)", sodare: true, others: "Solo redes sociales" },
  { feature: "Inbox unificado (WhatsApp + DMs)", sodare: true, others: "Extra o no disponible" },
  { feature: "Briefs IA para contenido y parrillas", sodare: true, others: "No incluido" },
  { feature: "Resumen y reportes de ROI automáticos", sodare: true, others: "Manual o básico" },
  { feature: "Precio en moneda local (MXN)", sodare: true, others: "Solo USD" },
  { feature: "Soporte en español", sodare: true, others: "Limitado" },
];

export default function Home() {
  const [scrollY, setScrollY] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const c1 = useCounter(4.8, 1800, 0, "x");
  const c2 = useCounter(12500, 1800, 0, "+");
  const c3 = useCounter(320, 1800, 0, "+");
  const c4 = useCounter(85, 1800, 0, "%");

  const navOpacity = Math.min(scrollY / 150, 0.95);

  /* ── JSON-LD Structured Data ── */
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "Sodare",
        "url": "https://sodare.xyz",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "description": "Plataforma de marketing multicanal que unifica campañas de Meta Ads, TikTok Ads, Google Ads, inbox de WhatsApp y reportes de ROI para agencias en LATAM.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "MXN",
          "description": "Plan gratuito disponible. Sin tarjeta de crédito."
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "5",
          "ratingCount": "3",
          "bestRating": "5"
        }
      },
      {
        "@type": "Organization",
        "name": "Sodare",
        "url": "https://sodare.xyz",
        "logo": "https://sodare.xyz/sodare-logo-1024.jpg",
        "contactPoint": {
          "@type": "ContactPoint",
          "email": "soporte@sodare.xyz",
          "contactType": "customer service",
          "availableLanguage": ["Spanish"]
        },
        "sameAs": []
      }
    ]
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", overflowX: "hidden", background: "var(--background)", color: "var(--foreground)" }}>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ─── CSS ─── */}
      <style>{`
        html { scroll-behavior: smooth; }
        @keyframes lp-gradient { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes lp-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes lp-scan { 0%{transform:translateY(-100%)} 100%{transform:translateY(100%)} }
        @keyframes lp-marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes lp-glow { 0%,100%{text-shadow:0 0 20px rgba(0,212,255,0.4)} 50%{text-shadow:0 0 40px rgba(0,212,255,0.7), 0 0 80px rgba(0,212,255,0.2)} }
        @keyframes lp-border { 0%,100%{border-color:rgba(0,212,255,0.15)} 50%{border-color:rgba(0,212,255,0.35)} }
        @keyframes lp-dash { 0%{stroke-dashoffset:100} 100%{stroke-dashoffset:0} }
        @keyframes lp-hero { 0%{opacity:0;transform:translateY(30px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes lp-hero-orbi { 0%{opacity:0;transform:scale(0.6)} 100%{opacity:1;transform:scale(1)} }
        @keyframes lp-orbi-ring { 0%{transform:scale(0.85);opacity:0.5} 50%{transform:scale(1.15);opacity:0.15} 100%{transform:scale(0.85);opacity:0.5} }
        @keyframes lp-orbi-ring2 { 0%{transform:scale(1.1);opacity:0.3} 50%{transform:scale(1.4);opacity:0.08} 100%{transform:scale(1.1);opacity:0.3} }
        @keyframes lp-speech { 0%{opacity:0;transform:translateY(10px) scale(0.95)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes lp-mockup-float { 0%,100%{transform:perspective(1200px) rotateY(-8deg) rotateX(4deg) translateY(0)} 50%{transform:perspective(1200px) rotateY(-8deg) rotateX(4deg) translateY(-10px)} }
        .lp-hero-anim { animation: lp-hero 0.8s cubic-bezier(0.16,1,0.3,1) both; }
        .lp-card:hover { transform: translateY(-4px) !important; border-color: rgba(0,212,255,0.3) !important; box-shadow: 0 16px 40px rgba(0,0,0,0.35), 0 0 20px rgba(0,212,255,0.08) !important; }
        .lp-btn:hover { transform: translateY(-2px); box-shadow: 0 0 30px rgba(0,212,255,0.45), 0 8px 25px rgba(0,0,0,0.25) !important; }
        .lp-link:hover { color: var(--cyan) !important; }
        .lp-row:hover { background: var(--surface-hover) !important; }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
        @media (max-width: 768px) {
          .lp-hero-grid { grid-template-columns: 1fr !important; }
          .lp-hero-mockup { display: none !important; }
          .lp-hero-orbi { transform: scale(0.65) !important; }
          .lp-features-grid { grid-template-columns: 1fr !important; }
          .lp-compare-table { font-size: 11px !important; }
          .lp-pain-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .lp-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .lp-features-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      <GalaxyBackground />
      <div className="dashboard-grid" />

      {/* Ambient */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-15%", left: "-5%", width: "55%", height: "55%", background: "radial-gradient(ellipse, rgba(0,212,255,0.06) 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-8%", width: "45%", height: "45%", background: "radial-gradient(ellipse, rgba(123,97,255,0.04) 0%, transparent 70%)", filter: "blur(60px)" }} />
      </div>

      {/* ═══ NAVBAR ═══ */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: `rgba(4,7,14,${navOpacity})`,
        backdropFilter: scrollY > 20 ? "blur(16px) saturate(1.3)" : "none",
        borderBottom: scrollY > 20 ? "1px solid var(--border)" : "1px solid transparent",
        transition: "all 0.3s",
      }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "12px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none" }}><SodareLogo size="sm" /></Link>
          <nav style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {[["#problema", "Problema"], ["#solucion", "Solución"], ["#comparar", "Comparar"]].map(([href, label]) => (
              <a key={href} href={href} className="lp-link" style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.2s" }}>
                {label}
              </a>
            ))}
            <Link href="/login" className="lp-btn" aria-label="Acceder a Sodare" style={{
              padding: "8px 22px", borderRadius: 8,
              background: "linear-gradient(135deg, var(--cyan) 0%, #4f46e5 100%)",
              color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const,
              textDecoration: "none", boxShadow: "0 4px 16px rgba(0,212,255,0.25)",
              transition: "all 0.25s",
            }}>
              Acceder
            </Link>
          </nav>
        </div>
      </header>

      <main>
      {/* ═══════════════════════════════════════════════
         HERO — Orbi-Centered Protagonist Layout
         ═══════════════════════════════════════════════ */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 40px 32px", maxWidth: 1440, margin: "0 auto", width: "100%" }}>
        <div className="lp-hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 32, alignItems: "center", minHeight: "calc(100vh - 112px)" }}>

          {/* Left — Copy */}
          <div className="lp-hero-anim" style={{ maxWidth: 520 }}>
            {/* Social proof badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "5px 14px", borderRadius: 20,
              background: "rgba(6,214,160,0.08)", border: "1px solid rgba(6,214,160,0.25)",
              marginBottom: 24,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--emerald)", boxShadow: "0 0 8px var(--emerald)" }} />
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "var(--emerald)" }}>
                +320 campañas activas ahora mismo
              </span>
            </div>

            <h1 style={{
              fontFamily: ORB, fontWeight: 900,
              fontSize: "clamp(28px, 4vw, 48px)", lineHeight: 1.1,
              marginBottom: 20,
            }}>
              Deja de adivinar.{" "}
              <span style={{
                background: "linear-gradient(135deg, var(--cyan), #4f46e5, var(--cyan))",
                backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                backgroundClip: "text", animation: "lp-gradient 4s ease infinite",
              }}>
                Empieza a escalar.
              </span>
            </h1>

            <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 28, maxWidth: 440 }}>
              Sodare unifica tus campañas de <strong style={{ color: "var(--foreground)" }}>Meta, TikTok y Google Ads</strong>,
              tu inbox de <strong style={{ color: "var(--foreground)" }}>WhatsApp y DMs</strong>,
              y tus reportes de ROI en <strong style={{ color: "var(--foreground)" }}>una sola plataforma</strong>.
              Para agencias y anunciantes que quieren resultados, no más pestañas.
            </p>

            {/* CTA */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
              <Link href="/login" className="lp-btn" aria-label="Empezar gratis con Sodare" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 28px", borderRadius: 10,
                background: "linear-gradient(135deg, var(--cyan) 0%, #4f46e5 100%)",
                color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: "0.04em",
                textDecoration: "none", boxShadow: "0 6px 25px rgba(0,212,255,0.3)",
                transition: "all 0.25s",
              }}>
                Empezar gratis <ArrowRight style={{ width: 16, height: 16 }} />
              </Link>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Sin tarjeta de crédito · Setup en 2 min
              </span>
            </div>

            {/* Trust logos as text chips */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--text-muted)", fontFamily: ORB }}>
                Conecta:
              </span>
              {["Meta Ads", "TikTok Ads", "Google Ads", "WhatsApp"].map(p => (
                <span key={p} style={{
                  padding: "4px 12px", borderRadius: 6,
                  background: "var(--surface)", border: "1px solid var(--border)",
                  fontSize: 10, fontWeight: 600, color: "var(--text-secondary)",
                }}>
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* Center — ORBI as Hero Protagonist */}
          <div className="lp-hero-orbi" style={{
            position: "relative",
            display: "flex", flexDirection: "column", alignItems: "center",
            animation: "lp-hero-orbi 1s cubic-bezier(0.16,1,0.3,1) 0.3s both",
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.8s ease 0.3s",
          }}>
            {/* Glow rings behind Orbi */}
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              width: 260, height: 260, marginTop: -130, marginLeft: -130,
              borderRadius: "50%",
              border: "1.5px solid rgba(0,212,255,0.15)",
              animation: "lp-orbi-ring 4s ease-in-out infinite",
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              width: 340, height: 340, marginTop: -170, marginLeft: -170,
              borderRadius: "50%",
              border: "1px solid rgba(0,212,255,0.08)",
              animation: "lp-orbi-ring2 5s ease-in-out infinite 1s",
              pointerEvents: "none",
            }} />
            {/* Radial glow behind Orbi */}
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              width: 300, height: 300, marginTop: -150, marginLeft: -150,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(0,212,255,0.12) 0%, rgba(79,70,229,0.06) 40%, transparent 70%)",
              filter: "blur(20px)", pointerEvents: "none",
            }} />

            <Orbi scale={1.0} state="idle" />

            {/* Speech bubble */}
            <div style={{
              marginTop: 8,
              padding: "10px 18px", borderRadius: 12,
              background: "var(--surface)", border: "1px solid var(--border)",
              backdropFilter: "blur(12px)",
              position: "relative",
              animation: "lp-speech 0.6s cubic-bezier(0.16,1,0.3,1) 1s both",
              maxWidth: 200, textAlign: "center",
            }}>
              {/* Arrow pointing up */}
              <div style={{
                position: "absolute", top: -6, left: "50%", marginLeft: -6,
                width: 12, height: 12, borderRadius: 2,
                background: "var(--surface)", border: "1px solid var(--border)",
                borderBottom: "none", borderRight: "none",
                transform: "rotate(45deg)",
              }} />
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--cyan)", fontFamily: ORB, letterSpacing: "0.03em", lineHeight: 1.4 }}>
                ¡Hola! Soy Orbi 👋
              </p>
              <p style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>
                Tu copiloto de marketing
              </p>
            </div>
          </div>

          {/* Right — Dashboard Mockup */}
          <div className="lp-hero-mockup" style={{
            position: "relative",
            animation: "lp-mockup-float 6s ease-in-out infinite",
          }}>
            {/* Mock Dashboard */}
            <div style={{
              borderRadius: 16, overflow: "hidden",
              border: "1px solid var(--border-strong)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.5), 0 0 40px rgba(0,212,255,0.08)",
              background: "var(--bg-raised)",
              maxWidth: 420,
            }}>
              {/* Titlebar */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
                <span style={{ marginLeft: 12, fontSize: 10, color: "var(--text-muted)", fontFamily: ORB, letterSpacing: "0.1em" }}>SODARE · DASHBOARD</span>
              </div>

              {/* KPI Row */}
              <div style={{ padding: "16px 16px 0", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {[
                  { label: "ROAS", value: "4.8x", delta: "+23%", color: "var(--emerald)" },
                  { label: "CPL", value: "$12.40", delta: "-18%", color: "var(--emerald)" },
                  { label: "CONVERSIONES", value: "1,247", delta: "+45%", color: "var(--emerald)" },
                ].map((kpi, i) => (
                  <div key={i} style={{
                    padding: "12px 14px", borderRadius: 10,
                    background: "var(--surface)", border: "1px solid var(--border)",
                    position: "relative", overflow: "hidden",
                  }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${kpi.color}, transparent)` }} />
                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.15em", color: "var(--text-muted)", fontFamily: ORB, marginBottom: 4 }}>{kpi.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, fontFamily: ORB, color: "var(--foreground)" }}>{kpi.value}</div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: kpi.color }}>{kpi.delta}</span>
                  </div>
                ))}
              </div>

              {/* Chart placeholder */}
              <div style={{ padding: "12px 16px 16px" }}>
                <div style={{
                  height: 120, borderRadius: 10,
                  background: "var(--surface)", border: "1px solid var(--border)",
                  display: "flex", alignItems: "flex-end", justifyContent: "space-around",
                  padding: "12px 16px 8px", position: "relative", overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", top: 8, left: 12, fontSize: 8, fontWeight: 700, letterSpacing: "0.15em", color: "var(--text-muted)", fontFamily: ORB }}>
                    RENDIMIENTO · 30 DÍAS
                  </div>
                  {[35, 45, 30, 60, 55, 72, 65, 80, 75, 90, 85, 95].map((h, i) => (
                    <div key={i} style={{
                      width: "6%", height: `${h}%`, borderRadius: 3,
                      background: i >= 10 ? "linear-gradient(to top, var(--cyan), #4f46e5)" : "rgba(0,212,255,0.15)",
                      transition: "height 0.5s ease",
                    }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF BAR ═══ */}
      <section style={{ position: "relative", zIndex: 1, padding: "12px 40px 32px", maxWidth: 1440, margin: "0 auto", width: "100%" }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 32,
          padding: "14px 24px", borderRadius: 10,
          background: "var(--surface)", border: "1px solid var(--border)",
          backdropFilter: "blur(12px)", flexWrap: "wrap",
        }}>
          {[
            { icon: <Shield style={{ width: 14, height: 14 }} />, text: "Cifrado end-to-end", color: "var(--emerald)" },
            { icon: <CheckCircle2 style={{ width: 14, height: 14 }} />, text: "OAuth 2.0 verificado", color: "var(--emerald)" },
            { icon: <Activity style={{ width: 14, height: 14 }} />, text: "99.9% uptime", color: "var(--emerald)" },
            { icon: <Globe style={{ width: 14, height: 14 }} />, text: "Soporte 100% en español", color: "var(--cyan)" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, color: "var(--text-secondary)" }}>
              <span style={{ color: item.color, display: "flex" }}>{item.icon}</span>{item.text}
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
         PAIN POINTS — "Tu día actual"
         ═══════════════════════════════════════════════ */}
      <section id="problema" style={{ position: "relative", zIndex: 1, padding: "48px 40px", maxWidth: 1440, margin: "0 auto", width: "100%" }}>
        <SectionReveal>
          <SectionHeader tag="EL PROBLEMA" tagColor="var(--red)" title="¿Tu marketing se siente así?" />

          <div className="lp-pain-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 32 }}>
            {PAIN_POINTS.map((p, i) => (
              <div key={i} style={{
                padding: "24px 20px", borderRadius: 14,
                background: "var(--surface)", border: "1px solid var(--border)",
                backdropFilter: "blur(12px)", textAlign: "center", position: "relative", overflow: "hidden",
                transition: "all 0.3s",
              }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${p.color}, transparent)` }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 8 }}>
                  <span style={{ fontFamily: ORB, fontSize: 28, fontWeight: 900, color: p.color }}>{p.stat}</span>
                  <span style={{ fontFamily: ORB, fontSize: 11, fontWeight: 600, color: p.color, letterSpacing: "0.08em" }}>{p.unit}</span>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{p.problem}</p>
              </div>
            ))}
          </div>

          <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--text-secondary)" }}>
            Si gestionas campañas en <strong style={{ color: "var(--foreground)" }}>México o LATAM</strong>, sabes que el problema no es falta de datos —
            es que están <strong style={{ color: "var(--foreground)" }}>dispersos en 5 plataformas diferentes</strong>.
          </p>
        </SectionReveal>
      </section>

      {/* ═══════════════════════════════════════════════
         SOLUTION — Features Grid
         ═══════════════════════════════════════════════ */}
      <section id="solucion" style={{ position: "relative", zIndex: 1, padding: "48px 40px", maxWidth: 1440, margin: "0 auto", width: "100%" }}>
        <SectionReveal>
          <SectionHeader tag="LA SOLUCIÓN" tagColor="var(--cyan)" title="Una plataforma. Todos tus canales." subtitle="Sodare reemplaza 5 herramientas separadas con una sola experiencia diseñada para agencias y anunciantes en LATAM." />

          <div className="lp-features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 32 }}>
            {FEATURES.map((f, i) => (
              <FeatureCard key={i} {...f} delay={i * 80} />
            ))}
          </div>
        </SectionReveal>
      </section>

      {/* ═══════════════════════════════════════════════
         HOW IT WORKS — 3 Steps
         ═══════════════════════════════════════════════ */}
      <section style={{ position: "relative", zIndex: 1, padding: "48px 40px", maxWidth: 1440, margin: "0 auto", width: "100%" }}>
        <SectionReveal>
          <SectionHeader tag="CÓMO FUNCIONA" tagColor="var(--amber)" title="Tres pasos. Cero complicaciones." />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 32 }}>
            {[
              { step: "01", title: "Conecta tus canales", desc: "Vincula Meta, TikTok, Google y WhatsApp desde Integraciones. OAuth seguro, sin tokens manuales.", icon: <Globe style={{ width: 20, height: 20 }} />, color: "var(--cyan)" },
              { step: "02", title: "Centraliza en Resumen", desc: "Campañas, métricas y conversaciones fluyen a tu dashboard Resumen en tiempo real. Un solo login.", icon: <LineChart style={{ width: 20, height: 20 }} />, color: "var(--purple)" },
              { step: "03", title: "Optimiza con Briefs IA", desc: "Briefs IA genera contenido. Los Chatbots ejecutan. Tú solo decides y escalas.", icon: <TrendingUp style={{ width: 20, height: 20 }} />, color: "var(--emerald)" },
            ].map((s, i) => (
              <div key={i} className="lp-card" style={{
                padding: "28px 24px", borderRadius: 14,
                background: "var(--surface)", border: "1px solid var(--border)",
                backdropFilter: "blur(12px)", position: "relative", overflow: "hidden",
                transition: "all 0.35s",
              }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                <div style={{ position: "absolute", top: 8, right: 14, fontFamily: ORB, fontSize: 40, fontWeight: 900, color: "rgba(0,212,255,0.05)", lineHeight: 1 }}>{s.step}</div>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `${s.color}12`, border: `1px solid ${s.color}25`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 16, color: s.color,
                }}>
                  {s.icon}
                </div>
                <h3 style={{ fontFamily: ORB, fontSize: 14, fontWeight: 700, marginBottom: 8, letterSpacing: "0.02em" }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </SectionReveal>
      </section>

      {/* ═══════════════════════════════════════════════
         MID-PAGE CTA — Catch users before they lose interest
         ═══════════════════════════════════════════════ */}
      <section style={{ position: "relative", zIndex: 1, padding: "32px 40px", maxWidth: 900, margin: "0 auto", width: "100%" }}>
        <SectionReveal>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 24,
            padding: "28px 32px", borderRadius: 16,
            background: "linear-gradient(135deg, rgba(0,212,255,0.05) 0%, rgba(79,70,229,0.05) 100%)",
            border: "1px solid rgba(0,212,255,0.15)",
            backdropFilter: "blur(12px)",
            flexWrap: "wrap" as const,
          }}>
            <div style={{ flex: "0 0 auto" }}>
              <Orbi scale={0.35} state="success" />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontFamily: ORB, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                Ya sabes cómo funciona.
              </p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Crea tu cuenta en 2 minutos y conecta tu primer canal hoy.
              </p>
            </div>
            <Link href="/login" className="lp-btn" aria-label="Probar Sodare gratis" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 24px", borderRadius: 10,
              background: "linear-gradient(135deg, var(--cyan) 0%, #4f46e5 100%)",
              color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em",
              textDecoration: "none", boxShadow: "0 6px 20px rgba(0,212,255,0.25)",
              transition: "all 0.25s", whiteSpace: "nowrap" as const,
            }}>
              Probar gratis <ArrowRight style={{ width: 14, height: 14 }} />
            </Link>
          </div>
        </SectionReveal>
      </section>

      {/* ═══════════════════════════════════════════════
         STATS
         ═══════════════════════════════════════════════ */}
      <section style={{ position: "relative", zIndex: 1, padding: "48px 40px", maxWidth: 1440, margin: "0 auto", width: "100%" }}>
        <SectionReveal>
          <div style={{ height: 1, background: "linear-gradient(90deg, transparent, var(--border-strong), transparent)", marginBottom: 32 }} />

          <div className="lp-pain-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {[
              { refP: c1, label: "ROAS Promedio", icon: <TrendingUp style={{ width: 18, height: 18 }} />, color: "var(--emerald)" },
              { refP: c2, label: "Conversaciones", icon: <MessageSquare style={{ width: 18, height: 18 }} />, color: "var(--cyan)" },
              { refP: c3, label: "Campañas Activas", icon: <Target style={{ width: 18, height: 18 }} />, color: "var(--purple)" },
              { refP: c4, label: "Clientes Satisfechos", icon: <Users style={{ width: 18, height: 18 }} />, color: "var(--amber)" },
            ].map((s, i) => (
              <div key={i} ref={s.refP.ref} style={{
                padding: "24px 16px", borderRadius: 14, textAlign: "center",
                background: "var(--surface)", border: "1px solid var(--border)",
                position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: `${s.color}12`, border: `1px solid ${s.color}25`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 12px", color: s.color,
                }}>
                  {s.icon}
                </div>
                <div style={{ fontFamily: ORB, fontSize: 28, fontWeight: 900, lineHeight: 1, marginBottom: 4 }}>{s.refP.value}</div>
                <div style={{ fontFamily: ORB, fontSize: 8, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase" as const, color: "var(--text-secondary)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </SectionReveal>
      </section>

      {/* ═══════════════════════════════════════════════
         COMPARISON TABLE — vs Hootsuite / Metricool
         ═══════════════════════════════════════════════ */}
      <section id="comparar" style={{ position: "relative", zIndex: 1, padding: "48px 40px", maxWidth: 1000, margin: "0 auto", width: "100%" }}>
        <SectionReveal>
          <SectionHeader tag="COMPARA" tagColor="var(--cyan)" title="Sodare vs. las alternativas" subtitle="¿Por qué pagar por 3 herramientas cuando puedes tener una que hace todo?" />

          <div className="lp-compare-table" style={{
            marginTop: 24, borderRadius: 14, overflow: "hidden",
            border: "1px solid var(--border)", background: "var(--surface)",
            backdropFilter: "blur(12px)",
          }}>
            {/* Header */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 120px 140px",
              padding: "12px 20px", borderBottom: "1px solid var(--border)",
              background: "rgba(0,212,255,0.04)",
            }}>
              <span style={{ fontFamily: ORB, fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", color: "var(--text-muted)" }}>FUNCIONALIDAD</span>
              <span style={{ fontFamily: ORB, fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", color: "var(--cyan)", textAlign: "center" }}>SODARE</span>
              <span style={{ fontFamily: ORB, fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", color: "var(--text-muted)", textAlign: "center" }}>OTROS</span>
            </div>
            {COMPARISONS.map((row, i) => (
              <div key={i} className="lp-row" style={{
                display: "grid", gridTemplateColumns: "1fr 120px 140px",
                padding: "12px 20px", borderBottom: i < COMPARISONS.length - 1 ? "1px solid var(--hairline)" : "none",
                transition: "background 0.15s",
              }}>
                <span style={{ fontSize: 13, color: "var(--foreground)", fontWeight: 500 }}>{row.feature}</span>
                <span style={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CheckCircle2 style={{ width: 16, height: 16, color: "var(--emerald)" }} />
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>{row.others}</span>
              </div>
            ))}
          </div>
        </SectionReveal>
      </section>

      {/* ═══════════════════════════════════════════════
         TESTIMONIALS — Social proof
         ═══════════════════════════════════════════════ */}
      <section style={{ position: "relative", zIndex: 1, padding: "48px 40px", maxWidth: 1440, margin: "0 auto", width: "100%" }}>
        <SectionReveal>
          <SectionHeader tag="TESTIMONIOS" tagColor="var(--amber)" title="Lo que dicen nuestros usuarios" />

          <div className="lp-features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 24 }}>
            {[
              { name: "Ana García", role: "Directora, Agencia 360°", text: "Antes usábamos Hootsuite + Google Sheets + WhatsApp Web. Ahora todo está en Sodare. Ahorramos 15 horas a la semana.", stars: 5, avatar: "AG" },
              { name: "Carlos Mendoza", role: "Marketing Manager, E-commerce", text: "Por fin puedo mostrarle al cliente el ROI real de sus campañas sin pasar 3 horas armando reportes. Los dashboards son increíbles.", stars: 5, avatar: "CM" },
              { name: "Valeria Ríos", role: "Brand Manager, Startup SaaS", text: "Briefs IA nos cambió la vida. Generamos las parrillas de contenido del mes en 20 minutos. Antes nos tomaba 2 días.", stars: 5, avatar: "VR" },
            ].map((t, i) => (
              <div key={i} className="lp-card" style={{
                padding: "24px 20px", borderRadius: 14,
                background: "var(--surface)", border: "1px solid var(--border)",
                backdropFilter: "blur(12px)", position: "relative", overflow: "hidden",
                transition: "all 0.35s",
              }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, var(--amber), transparent)" }} />
                {/* Stars */}
                <div style={{ display: "flex", gap: 2, marginBottom: 12 }}>
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} style={{ width: 14, height: 14, fill: "var(--amber)", color: "var(--amber)" }} />
                  ))}
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 16, fontStyle: "italic" }}>
                  &ldquo;{t.text}&rdquo;
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--cyan), #4f46e5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: ORB,
                  }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionReveal>
      </section>

      {/* ═══════════════════════════════════════════════
         ¿PARA QUIÉN? — Target personas
         ═══════════════════════════════════════════════ */}
      <section style={{ position: "relative", zIndex: 1, padding: "48px 40px", maxWidth: 1440, margin: "0 auto", width: "100%" }}>
        <SectionReveal>
          <SectionHeader tag="¿PARA QUIÉN?" tagColor="var(--emerald)" title="Diseñado para equipos que viven de resultados" />

          <div className="lp-pain-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 24 }}>
            {[
              { title: "Agencias de Marketing", desc: "Gestiona múltiples clientes, genera reportes automáticos y demuestra ROI sin Excel. Aprobaciones integradas.", icon: <Users style={{ width: 20, height: 20 }} />, color: "var(--cyan)" },
              { title: "Marcas y E-commerce", desc: "Centraliza tus canales, optimiza tu inversión publicitaria y responde a tus clientes desde un solo inbox.", icon: <Target style={{ width: 20, height: 20 }} />, color: "var(--purple)" },
              { title: "Freelancers y Consultores", desc: "Herramientas enterprise a precio accesible. Impresiona a tus clientes con dashboards profesionales.", icon: <Sparkles style={{ width: 20, height: 20 }} />, color: "var(--emerald)" },
            ].map((p, i) => (
              <div key={i} className="lp-card" style={{
                padding: "24px 20px", borderRadius: 14,
                background: "var(--surface)", border: "1px solid var(--border)",
                backdropFilter: "blur(12px)", position: "relative", overflow: "hidden",
                transition: "all 0.35s",
              }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${p.color}, transparent)` }} />
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `${p.color}12`, border: `1px solid ${p.color}25`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 14, color: p.color,
                }}>
                  {p.icon}
                </div>
                <h3 style={{ fontFamily: ORB, fontSize: 14, fontWeight: 700, marginBottom: 6, letterSpacing: "0.02em" }}>{p.title}</h3>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </SectionReveal>
      </section>

      {/* ═══════════════════════════════════════════════
         FINAL CTA
         ═══════════════════════════════════════════════ */}
      <section style={{ position: "relative", zIndex: 1, padding: "48px 40px 64px", maxWidth: 900, margin: "0 auto", width: "100%" }}>
        <SectionReveal>
          <div style={{
            padding: "40px 32px", borderRadius: 20,
            background: "var(--surface)", border: "1px solid var(--border)",
            backdropFilter: "blur(16px)", textAlign: "center",
            position: "relative", overflow: "hidden",
            animation: "lp-border 4s ease-in-out infinite",
          }}>
            {/* Scan line */}
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
              <div style={{ position: "absolute", left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, var(--cyan), transparent)", opacity: 0.25, animation: "lp-scan 3.5s ease-in-out infinite" }} />
            </div>

            <div style={{ position: "relative", zIndex: 1 }}>
              <h2 style={{ fontFamily: ORB, fontWeight: 800, fontSize: "clamp(22px, 3.5vw, 32px)", lineHeight: 1.2, marginBottom: 12, animation: "lp-glow 3s ease-in-out infinite" }}>
                Tu marketing merece un centro de mando.
              </h2>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 24, maxWidth: 480, margin: "0 auto 24px" }}>
                Únete a los equipos que ya dejaron de saltar entre pestañas y empezaron a ver resultados reales.
              </p>
              <Link href="/login" className="lp-btn" aria-label="Crear cuenta gratis en Sodare" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 36px", borderRadius: 10,
                background: "linear-gradient(135deg, var(--cyan) 0%, #4f46e5 100%)",
                color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: "0.06em",
                textDecoration: "none", boxShadow: "0 8px 30px rgba(0,212,255,0.35)",
                transition: "all 0.25s",
              }}>
                Crear cuenta gratis <ArrowRight style={{ width: 16, height: 16 }} />
              </Link>
              <p style={{ marginTop: 12, fontSize: 11, color: "var(--text-muted)" }}>Sin tarjeta · Setup en 2 min · Cancela cuando quieras</p>
            </div>
          </div>
        </SectionReveal>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ position: "relative", zIndex: 1, borderTop: "1px solid var(--border)", marginTop: "auto" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "36px 40px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 32, flexWrap: "wrap" }}>
            <div style={{ maxWidth: 260 }}>
              <SodareLogo size="sm" animated={false} />
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10, lineHeight: 1.6 }}>
                Plataforma de inteligencia multicanal para agencias y anunciantes directos en México y LATAM.
              </p>
            </div>
            <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
              <FooterCol title="Legal" links={[
                { label: "Términos de Servicio", href: "/condiciones-del-servicio" },
                { label: "Política de Privacidad", href: "/aviso-de-privacidad" },
                { label: "Eliminación de Datos", href: "/data-deletion" },
              ]} />
              <FooterCol title="Producto" links={[
                { label: "Iniciar Sesión", href: "/login" },
                { label: "Contacto", href: "mailto:soporte@sodare.xyz" },
              ]} />
            </div>
          </div>
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--hairline)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>© {new Date().getFullYear()} Sodare. Todos los derechos reservados.</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Hecho en México 🇲🇽</span>
          </div>
        </div>
      </footer>
      </main>
    </div>
  );
}

/* ═══ REUSABLE COMPONENTS ═══ */

function SectionReveal({ children }: { children: React.ReactNode }) {
  const r = useReveal(0);
  return <div ref={r.ref} style={r.style}>{children}</div>;
}

function SectionHeader({ tag, tagColor, title, subtitle }: { tag: string; tagColor: string; title: string; subtitle?: string }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 8 }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 24, height: 1, background: tagColor }} />
        <span style={{ fontFamily: ORB, fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: tagColor }}>{tag}</span>
        <div style={{ width: 24, height: 1, background: tagColor }} />
      </div>
      <h2 style={{ fontFamily: ORB, fontSize: "clamp(22px, 3.5vw, 34px)", fontWeight: 800, lineHeight: 1.2, marginBottom: subtitle ? 10 : 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>{subtitle}</p>}
    </div>
  );
}

function FeatureCard({ icon, color, title, desc, tag, delay }: {
  icon: React.ReactElement; color: string; title: string; desc: string; tag: string; delay: number;
}) {
  const r = useReveal(delay);
  return (
    <div ref={r.ref} style={r.style}>
      <div className="lp-card" style={{
        padding: "24px 20px", borderRadius: 14,
        background: "var(--surface)", border: "1px solid var(--border)",
        backdropFilter: "blur(16px)", height: "100%",
        position: "relative", overflow: "hidden",
        transition: "all 0.35s",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
        <div style={{ position: "absolute", top: 0, left: 0, width: 60, height: 60, background: `radial-gradient(ellipse at top left, ${color}10, transparent 70%)`, pointerEvents: "none" }} />
        <span style={{ fontFamily: ORB, fontSize: 7, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, color, marginBottom: 12, display: "block" }}>{tag}</span>
        <div style={{
          width: 38, height: 38, borderRadius: 8,
          background: `${color}10`, border: `1px solid ${color}20`,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 12, color,
        }}>
          {icon}
        </div>
        <h3 style={{ fontFamily: ORB, fontSize: 14, fontWeight: 700, marginBottom: 6, letterSpacing: "0.02em" }}>{title}</h3>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>{desc}</p>
      </div>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 style={{ fontFamily: ORB, fontSize: 8, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "var(--text-secondary)", marginBottom: 10 }}>{title}</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {links.map(l => (
          <Link key={l.href} href={l.href} className="lp-link" style={{ fontSize: 12, color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.2s" }}>{l.label}</Link>
        ))}
      </div>
    </div>
  );
}
