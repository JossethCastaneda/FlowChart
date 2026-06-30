"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { SodareLogo } from "@/components/ui/SodareLogo";
import { Orbi } from "@/components/ui/Orbi";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Target,
  Shield,
  Globe,
  TrendingUp,
  MessageSquare,
  Sparkles,
  Activity,
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  Users,
  LineChart,
  Star,
  ChevronRight,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   SODARE · Landing Page — Apple-Inspired Cinematic Design
   Typography-driven, generous whitespace, scroll reveals
   ═══════════════════════════════════════════════════════ */

// ── Scroll-triggered reveal ────────────────────────────
function useReveal(delay = 0, threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setTimeout(() => setVisible(true), delay); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay, threshold]);

  return { ref, visible, style: {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(40px)",
    transition: `opacity 0.9s cubic-bezier(0.25,1,0.5,1) ${delay}ms, transform 0.9s cubic-bezier(0.25,1,0.5,1) ${delay}ms`,
  } as React.CSSProperties };
}

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

// ── Constants ──────────────────────────────────────────
const ACCENT = "var(--cyan)";

const FEATURES = [
  { icon: <Target style={{ width: 24, height: 24 }} />, color: "var(--cyan)", title: "Anuncios", codename: "Impulso", desc: "Meta, TikTok y Google Ads en una sola pantalla. Pausa, optimiza y escala campañas sin salir de Sodare." },
  { icon: <BarChart3 style={{ width: 24, height: 24 }} />, color: "var(--purple)", title: "Resumen", codename: "Pulso", desc: "El pulso de tu operación en tiempo real. Dashboards que tu cliente entiende, con datos de todas tus cuentas." },
  { icon: <MessageSquare style={{ width: 24, height: 24 }} />, color: "var(--emerald)", title: "Inbox", codename: "Señal", desc: "WhatsApp, Instagram DM y Messenger en un solo lugar. Nunca pierdas un lead por no responder a tiempo." },
  { icon: <Sparkles style={{ width: 24, height: 24 }} />, color: "var(--amber)", title: "Briefs IA", codename: "Nova", desc: "Genera parrillas de contenido, copies y briefings en segundos. Personaliza tono, formato y canal." },
  { icon: <Bot style={{ width: 24, height: 24 }} />, color: "var(--red)", title: "Chatbots", codename: "Piloto", desc: "Tu copiloto automático. Construye flujos conversacionales que atienden, califican y asignan leads 24/7." },
  { icon: <Globe style={{ width: 24, height: 24 }} />, color: "#22d3ee", title: "Publicación", codename: "Lanzadera", desc: "Programa y despega. Calendario visual para publicar en todas tus redes desde un solo lugar." },
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
  const [mobileMenu, setMobileMenu] = useState(false);

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

  const navOpacity = Math.min(scrollY / 200, 0.92);

  // JSON-LD
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
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "MXN", "description": "Plan gratuito disponible." },
        "aggregateRating": { "@type": "AggregateRating", "ratingValue": "5", "ratingCount": "3", "bestRating": "5" }
      },
      {
        "@type": "Organization",
        "name": "Sodare",
        "url": "https://sodare.xyz",
        "logo": "https://sodare.xyz/sodare-logo-1024.jpg",
        "contactPoint": { "@type": "ContactPoint", "email": "soporte@sodare.xyz", "contactType": "customer service", "availableLanguage": ["Spanish"] },
        "sameAs": []
      }
    ]
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#000", color: "#f5f5f7" }}>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ─── CSS ─── */}
      <style>{`
        html { scroll-behavior: smooth; }
        @keyframes apple-fade-up { 0% { opacity: 0; transform: translateY(30px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes apple-glow { 0%,100% { opacity: 0.4; } 50% { opacity: 0.7; } }
        @keyframes apple-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
        @keyframes apple-orbi-ring { 0%,100% { transform: scale(0.9); opacity: 0.3; } 50% { transform: scale(1.2); opacity: 0.08; } }
        @keyframes apple-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(0,212,255,0.3); } 50% { box-shadow: 0 0 0 12px rgba(0,212,255,0); } }
        @keyframes apple-gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }

        .apple-hero-h1 { animation: apple-fade-up 1s cubic-bezier(0.25,1,0.5,1) 0.2s both; }
        .apple-hero-sub { animation: apple-fade-up 1s cubic-bezier(0.25,1,0.5,1) 0.5s both; }
        .apple-hero-cta { animation: apple-fade-up 1s cubic-bezier(0.25,1,0.5,1) 0.7s both; }
        .apple-hero-orbi { animation: apple-fade-up 1.2s cubic-bezier(0.25,1,0.5,1) 0s both; }

        .apple-pill { display: inline-flex; align-items: center; gap: 8px; padding: 16px 32px; border-radius: 980px; font-size: 17px; font-weight: 600; text-decoration: none; transition: all 0.3s; cursor: pointer; }
        .apple-pill-primary { background: var(--cyan); color: #000; }
        .apple-pill-primary:hover { background: #33e0ff; }
        .apple-pill-secondary { background: transparent; color: var(--cyan); border: none; padding: 16px 8px; }
        .apple-pill-secondary:hover { text-decoration: underline; }

        .apple-card { border-radius: 20px; overflow: hidden; transition: transform 0.4s cubic-bezier(0.25,1,0.5,1); }
        .apple-card:hover { transform: scale(1.02); }

        .apple-link { color: var(--cyan); text-decoration: none; font-size: 17px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; transition: gap 0.25s; }
        .apple-link:hover { gap: 8px; }

        .apple-row:hover { background: rgba(255,255,255,0.03) !important; }

        .apple-nav-link { font-size: 12px; font-weight: 400; color: rgba(245,245,247,0.65); text-decoration: none; transition: color 0.25s; }
        .apple-nav-link:hover { color: #f5f5f7; }

        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }

        .apple-nav-links { display: flex; align-items: center; gap: 28px; }
        .apple-burger { display: none; background: none; border: none; cursor: pointer; padding: 8px; color: #f5f5f7; }
        .apple-mobile-menu { display: none; }

        @media (max-width: 768px) {
          .apple-features-grid { grid-template-columns: 1fr !important; }
          .apple-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .apple-pain-grid { grid-template-columns: 1fr !important; max-width: 400px; margin-left: auto; margin-right: auto; }
          .apple-steps-grid { grid-template-columns: 1fr !important; max-width: 400px; margin-left: auto; margin-right: auto; }
          .apple-hero-h1-text { font-size: 36px !important; }
          .apple-hero-sub-text { font-size: 17px !important; }
          .apple-section-h2 { font-size: 32px !important; }
          .apple-compare-grid { grid-template-columns: 1fr 60px 80px !important; font-size: 13px !important; }
          .apple-nav-links { display: none; }
          .apple-burger { display: block; }
          .apple-mobile-menu { padding: 0 22px 16px; }
          .apple-mobile-menu.open { display: flex; flex-direction: column; gap: 12px; }
          .apple-mobile-menu a { font-size: 15px; color: rgba(245,245,247,0.65); text-decoration: none; padding: 8px 0; }
          .apple-trust-bar { flex-direction: column !important; gap: 12px !important; text-align: center; }
          .apple-footer-cols { flex-direction: column !important; gap: 24px !important; }
          .apple-footer-bottom { flex-direction: column !important; text-align: center !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .apple-features-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* ═══ NAVBAR — Clean, Apple-style with mobile hamburger ═══ */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: `rgba(0,0,0,${navOpacity})`,
        backdropFilter: scrollY > 20 ? "saturate(180%) blur(20px)" : "none",
        borderBottom: scrollY > 20 ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
        transition: "all 0.4s",
      }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "14px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none" }}><SodareLogo size="sm" /></Link>
          <nav className="apple-nav-links">
            {[["#problema", "Problema"], ["#solucion", "Solución"], ["#comparar", "Comparar"]].map(([href, label]) => (
              <a key={href} href={href} className="apple-nav-link">{label}</a>
            ))}
            <Link href="/login" aria-label="Acceder a Sodare" style={{
              padding: "7px 18px", borderRadius: 980,
              background: "var(--cyan)", color: "#000",
              fontSize: 12, fontWeight: 600,
              textDecoration: "none", transition: "all 0.25s",
            }}>
              Acceder
            </Link>
          </nav>
          <button className="apple-burger" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Menú">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d={mobileMenu ? "M4 4L14 14M4 14L14 4" : "M2 5h14M2 9h14M2 13h14"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className={`apple-mobile-menu ${mobileMenu ? "open" : ""}`}>
          {[["#problema", "Problema"], ["#solucion", "Solución"], ["#comparar", "Comparar"]].map(([href, label]) => (
            <a key={href} href={href} onClick={() => setMobileMenu(false)}>{label}</a>
          ))}
          <Link href="/login" onClick={() => setMobileMenu(false)} style={{
            padding: "10px 0", color: "var(--cyan)", fontWeight: 600, fontSize: 15, textDecoration: "none",
          }}>
            Acceder →
          </Link>
        </div>
      </header>

      <main>

      {/* ═══════════════════════════════════════════════════════
         HERO — Cinematic, Orbi centered, massive typography
         ═══════════════════════════════════════════════════════ */}
      <section style={{
        position: "relative", zIndex: 1,
        minHeight: "100vh",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "120px 24px 80px",
        textAlign: "center",
        overflow: "hidden",
      }}>
        {/* Subtle hero glow — very Apple */}
        <div style={{
          position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)",
          width: "min(800px, 100vw)", height: 500,
          background: "radial-gradient(ellipse, rgba(0,212,255,0.08) 0%, rgba(79,70,229,0.04) 40%, transparent 70%)",
          filter: "blur(80px)", pointerEvents: "none",
        }} />

        {/* Orbi — Hero protagonist */}
        <div className="apple-hero-orbi" style={{
          position: "relative",
          marginBottom: 40,
        }}>
          {/* Glow ring */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            width: 320, height: 320, marginTop: -160, marginLeft: -160,
            borderRadius: "50%",
            border: "1px solid rgba(0,212,255,0.1)",
            animation: "apple-orbi-ring 5s ease-in-out infinite",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            width: 400, height: 400, marginTop: -200, marginLeft: -200,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)",
            filter: "blur(30px)", pointerEvents: "none",
          }} />
          <Orbi scale={1.2} state="idle" />
        </div>

        {/* Headline */}
        <h1 className="apple-hero-h1" style={{
          fontWeight: 700,
          fontSize: "clamp(44px, 7vw, 80px)",
          lineHeight: 1.05,
          letterSpacing: "-0.03em",
          marginBottom: 16,
          maxWidth: 900,
        }}>
          <span className="apple-hero-h1-text">Deja de adivinar.{" "}</span>
          <br />
          <span className="apple-hero-h1-text" style={{
            background: "linear-gradient(90deg, var(--cyan), #818cf8, var(--cyan))",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation: "apple-gradient 5s ease infinite",
          }}>
            Empieza a escalar.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="apple-hero-sub" style={{
          fontSize: "clamp(17px, 2vw, 21px)",
          fontWeight: 400,
          color: "#86868b",
          lineHeight: 1.5,
          maxWidth: 600,
          marginBottom: 40,
        }}>
          <span className="apple-hero-sub-text">
            Sodare unifica tus campañas de Meta, TikTok y Google Ads,
            tu inbox de WhatsApp y tus reportes de ROI en una sola plataforma.
          </span>
        </p>

        {/* CTAs */}
        <div className="apple-hero-cta" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/login" className="apple-pill apple-pill-primary" aria-label="Empezar gratis con Sodare">
            Empezar gratis
          </Link>
          <a href="#solucion" className="apple-pill apple-pill-secondary">
            Conoce más <ChevronRight style={{ width: 16, height: 16 }} />
          </a>
        </div>

        {/* Friction reducer */}
        <p className="apple-hero-cta" style={{ marginTop: 20, fontSize: 14, color: "#6e6e73", fontWeight: 400 }}>
          Sin tarjeta de crédito · Setup en 2 min
        </p>
      </section>

      {/* ═══ TRUST BAR ═══ */}
      <section style={{ position: "relative", zIndex: 1, padding: "0 24px 80px", maxWidth: 980, margin: "0 auto", width: "100%" }}>
        <Reveal>
          <div className="apple-trust-bar" style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 40,
            padding: "20px 0",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            flexWrap: "wrap",
          }}>
            {[
              { icon: <Shield style={{ width: 16, height: 16 }} />, text: "Cifrado end-to-end" },
              { icon: <CheckCircle2 style={{ width: 16, height: 16 }} />, text: "OAuth 2.0 verificado" },
              { icon: <Activity style={{ width: 16, height: 16 }} />, text: "99.9% uptime" },
              { icon: <Globe style={{ width: 16, height: 16 }} />, text: "Soporte 100% en español" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 400, color: "#86868b" }}>
                <span style={{ color: "#86868b", display: "flex" }}>{item.icon}</span>{item.text}
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ═══════════════════════════════════════════════════════
         PAIN POINTS — Massive stats, no cards
         ═══════════════════════════════════════════════════════ */}
      <section id="problema" style={{ position: "relative", zIndex: 1, padding: "100px 24px", maxWidth: 980, margin: "0 auto", width: "100%" }}>
        <Reveal>
          <p style={{ fontSize: 17, fontWeight: 600, color: "var(--red)", marginBottom: 12, textAlign: "center" }}>
            El problema
          </p>
          <h2 className="apple-section-h2" style={{
            fontWeight: 700, fontSize: "clamp(36px, 5vw, 56px)",
            lineHeight: 1.08, letterSpacing: "-0.025em",
            textAlign: "center", marginBottom: 64, color: "#f5f5f7",
          }}>
            ¿Tu marketing se siente así?
          </h2>
        </Reveal>

        <div className="apple-pain-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32, textAlign: "center" }}>
          {[
            { stat: "10+", unit: "hrs/semana", desc: "perdidas cambiando entre plataformas", color: "var(--red)" },
            { stat: "$500+", unit: "USD/mes", desc: "en herramientas que no se integran", color: "var(--amber)" },
            { stat: "0%", unit: "visibilidad", desc: "del ROI real de tus campañas", color: "var(--purple)" },
          ].map((p, i) => (
            <Reveal key={i} delay={i * 150}>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6, marginBottom: 12 }}>
                  <span style={{ fontSize: "clamp(40px, 5vw, 56px)", fontWeight: 700, color: p.color, letterSpacing: "-0.03em", lineHeight: 1 }}>
                    {p.stat}
                  </span>
                  <span style={{ fontSize: 17, fontWeight: 600, color: p.color }}>{p.unit}</span>
                </div>
                <p style={{ fontSize: 17, color: "#86868b", lineHeight: 1.5 }}>{p.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={500}>
          <p style={{ textAlign: "center", marginTop: 48, fontSize: 19, color: "#86868b", lineHeight: 1.6, maxWidth: 680, margin: "48px auto 0" }}>
            Si gestionas campañas en <strong style={{ color: "#f5f5f7", fontWeight: 600 }}>México o LATAM</strong>, sabes que el problema no es falta de datos —
            es que están <strong style={{ color: "#f5f5f7", fontWeight: 600 }}>dispersos en 5 plataformas diferentes</strong>.
          </p>
        </Reveal>
      </section>

      {/* ═══════════════════════════════════════════════════════
         FEATURES — 2-column, Apple-clean cards
         ═══════════════════════════════════════════════════════ */}
      <section id="solucion" style={{
        position: "relative", zIndex: 1,
        padding: "120px 24px",
        background: "#111111",
      }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <Reveal>
            <p style={{ fontSize: 17, fontWeight: 600, color: ACCENT, marginBottom: 12, textAlign: "center" }}>
              La solución
            </p>
            <h2 className="apple-section-h2" style={{
              fontWeight: 700, fontSize: "clamp(36px, 5vw, 56px)",
              lineHeight: 1.08, letterSpacing: "-0.025em",
              textAlign: "center", marginBottom: 16, color: "#f5f5f7",
            }}>
              Una plataforma.{" "}
              <span style={{ color: "#86868b" }}>Todos tus canales.</span>
            </h2>
            <p style={{ fontSize: 19, color: "#86868b", textAlign: "center", maxWidth: 580, margin: "0 auto 64px", lineHeight: 1.5 }}>
              Sodare reemplaza 5 herramientas separadas con una sola experiencia diseñada para agencias en LATAM.
            </p>
          </Reveal>

          <div className="apple-features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
            {FEATURES.map((f, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="apple-card" style={{
                  padding: "40px 32px",
                  background: "#1d1d1f",
                  borderRadius: 20,
                  height: "100%",
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: `${f.color}15`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 20, color: f.color,
                  }}>
                    {f.icon}
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: f.color, marginBottom: 8, letterSpacing: "0.02em" }}>
                    {f.codename}
                  </p>
                  <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10, letterSpacing: "-0.01em", color: "#f5f5f7" }}>
                    {f.title}
                  </h3>
                  <p style={{ fontSize: 17, color: "#86868b", lineHeight: 1.5 }}>
                    {f.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
         HOW IT WORKS — Numbered steps, Apple-clean
         ═══════════════════════════════════════════════════════ */}
      <section style={{ position: "relative", zIndex: 1, padding: "120px 24px", maxWidth: 980, margin: "0 auto", width: "100%" }}>
        <Reveal>
          <p style={{ fontSize: 17, fontWeight: 600, color: "var(--amber)", marginBottom: 12, textAlign: "center" }}>
            Cómo funciona
          </p>
          <h2 className="apple-section-h2" style={{
            fontWeight: 700, fontSize: "clamp(36px, 5vw, 56px)",
            lineHeight: 1.08, letterSpacing: "-0.025em",
            textAlign: "center", marginBottom: 64, color: "#f5f5f7",
          }}>
            Tres pasos.{" "}
            <span style={{ color: "#86868b" }}>Cero complicaciones.</span>
          </h2>
        </Reveal>

        <div className="apple-steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
          {[
            { step: "1", title: "Conecta tus canales", desc: "Vincula Meta, TikTok, Google y WhatsApp desde Integraciones. OAuth seguro, sin tokens manuales.", icon: <Globe style={{ width: 24, height: 24 }} />, color: "var(--cyan)" },
            { step: "2", title: "Centraliza en Resumen", desc: "Campañas, métricas y conversaciones fluyen a tu dashboard en tiempo real. Un solo login.", icon: <LineChart style={{ width: 24, height: 24 }} />, color: "var(--purple)" },
            { step: "3", title: "Optimiza con Briefs IA", desc: "Briefs IA genera contenido. Los Chatbots ejecutan. Tú solo decides y escalas.", icon: <TrendingUp style={{ width: 24, height: 24 }} />, color: "var(--emerald)" },
          ].map((s, i) => (
            <Reveal key={i} delay={i * 150}>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: 80, fontWeight: 700, color: "rgba(255,255,255,0.04)",
                  lineHeight: 1, marginBottom: -20, letterSpacing: "-0.05em",
                }}>
                  {s.step}
                </div>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: `${s.color}15`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px", color: s.color,
                }}>
                  {s.icon}
                </div>
                <h3 style={{ fontSize: 21, fontWeight: 700, marginBottom: 10, color: "#f5f5f7" }}>
                  {s.title}
                </h3>
                <p style={{ fontSize: 17, color: "#86868b", lineHeight: 1.5 }}>
                  {s.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══ MID-PAGE CTA ═══ */}
      <section style={{ position: "relative", zIndex: 1, padding: "0 24px 100px", maxWidth: 680, margin: "0 auto", width: "100%", textAlign: "center" }}>
        <Reveal>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <Orbi scale={0.35} state="success" />
            <p style={{ fontSize: 24, fontWeight: 700, color: "#f5f5f7", letterSpacing: "-0.02em" }}>
              Ya sabes cómo funciona.
            </p>
            <p style={{ fontSize: 17, color: "#86868b" }}>
              Crea tu cuenta en 2 minutos y conecta tu primer canal hoy.
            </p>
            <Link href="/login" className="apple-pill apple-pill-primary" aria-label="Probar Sodare gratis">
              Probar gratis
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ═══════════════════════════════════════════════════════
         STATS — Massive floating numbers
         ═══════════════════════════════════════════════════════ */}
      <section style={{ position: "relative", zIndex: 1, padding: "100px 24px", background: "#111111" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div className="apple-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, textAlign: "center" }}>
            {[
              { refP: c1, label: "ROAS Promedio", color: "var(--emerald)" },
              { refP: c2, label: "Conversaciones", color: "var(--cyan)" },
              { refP: c3, label: "Campañas Activas", color: "var(--purple)" },
              { refP: c4, label: "Clientes Satisfechos", color: "var(--amber)" },
            ].map((s, i) => (
              <div key={i} ref={s.refP.ref} style={{ padding: "32px 16px" }}>
                <div style={{
                  fontSize: "clamp(36px, 4vw, 56px)", fontWeight: 700,
                  color: "#f5f5f7", lineHeight: 1, marginBottom: 8,
                  letterSpacing: "-0.03em",
                }}>
                  {s.refP.value}
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#86868b", letterSpacing: "0.01em" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
         COMPARISON TABLE
         ═══════════════════════════════════════════════════════ */}
      <section id="comparar" style={{ position: "relative", zIndex: 1, padding: "120px 24px", maxWidth: 800, margin: "0 auto", width: "100%" }}>
        <Reveal>
          <p style={{ fontSize: 17, fontWeight: 600, color: ACCENT, marginBottom: 12, textAlign: "center" }}>
            Compara
          </p>
          <h2 className="apple-section-h2" style={{
            fontWeight: 700, fontSize: "clamp(36px, 5vw, 56px)",
            lineHeight: 1.08, letterSpacing: "-0.025em",
            textAlign: "center", marginBottom: 16, color: "#f5f5f7",
          }}>
            Sodare vs. las alternativas.
          </h2>
          <p style={{ fontSize: 19, color: "#86868b", textAlign: "center", marginBottom: 48, lineHeight: 1.5 }}>
            ¿Por qué pagar por 3 herramientas cuando puedes tener una?
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
            {/* Header */}
            <div className="apple-compare-grid" style={{
              display: "grid", gridTemplateColumns: "1fr 120px 140px",
              padding: "16px 24px",
              background: "rgba(255,255,255,0.03)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#86868b" }}>Funcionalidad</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: ACCENT, textAlign: "center" }}>Sodare</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#86868b", textAlign: "center" }}>Otros</span>
            </div>
            {COMPARISONS.map((row, i) => (
              <div key={i} className="apple-row apple-compare-grid" style={{
                display: "grid", gridTemplateColumns: "1fr 120px 140px",
                padding: "16px 24px",
                borderBottom: i < COMPARISONS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                transition: "background 0.2s",
              }}>
                <span style={{ fontSize: 15, color: "#f5f5f7", fontWeight: 500 }}>{row.feature}</span>
                <span style={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CheckCircle2 style={{ width: 18, height: 18, color: "var(--emerald)" }} />
                </span>
                <span style={{ fontSize: 13, color: "#6e6e73", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>{row.others}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ═══════════════════════════════════════════════════════
         TESTIMONIALS
         ═══════════════════════════════════════════════════════ */}
      <section style={{ position: "relative", zIndex: 1, padding: "120px 24px", background: "#111111" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <Reveal>
            <p style={{ fontSize: 17, fontWeight: 600, color: "var(--amber)", marginBottom: 12, textAlign: "center" }}>
              Testimonios
            </p>
            <h2 className="apple-section-h2" style={{
              fontWeight: 700, fontSize: "clamp(36px, 5vw, 56px)",
              lineHeight: 1.08, letterSpacing: "-0.025em",
              textAlign: "center", marginBottom: 64, color: "#f5f5f7",
            }}>
              Lo que dicen nuestros usuarios.
            </h2>
          </Reveal>

          <div className="apple-features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[
              { name: "Ana García", role: "Directora, Agencia 360°", text: "Antes usábamos Hootsuite + Google Sheets + WhatsApp Web. Ahora todo está en Sodare. Ahorramos 15 horas a la semana.", avatar: "AG" },
              { name: "Carlos Mendoza", role: "Marketing Manager, E-commerce", text: "Por fin puedo mostrarle al cliente el ROI real de sus campañas sin pasar 3 horas armando reportes.", avatar: "CM" },
              { name: "Valeria Ríos", role: "Brand Manager, Startup SaaS", text: "Briefs IA nos cambió la vida. Generamos las parrillas de contenido del mes en 20 minutos.", avatar: "VR" },
            ].map((t, i) => (
              <Reveal key={i} delay={i * 150}>
                <div style={{
                  padding: "32px 28px",
                  background: "#1d1d1f",
                  borderRadius: 20,
                  height: "100%",
                }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} style={{ width: 14, height: 14, fill: "var(--amber)", color: "var(--amber)" }} />
                    ))}
                  </div>
                  <p style={{ fontSize: 17, color: "#f5f5f7", lineHeight: 1.5, fontWeight: 400, marginBottom: 24 }}>
                    &ldquo;{t.text}&rdquo;
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: "rgba(0,212,255,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 700, color: ACCENT,
                    }}>
                      {t.avatar}
                    </div>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: "#f5f5f7" }}>{t.name}</p>
                      <p style={{ fontSize: 13, color: "#6e6e73" }}>{t.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
         TARGET AUDIENCE
         ═══════════════════════════════════════════════════════ */}
      <section style={{ position: "relative", zIndex: 1, padding: "120px 24px", maxWidth: 980, margin: "0 auto", width: "100%" }}>
        <Reveal>
          <p style={{ fontSize: 17, fontWeight: 600, color: "var(--purple)", marginBottom: 12, textAlign: "center" }}>
            ¿Para quién es Sodare?
          </p>
          <h2 className="apple-section-h2" style={{
            fontWeight: 700, fontSize: "clamp(36px, 5vw, 56px)",
            lineHeight: 1.08, letterSpacing: "-0.025em",
            textAlign: "center", marginBottom: 64, color: "#f5f5f7",
          }}>
            Diseñada para quienes{" "}
            <span style={{ color: "#86868b" }}>mueven el marketing.</span>
          </h2>
        </Reveal>

        <div className="apple-features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {[
            { title: "Agencias Digitales", desc: "Gestiona 10+ cuentas de clientes desde un solo lugar. Reportes automáticos, inbox compartido y pauta centralizada.", icon: <Users style={{ width: 24, height: 24 }} />, color: "var(--cyan)" },
            { title: "Anunciantes Directos", desc: "Eres el brand manager que necesita datos en tiempo real. Conecta tus canales y deja que Sodare haga el trabajo pesado.", icon: <Target style={{ width: 24, height: 24 }} />, color: "var(--amber)" },
            { title: "Freelancers & Consultores", desc: "Profesionaliza tu servicio con dashboards que impresionan y herramientas que escalan contigo.", icon: <TrendingUp style={{ width: 24, height: 24 }} />, color: "var(--purple)" },
          ].map((a, i) => (
            <Reveal key={i} delay={i * 150}>
              <div style={{
                padding: "32px 28px",
                background: "#1d1d1f",
                borderRadius: 20,
                height: "100%",
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: `${a.color}15`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 20, color: a.color,
                }}>
                  {a.icon}
                </div>
                <h3 style={{ fontSize: 21, fontWeight: 700, marginBottom: 10, color: "#f5f5f7" }}>
                  {a.title}
                </h3>
                <p style={{ fontSize: 17, color: "#86868b", lineHeight: 1.5 }}>
                  {a.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
         FINAL CTA — Cinematic closing
         ═══════════════════════════════════════════════════════ */}
      <section style={{
        position: "relative", zIndex: 1,
        padding: "160px 24px",
        textAlign: "center",
        background: "#111111",
      }}>
        <Reveal>
          <h2 className="apple-section-h2" style={{
            fontWeight: 700, fontSize: "clamp(36px, 5vw, 56px)",
            lineHeight: 1.08, letterSpacing: "-0.025em",
            marginBottom: 16, color: "#f5f5f7",
          }}>
            Tu marketing merece{" "}
            <br />
            <span style={{
              background: "linear-gradient(90deg, var(--cyan), #818cf8)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              un centro de mando.
            </span>
          </h2>
          <p style={{ fontSize: 19, color: "#86868b", lineHeight: 1.5, maxWidth: 480, margin: "0 auto 40px" }}>
            Únete a los equipos que ya dejaron de saltar entre pestañas y empezaron a ver resultados reales.
          </p>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <Link href="/login" className="apple-pill apple-pill-primary" aria-label="Crear cuenta gratis en Sodare">
              Crear cuenta gratis
            </Link>
            <p style={{ fontSize: 14, color: "#6e6e73" }}>Sin tarjeta · Cancela cuando quieras</p>
          </div>
        </Reveal>
      </section>

      {/* ═══ FOOTER — Apple-clean ═══ */}
      <footer style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 40, flexWrap: "wrap" }}>
            <div style={{ maxWidth: 280 }}>
              <SodareLogo size="sm" animated={false} />
              <p style={{ fontSize: 14, color: "#6e6e73", marginTop: 12, lineHeight: 1.6 }}>
                Plataforma de inteligencia multicanal para agencias y anunciantes en México y LATAM.
              </p>
            </div>
            <div className="apple-footer-cols" style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
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
          <div className="apple-footer-bottom" style={{
            marginTop: 32, paddingTop: 20,
            borderTop: "1px solid rgba(255,255,255,0.04)",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
          }}>
            <span style={{ fontSize: 12, color: "#6e6e73" }}>© {new Date().getFullYear()} Sodare. Todos los derechos reservados.</span>
            <span style={{ fontSize: 12, color: "#6e6e73" }}>Hecho en México 🇲🇽</span>
          </div>
        </div>
      </footer>

      </main>
    </div>
  );
}

/* ═══ REUSABLE COMPONENTS ═══ */

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const r = useReveal(delay);
  return <div ref={r.ref} style={r.style}>{children}</div>;
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 style={{ fontSize: 13, fontWeight: 600, color: "#f5f5f7", marginBottom: 12 }}>{title}</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {links.map(l => (
          <Link key={l.href} href={l.href} style={{ fontSize: 14, color: "#6e6e73", textDecoration: "none", transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#f5f5f7")}
            onMouseLeave={e => (e.currentTarget.style.color = "#6e6e73")}
          >{l.label}</Link>
        ))}
      </div>
    </div>
  );
}
