"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ReactLenis } from "lenis/react";
import { ZefirusLogo } from "@/components/ui/ZefirusLogo";
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
  MapPin
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   ZEFIRUS · Landing Page — Collabora-Inspired Theme
   Dark obsidian background, cyan glows, glassmorphism,
   metallic typography, and smooth scrolling.
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

// ── Motion Wrapper ──────────────────────────────────────
function Reveal({ children, delay = 0, className = "", style = {} }: { children: React.ReactNode, delay?: number, className?: string, style?: React.CSSProperties }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={{
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, delay, ease: [0.25, 1, 0.5, 1] } }
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ── Animated Text Reveal ──────────────────────────────────────
function AnimatedText({ text, delayOffset = 0 }: { text: string, delayOffset?: number }) {
  const words = text.split(" ");
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", justifyContent: "center" }}>
      {words.map((word, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: delayOffset + index * 0.15,
            duration: 0.8,
            ease: [0.25, 1, 0.5, 1]
          }}
          style={{ 
            display: "inline-block", 
            marginRight: "0.25em"
          }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

// ── Constants ──────────────────────────────────────────
const ACCENT_COLOR = "#5b9bff"; // Zefirus Cyan
const GRADIENT_START = "#0284c7"; // Darker blue for gradient

const FEATURES = [
  { icon: <Target style={{ width: 24, height: 24 }} />, title: "Anuncios", codename: "Impulso", desc: "Meta, TikTok y Google Ads en una sola pantalla. Pausa, optimiza y escala campañas sin salir de Zefirus." },
  { icon: <BarChart3 style={{ width: 24, height: 24 }} />, title: "Resumen", codename: "Pulso", desc: "El pulso de tu operación en tiempo real. Dashboards que tu cliente entiende, con datos de todas tus cuentas." },
  { icon: <MessageSquare style={{ width: 24, height: 24 }} />, title: "Inbox", codename: "Señal", desc: "WhatsApp, Instagram DM y Messenger en un solo lugar. Nunca pierdas un lead por no responder a tiempo." },
  { icon: <Sparkles style={{ width: 24, height: 24 }} />, title: "Briefs IA", codename: "Nova", desc: "Genera parrillas de contenido, copies y briefings en segundos. Personaliza tono, formato y canal." },
  { icon: <Bot style={{ width: 24, height: 24 }} />, title: "Chatbots", codename: "Piloto", desc: "Tu copiloto automático. Construye flujos conversacionales que atienden, califican y asignan leads 24/7." },
  { icon: <Globe style={{ width: 24, height: 24 }} />, title: "Publicación", codename: "Lanzadera", desc: "Programa y despega. Calendario visual para publicar en todas tus redes desde un solo lugar." },
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

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "Zefirus",
        "url": "https://zefirus.xyz",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "description": "Plataforma de marketing multicanal que unifica campañas de Meta Ads, TikTok Ads, Google Ads, inbox de WhatsApp y reportes de ROI para agencias en LATAM.",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "MXN", "description": "Plan gratuito disponible." },
        "aggregateRating": { "@type": "AggregateRating", "ratingValue": "5", "ratingCount": "3", "bestRating": "5" }
      },
      {
        "@type": "Organization",
        "name": "Zefirus",
        "url": "https://zefirus.xyz",
        "logo": "https://zefirus.xyz/zefirus-logo-1024.jpg",
        "contactPoint": { "@type": "ContactPoint", "email": "soporte@zefirus.xyz", "contactType": "customer service", "availableLanguage": ["Spanish"] },
        "sameAs": []
      }
    ]
  };

  return (
    <ReactLenis root options={{ lerp: 0.05, duration: 1.5, smoothWheel: true }}>
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--background)", color: "var(--foreground)" }}>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ─── CSS ─── */}
      <style>{`
        html { scroll-behavior: initial; } /* Controlled by Lenis */
        
        .col-title {
          background: radial-gradient(circle, #ffffff 30%, rgba(255, 255, 255, 0.5) 95%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.04em;
        }

        .text-shimmer {
          background: linear-gradient(
            to right,
            #ffffff 20%,
            #5b9bff 40%,
            #5b9bff 60%,
            #ffffff 80%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          color: transparent; /* Fallback */
          animation: shine 4s linear infinite;
        }
        @keyframes shine {
          to {
            background-position: 200% center;
          }
        }

        /* Funnel Effect Container */
        .col-funnel-container {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 0;
        }


        .col-pill { 
          display: inline-flex; align-items: center; justify-content: center; gap: 8px; 
          padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 500; 
          text-decoration: none; transition: all 0.3s; cursor: pointer; border: none;
        }
        .col-pill-primary { 
          background: linear-gradient(180deg, ${GRADIENT_START} 0%, ${ACCENT_COLOR} 100%); 
          color: #fff; 
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 10px 40px rgba(59,130,246, 0.4); 
        }
        .col-pill-primary:hover { 
          background: linear-gradient(180deg, #0284c7 0%, #38bdf8 100%);
          transform: translateY(-2px); 
          box-shadow: 0 15px 50px rgba(59,130,246, 0.6); 
        }
        .col-pill-secondary { 
          background: #fff; color: #000; border: none; font-weight: 600;
        }
        .col-pill-secondary:hover { 
          background: #f0f0f0; transform: translateY(-2px); 
        }



        .col-card { 
          background: rgba(15, 15, 15, 0.4);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 24px; 
          overflow: hidden; 
          transition: all 0.4s cubic-bezier(0.25,1,0.5,1); 
          position: relative;
        }
        .col-card:hover { 
          transform: translateY(-4px) scale(1.01); 
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.5), 0 0 20px rgba(59,130,246, 0.1); 
          border-color: rgba(59,130,246, 0.3); 
        }

        .col-nav-link { font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.6); text-decoration: none; transition: color 0.25s; }
        .col-nav-link:hover { color: #fff; }

        .col-glow-bg {
          position: absolute;
          border-radius: 50%;
          background: ${ACCENT_COLOR};
          filter: blur(120px);
          opacity: 0.2;
          pointer-events: none;
          z-index: 0;
        }

        .apple-burger { display: none; background: none; border: none; cursor: pointer; padding: 8px; color: #f5f5f7; }
        .apple-mobile-menu { display: none; }

        .mockup-chart-bar {
          flex: 1; border-radius: 4px 4px 0 0; background: rgba(255,255,255,0.1); transition: all 0.5s;
        }
        .mockup-chart-bar.active { background: linear-gradient(180deg, ${ACCENT_COLOR}, rgba(59,130,246, 0.1)); box-shadow: 0 0 20px rgba(59,130,246, 0.5); }

        @media (max-width: 768px) {
          .col-features-grid { grid-template-columns: 1fr !important; }
          .col-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .col-pain-grid { grid-template-columns: 1fr !important; max-width: 400px; margin-left: auto; margin-right: auto; }
          .col-steps-grid { grid-template-columns: 1fr !important; max-width: 400px; margin-left: auto; margin-right: auto; }
          .col-hero-h1 { font-size: 40px !important; }
          .col-section-h2 { font-size: 32px !important; }
          .col-compare-grid { grid-template-columns: 1fr 60px 80px !important; font-size: 13px !important; }
          .col-nav-links { display: none !important; }
          .apple-burger { display: block; }
          .apple-mobile-menu { padding: 0 22px 16px; }
          .apple-mobile-menu.open { display: flex; flex-direction: column; gap: 12px; }
          .apple-mobile-menu a { font-size: 15px; color: rgba(255,255,255,0.7); text-decoration: none; padding: 8px 0; }
          .col-footer-cols { flex-direction: column !important; gap: 24px !important; }
          .col-footer-bottom { flex-direction: column !important; text-align: center !important; }
          header.main-nav { width: 100% !important; top: 0 !important; border-radius: 0 !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .col-features-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* ═══ NAVBAR (Floating Pill) ═══ */}
      <header className="main-nav" style={{
        position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", zIndex: 100,
        width: "90%", maxWidth: 1000,
        background: "var(--surface)",
        
        
        border: "1px solid var(--border)",
        borderRadius: 999,
        transition: "all 0.4s",
      }}>
        <div style={{ padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
            <ZefirusLogo size="sm" animated={false} showText={false} />
            <span style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.04em" }}>Zefirus</span>
          </Link>
          <nav className="col-nav-links" style={{ display: "flex", alignItems: "center", gap: 40 }}>
            {[["#problema", "Problema"], ["#solucion", "Solución"], ["#comparar", "Comparar"]].map(([href, label]) => (
              <a key={href} href={href} className="col-nav-link">{label}</a>
            ))}
          </nav>
          <div className="col-nav-links" style={{ display: "flex", alignItems: "center", gap: 16 }}>
             <Link href="/login" aria-label="Acceder a Zefirus" style={{
                padding: "8px 24px", borderRadius: 980,
                background: "linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))",
                color: "var(--foreground)",
                border: "1px solid var(--border)",
                fontSize: 14, fontWeight: 500,
                textDecoration: "none", transition: "all 0.25s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)" }}
              onMouseLeave={e => { e.currentTarget.style.background = "linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))" }}>
                Acceder
              </Link>
          </div>
          <button className="apple-burger" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Menú">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d={mobileMenu ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className={`apple-mobile-menu ${mobileMenu ? "open" : ""}`} style={{ background: "var(--background)", border: "1px solid var(--hairline)", borderRadius: "0 0 24px 24px" }}>
          {[["#problema", "Problema"], ["#solucion", "Solución"], ["#comparar", "Comparar"]].map(([href, label]) => (
            <a key={href} href={href} onClick={() => setMobileMenu(false)}>{label}</a>
          ))}
          <Link href="/login" onClick={() => setMobileMenu(false)} style={{
            padding: "10px 0", color: ACCENT_COLOR, fontWeight: 600, fontSize: 15, textDecoration: "none",
          }}>
            Acceder →
          </Link>
        </div>
      </header>

      <main style={{ position: "relative", zIndex: 1 }}>

      {/* ═══════════════════════════════════════════════════════
         HERO
         ═══════════════════════════════════════════════════════ */}
      <section style={{
        position: "relative", zIndex: 1,
        minHeight: "100vh",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
        padding: "160px 24px 0",
        textAlign: "center",
        overflow: "hidden",
      }}>
        {/* Funnel Background Effect (Curved SVG with moving gradient) */}
        <div className="col-funnel-container">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", top: 0, left: 0 }}>
            <defs>
              <linearGradient id="beam-synced" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.8)" />
                <stop offset="100%" stopColor="transparent" />
              <animate attributeName="y1" values="-1; 2" dur="8s" repeatCount="indefinite" />
              <animate attributeName="y2" values="0; 3" dur="8s" repeatCount="indefinite" />
              </linearGradient>
            </defs>
            {/* Left Faint Curve */}
            <path d="M -10,0 Q 30,40 21.5,100" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.05" />
            {/* Left Beam */}
            <path d="M -10,0 Q 30,40 21.5,100" fill="none" stroke="url(#beam-synced)" strokeWidth="0.15" style={{ filter: "drop-shadow(0 0 2px rgba(59,130,246,0.8))" }} />
            
            {/* Right Faint Curve */}
            <path d="M 110,0 Q 70,40 78.5,100" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.05" />
            {/* Right Beam */}
            <path d="M 110,0 Q 70,40 78.5,100" fill="none" stroke="url(#beam-synced)" strokeWidth="0.15" style={{ filter: "drop-shadow(0 0 2px rgba(59,130,246,0.8))" }} />
          </svg>
        </div>

        {/* Orbi Perfectly Centered */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: "easeOut", type: "spring", bounce: 0.5 }}
          style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 24, zIndex: 10 }}
        >
          <Orbi scale={0.9} style={{ filter: "drop-shadow(0px 0px 20px rgba(59,130,246, 0.6))" }} />
        </motion.div>

        {/* Badge */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "8px 24px", borderRadius: 980, 
            border: "1px solid var(--border)",
            fontSize: 13, fontWeight: 500, color: "var(--foreground)", marginBottom: 32, letterSpacing: "0.02em"
          }}
        >
          <span style={{ opacity: 0.4 }}>{"{"}</span>
          Revoluciona tu Agencia
          <span style={{ opacity: 0.4 }}>{"}"}</span>
        </motion.div>

        {/* Headline (Animated Text with Shimmer) */}
        <h1 
          className="col-hero-h1 text-shimmer" style={{
            fontWeight: 700,
            fontSize: "clamp(48px, 7vw, 84px)",
            lineHeight: 1.05,
            marginBottom: 24,
            maxWidth: 900,
          }}
        >
          <AnimatedText text="Deja de adivinar." delayOffset={0.4} />
          <br/>
          <AnimatedText text="Empieza a escalar." delayOffset={0.9} />
        </h1>

        {/* Subtitle */}
        <motion.p 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1.5, ease: "easeOut" }}
          style={{
            fontSize: "clamp(16px, 2vw, 20px)",
            fontWeight: 400,
            color: "var(--text-muted)",
            lineHeight: 1.6,
            maxWidth: 680,
            marginBottom: 48,
          }}
        >
          Zefirus unifica tus campañas de Meta, TikTok y Google Ads,
          tu inbox de WhatsApp y tus reportes de ROI en una plataforma diseñada para equipos de alto rendimiento.
        </motion.p>

        {/* CTAs */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1.7, ease: "easeOut" }}
          style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", justifyContent: "center", position: "relative", zIndex: 10, marginBottom: 80 }}
        >
          <Link href="/login" className="col-pill col-pill-primary" aria-label="Contacto / Registro" style={{ height: 56, padding: "0 32px", borderRadius: 14 }}>
            Contactar Ventas
          </Link>
          <div style={{ display: "flex", alignItems: "center", background: "var(--surface-hover)", border: "1px solid var(--border)", borderRadius: 14, padding: "4px 4px 4px 20px", height: 56, boxSizing: "border-box" }}>
            <input type="email" placeholder="Ingresa tu email" style={{ background: "transparent", border: "none", color: "var(--foreground)", outline: "none", width: 220, fontSize: 16 }} />
            <Link href="/login" className="col-pill col-pill-secondary" style={{ padding: "0 24px", fontSize: 15, height: "100%", borderRadius: 10 }}>
              Solicitar Demo
            </Link>
          </div>
        </motion.div>

        {/* Dashboard Wrapper for Horizon Glow */}
        <div style={{ position: "relative", width: "100%", maxWidth: 1100, display: "flex", justifyContent: "center", marginTop: 40, zIndex: 2 }}>
          {/* Glowing Horizon behind dashboard */}
          <div style={{
            position: "absolute", top: "15%", left: "50%", transform: "translate(-50%, -50%)",
            width: "140vw", height: "400px",
            background: "radial-gradient(ellipse 70% 30% at 50% 50%, rgba(59,130,246,0.12) 0%, transparent 60%)",
            borderRadius: "50%",
            zIndex: -1, pointerEvents: "none"
          }} />
          
          {/* MOCKUP DASHBOARD (Cyan style) */}
          <motion.div 
            initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 1.9, ease: "easeOut" }}
          style={{ 
            width: "100%", maxWidth: 1100, height: 600, 
            background: "var(--background)",
            border: "1px solid var(--border)",
            borderBottom: "none",
            borderRadius: "24px 24px 0 0",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 -20px 100px rgba(59,130,246, 0.15)",
            display: "flex",
          }}
        >
          {/* Sidebar */}
          <div style={{ width: 240, border: "1px solid var(--hairline)", padding: 24, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
              <div style={{ width: 24, height: 24, background: `linear-gradient(180deg, ${GRADIENT_START}, ${ACCENT_COLOR})`, borderRadius: 6 }} />
              <div style={{ fontSize: 18, fontWeight: 600, color: "var(--foreground)" }}>Zefirus</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 16 }}>Navegación</div>
            {[
              { icon: <Target size={16}/>, label: "Dashboard", active: true },
              { icon: <Globe size={16}/>, label: "Campañas", active: false },
              { icon: <MessageSquare size={16}/>, label: "Inbox", active: false },
              { icon: <Activity size={16}/>, label: "Reportes", active: false },
            ].map((item, i) => (
              <div key={i} style={{ 
                display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", 
                borderRadius: 8, background: item.active ? "rgba(255,255,255,0.05)" : "transparent",
                color: item.active ? "#fff" : "rgba(255,255,255,0.5)",
                marginBottom: 8, fontSize: 14, fontWeight: 500
              }}>
                {item.icon} {item.label}
              </div>
            ))}
          </div>
          {/* Main Area */}
          <div style={{ flex: 1, padding: 32, display: "flex", flexDirection: "column", gap: 24, background: "radial-gradient(circle at bottom right, rgba(59,130,246, 0.1), transparent 50%)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
               <h3 style={{ fontSize: 24, fontWeight: 600, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 8 }}>
                 Resumen de Campañas 
                 <Activity size={24} color={ACCENT_COLOR} />
               </h3>
               <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                 <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--surface-hover)", display: "flex", alignItems: "center", justifyContent: "center" }}><Users size={16} color="#fff"/></div>
                 <div style={{ padding: "8px 16px", borderRadius: 999, background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: 14 }}>Exportar</div>
               </div>
            </div>
            {/* Top Cards */}
            <div style={{ display: "flex", gap: 24 }}>
              {[
                { title: "Meta Ads (ROAS)", val: "4.8x", glow: true },
                { title: "TikTok Ads (CPA)", val: "$12.5", glow: false },
                { title: "Google Ads (Clics)", val: "14,500", glow: false }
              ].map((c, i) => (
                <div key={i} style={{ 
                  flex: 1, padding: 24, borderRadius: 16, 
                  background: c.glow ? "linear-gradient(145deg, rgba(59,130,246, 0.1), rgba(255,255,255,0.02))" : "rgba(255,255,255,0.02)",
                  border: c.glow ? `1px solid rgba(59,130,246, 0.3)` : "1px solid rgba(255,255,255,0.05)",
                  boxShadow: c.glow ? "0 10px 30px rgba(59,130,246, 0.1)" : "none"
                }}>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.glow ? ACCENT_COLOR : "rgba(255,255,255,0.2)" }} />
                    {c.title}
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: "var(--foreground)" }}>{c.val}</div>
                  <div style={{ width: "100%", height: 4, background: "var(--surface-hover)", borderRadius: 2, marginTop: 16, overflow: "hidden" }}>
                     <div style={{ height: "100%", width: "70%", background: c.glow ? ACCENT_COLOR : "#fff" }} />
                  </div>
                </div>
              ))}
            </div>
            {/* Chart Area */}
            <div style={{ flex: 1, borderRadius: 16, background: "var(--surface)", border: "1px solid var(--hairline)", padding: 24, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)", marginBottom: 24 }}>Rendimiento Multicanal</div>
              <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 16, padding: "0 24px" }}>
                 {[40, 60, 45, 80, 55, 90, 70].map((h, i) => (
                   <div key={i} className={`mockup-chart-bar ${i === 5 ? "active" : ""}`} style={{ height: `${h}%` }} />
                 ))}
              </div>
            </div>
          </div>

          <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "40%", background: "linear-gradient(to top, #060606, transparent)", pointerEvents: "none" }} />
        </motion.div>
        </div>
      </section>

      {/* ═══ TRUST BAR ═══ */}
      <section style={{ position: "relative", zIndex: 1, padding: "0 24px 100px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <Reveal>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 48,
            padding: "32px 0",
            border: "1px solid var(--hairline)",
            flexWrap: "wrap",
          }}>
            {[
              { icon: <Shield style={{ width: 18, height: 18 }} />, text: "Cifrado end-to-end" },
              { icon: <CheckCircle2 style={{ width: 18, height: 18 }} />, text: "OAuth 2.0 verificado" },
              { icon: <Activity style={{ width: 18, height: 18 }} />, text: "99.9% uptime" },
              { icon: <Globe style={{ width: 18, height: 18 }} />, text: "Soporte en español" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 500, color: "var(--text-muted)" }}>
                <span style={{ color: "var(--foreground)", display: "flex" }}>{item.icon}</span>{item.text}
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ═══════════════════════════════════════════════════════
         PAIN POINTS
         ═══════════════════════════════════════════════════════ */}
      <section id="problema" style={{ position: "relative", zIndex: 1, padding: "120px 24px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <Reveal>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 16 }}>
             <div style={{ padding: "6px 16px", borderRadius: 980, background: "var(--cyan-dim)", border: `1px solid rgba(59,130,246, 0.2)`, color: ACCENT_COLOR, fontSize: 13, fontWeight: 600 }}>
              El Problema
             </div>
          </div>
          <h2 className="col-section-h2 col-title" style={{
            fontWeight: 700, fontSize: "clamp(36px, 5vw, 64px)",
            textAlign: "center", marginBottom: 80,
          }}>
            ¿Tu marketing se siente así?
          </h2>
        </Reveal>

        <div className="col-pain-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32, textAlign: "center" }}>
          {[
            { stat: "10+", unit: "hrs/semana", desc: "perdidas cambiando entre plataformas y hojas de cálculo." },
            { stat: "$500+", unit: "USD/mes", desc: "gastados en múltiples herramientas que no se comunican." },
            { stat: "0%", unit: "visibilidad", desc: "del ROI real de tus campañas y conversiones finales." },
          ].map((p, i) => (
            <Reveal key={i} delay={i * 0.15}>
              <SpotlightCard style={{ padding: "48px 32px", height: "100%" }}>
                <div className="col-glow-bg" style={{ top: 0, right: 0, width: 150, height: 150, opacity: 0.1 }} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8, marginBottom: 16 }}>
                    <span style={{ fontSize: "clamp(48px, 6vw, 64px)", fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.04em", lineHeight: 1 }}>
                      {p.stat}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 500, color: ACCENT_COLOR }}>{p.unit}</span>
                  </div>
                  <p style={{ fontSize: 16, color: "var(--text-muted)", lineHeight: 1.6 }}>{p.desc}</p>
                </div>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
         FEATURES — Glassmorphism Cards
         ═══════════════════════════════════════════════════════ */}
      <section id="solucion" style={{
        position: "relative", zIndex: 1,
        padding: "160px 24px",
      }}>
        {/* Massive Background Glow */}
        <div className="col-glow-bg" style={{ top: "30%", left: "50%", transform: "translate(-50%, -50%)", width: "80vw", height: 800, opacity: 0.08 }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 2 }}>
          <Reveal>
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 16 }}>
               <div style={{ padding: "6px 16px", borderRadius: 980, background: "var(--cyan-dim)", border: `1px solid rgba(59,130,246, 0.2)`, color: ACCENT_COLOR, fontSize: 13, fontWeight: 600 }}>
                La Solución
               </div>
            </div>
            <h2 className="col-section-h2 col-title" style={{
              fontWeight: 700, fontSize: "clamp(36px, 5vw, 64px)",
              textAlign: "center", marginBottom: 24,
            }}>
              Una plataforma.<br/>Todos tus canales.
            </h2>
            <p style={{ fontSize: 18, color: "var(--text-muted)", textAlign: "center", maxWidth: 600, margin: "0 auto 80px", lineHeight: 1.6 }}>
              Zefirus reemplaza 5 herramientas separadas con una sola experiencia diseñada para agencias de alto rendimiento.
            </p>
          </Reveal>

          {/* Bento Box Layout for Features to match Collabora's dynamic grids */}
          <div className="col-features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {FEATURES.map((f, i) => (
              <Reveal key={i} delay={i * 0.1} className={i === 0 || i === 3 ? "col-span-2" : "col-span-1"} style={{ gridColumn: (i === 0 || i === 3) ? "span 2" : "span 1" }}>
                <SpotlightCard style={{ padding: "40px 32px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{
                      width: 56, height: 56, borderRadius: 16,
                      background: "linear-gradient(135deg, rgba(59,130,246, 0.2), rgba(59,130,246, 0.05))",
                      border: "1px solid rgba(59,130,246, 0.2)",
                      boxShadow: "0 10px 20px rgba(59,130,246, 0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginBottom: 24, color: "var(--foreground)",
                    }}>
                      {f.icon}
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: ACCENT_COLOR, marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      {f.codename}
                    </p>
                    <h3 style={{ fontSize: 28, fontWeight: 600, marginBottom: 12, letterSpacing: "-0.02em", color: "var(--foreground)" }}>
                      {f.title}
                    </h3>
                    <p style={{ fontSize: 16, color: "var(--text-muted)", lineHeight: 1.6, maxWidth: 400 }}>
                      {f.desc}
                    </p>
                  </div>
                  {/* Decorative faint pattern */}
                  <div style={{ position: "absolute", bottom: -20, right: -20, opacity: 0.05, transform: "scale(2)", color: ACCENT_COLOR }}>
                     {f.icon}
                  </div>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
         HOW IT WORKS
         ═══════════════════════════════════════════════════════ */}
      <section style={{ position: "relative", zIndex: 1, padding: "120px 24px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <Reveal>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 16 }}>
             <div style={{ padding: "6px 16px", borderRadius: 980, background: "var(--cyan-dim)", border: `1px solid rgba(59,130,246, 0.2)`, color: ACCENT_COLOR, fontSize: 13, fontWeight: 600 }}>
              Cómo Funciona
             </div>
          </div>
          <h2 className="col-section-h2 col-title" style={{
            fontWeight: 700, fontSize: "clamp(36px, 5vw, 64px)",
            textAlign: "center", marginBottom: 80,
          }}>
            Tres pasos.<br/>Cero complicaciones.
          </h2>
        </Reveal>

        <div className="col-steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
          {[
            { step: "01", title: "Conecta tus canales", desc: "Vincula Meta, TikTok, Google y WhatsApp desde Integraciones. OAuth seguro, sin tokens manuales.", icon: <Globe style={{ width: 28, height: 28 }} /> },
            { step: "02", title: "Centraliza en Resumen", desc: "Campañas, métricas y conversaciones fluyen a tu dashboard en tiempo real. Un solo login.", icon: <LineChart style={{ width: 28, height: 28 }} /> },
            { step: "03", title: "Optimiza y Escala", desc: "Briefs IA genera contenido. Los Chatbots ejecutan. Tú solo decides y escalas los resultados.", icon: <TrendingUp style={{ width: 28, height: 28 }} /> },
          ].map((s, i) => (
            <Reveal key={i} delay={i * 0.15}>
              <div style={{ position: "relative", padding: "32px 0" }}>
                <div style={{
                  position: "absolute", top: 0, left: 0,
                  fontSize: 120, fontWeight: 700, color: "rgba(255,255,255,0.02)",
                  lineHeight: 1, zIndex: 0, letterSpacing: "-0.05em",
                }}>
                  {s.step}
                </div>
                <div style={{ position: "relative", zIndex: 1, paddingTop: 40 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 20,
                    background: "var(--surface)", border: "1px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 24, color: "var(--foreground)",
                  }}>
                    {s.icon}
                  </div>
                  <h3 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16, color: "var(--foreground)", letterSpacing: "-0.02em" }}>
                    {s.title}
                  </h3>
                  <p style={{ fontSize: 16, color: "var(--text-muted)", lineHeight: 1.6 }}>
                    {s.desc}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
         STATS
         ═══════════════════════════════════════════════════════ */}
      <section style={{ position: "relative", zIndex: 1, padding: "120px 24px", border: "1px solid var(--hairline)", background: "var(--surface)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="col-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32, textAlign: "center" }}>
            {[
              { refP: c1, label: "ROAS Promedio" },
              { refP: c2, label: "Conversaciones" },
              { refP: c3, label: "Campañas Activas" },
              { refP: c4, label: "Clientes Satisfechos" },
            ].map((s, i) => (
              <div key={i} ref={s.refP.ref} style={{ padding: "32px 16px" }}>
                <div className="col-title" style={{
                  fontSize: "clamp(48px, 5vw, 72px)", fontWeight: 700,
                  lineHeight: 1, marginBottom: 16,
                  letterSpacing: "-0.04em",
                }}>
                  {s.refP.value}
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
         FINAL CTA 
         ═══════════════════════════════════════════════════════ */}
      <section style={{
        position: "relative", zIndex: 1,
        padding: "160px 24px",
        textAlign: "center",
      }}>
        <div className="col-glow-bg" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 800, height: 400, opacity: 0.15 }} />
        <Reveal style={{ position: "relative", zIndex: 2 }}>
          <h2 className="col-section-h2 col-title" style={{
            fontWeight: 700, fontSize: "clamp(40px, 6vw, 80px)",
            lineHeight: 1.05, marginBottom: 24,
          }}>
            Tu marketing merece<br/>un centro de mando.
          </h2>
          <p style={{ fontSize: 18, color: "var(--text-muted)", lineHeight: 1.6, maxWidth: 500, margin: "0 auto 48px" }}>
            Únete a los equipos que ya dejaron de saltar entre pestañas y empezaron a ver resultados reales.
          </p>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <Link href="/login" className="col-pill col-pill-primary" aria-label="Crear cuenta gratis en Zefirus" style={{ padding: "18px 40px", fontSize: 18 }}>
              Crear cuenta gratis
            </Link>
            <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Sin tarjeta · Cancela cuando quieras</p>
          </div>
        </Reveal>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ position: "relative", zIndex: 1, border: "1px solid var(--hairline)", background: "var(--surface)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 24px 40px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 48, flexWrap: "wrap" }}>
            <div style={{ maxWidth: 300 }}>
              <ZefirusLogo size="sm" animated={false} />
              <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 16, lineHeight: 1.6 }}>
                Plataforma de inteligencia multicanal para agencias y anunciantes en México y LATAM.
              </p>
            </div>
            <div className="col-footer-cols" style={{ display: "flex", gap: 64, flexWrap: "wrap" }}>
              <FooterCol title="Legal" links={[
                { label: "Términos de Servicio", href: "/condiciones-del-servicio" },
                { label: "Política de Privacidad", href: "/aviso-de-privacidad" },
                { label: "Eliminación de Datos", href: "/data-deletion" },
              ]} />
              <FooterCol title="Producto" links={[
                { label: "Iniciar Sesión", href: "/login" },
                { label: "Contacto", href: "mailto:soporte@zefirus.xyz" },
              ]} />
            </div>
          </div>
          <div className="col-footer-bottom" style={{
            marginTop: 64, paddingTop: 24,
            border: "1px solid var(--hairline)",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
          }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}> {new Date().getFullYear()} Zefirus. Todos los derechos reservados.</span>
            <span style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
              Hecho en México <MapPin size={14} />
            </span>
          </div>
        </div>
      </footer>

      </main>
    </div>
    </ReactLenis>
  );
}

/* ═══ REUSABLE COMPONENTS ═══ */

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 16, letterSpacing: "0.02em" }}>{title}</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {links.map(l => (
          <Link key={l.href} href={l.href} style={{ fontSize: 14, color: "var(--text-muted)", textDecoration: "none", transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
          >{l.label}</Link>
        ))}
      </div>
    </div>
  );
}

function SpotlightCard({ children, className = "", style = {} }: { children: React.ReactNode, className?: string, style?: React.CSSProperties }) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`col-card ${className}`}
      style={style}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, rgba(59,130,246,0.12), transparent 40%)`,
          transition: "opacity 0.3s ease",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div style={{ position: "relative", zIndex: 1, height: "100%" }}>
        {children}
      </div>
    </div>
  );
}
