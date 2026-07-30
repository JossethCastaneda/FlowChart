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
  MapPin,
  X
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

// ── CTA único self-serve (deck §0). Todos los CTA primarios apuntan aquí. ──
const SIGNUP_URL = "/login?register=1"; // "Empieza gratis": deep-link a "Crear cuenta"
const LOGIN_URL = "/login";             // "Entrar": clientes existentes (secundario)

// Ítems de nav (anclas a secciones que se crean en pasos posteriores del deck)
const NAV_LINKS: [string, string][] = [
  ["#por-que", "Por qué Zefirus"],
  ["#precios", "Precios"],
  ["#faq", "Preguntas"],
];
const PRODUCT_PILLARS: [string, string][] = [
  ["#pilar-publicidad", "Publicidad"],
  ["#pilar-conversaciones", "Conversaciones"],
  ["#pilar-contenido", "Contenido"],
];


export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [productOpen, setProductOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  // Nav sólido al hacer scroll. Lenis (smooth scroll) no propaga el evento 'scroll'
  // nativo a window, pero sí actualiza window.scrollY — lo leemos por rAF.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setScrolled(window.scrollY > 40);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
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
            #ffffff 30%,
            #cfe0ff 50%,
            #ffffff 70%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          color: transparent; /* Fallback */
          animation: shine 9s linear infinite;
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
          .col-outcome-row { grid-template-columns: 1fr !important; }
          .col-outcome-head { display: none !important; }
          .col-pilar-grid { grid-template-columns: 1fr !important; }
          .col-porque-row { grid-template-columns: 1fr !important; }
          .col-porque-head { display: none !important; }
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
        position: "fixed", top: scrolled ? 16 : 22, left: "50%", transform: "translateX(-50%)", zIndex: 100,
        width: scrolled ? "90%" : "96%", maxWidth: scrolled ? 1000 : 1280,
        background: scrolled ? "rgba(9,11,16,0.72)" : "transparent",
        border: scrolled ? "1px solid rgba(255,255,255,0.10)" : "1px solid transparent",
        boxShadow: scrolled ? "0 10px 40px rgba(0,0,0,0.45)" : "none",
        backdropFilter: scrolled ? "blur(16px) saturate(140%)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(16px) saturate(140%)" : "none",
        borderRadius: 999,
        transition: "all 0.4s ease",
      }}>
        <div style={{ padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
            <ZefirusLogo size="sm" animated={false} showText={false} />
            <span style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.04em" }}>Zefirus</span>
          </Link>
          <nav className="col-nav-links" style={{ display: "flex", alignItems: "center", gap: 36 }}>
            {/* Producto — dropdown con los 3 pilares (deck §0) */}
            <div
              style={{ position: "relative" }}
              onMouseEnter={() => setProductOpen(true)}
              onMouseLeave={() => setProductOpen(false)}
            >
              <button
                className="col-nav-link"
                aria-haspopup="true"
                aria-expanded={productOpen}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", font: "inherit", padding: 0 }}
              >
                Producto
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ transform: productOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {productOpen && (
                <div style={{ position: "absolute", top: "100%", left: 0, paddingTop: 16 }}>
                  <div style={{
                    minWidth: 220, background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 14, padding: 8, display: "flex", flexDirection: "column", gap: 2,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
                  }}>
                    {PRODUCT_PILLARS.map(([href, label]) => (
                      <a key={href} href={href} className="col-nav-link" onClick={() => setProductOpen(false)}
                        style={{ padding: "9px 12px", borderRadius: 8, whiteSpace: "nowrap" }}>
                        {label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {NAV_LINKS.map(([href, label]) => (
              <a key={href} href={href} className="col-nav-link">{label}</a>
            ))}
          </nav>
          <div className="col-nav-links" style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Link href={LOGIN_URL} className="col-nav-link" style={{ textDecoration: "none" }}>Entrar</Link>
            <Link href={SIGNUP_URL} aria-label="Empieza gratis en Zefirus" style={{
              padding: "9px 20px", borderRadius: 980,
              background: `linear-gradient(180deg, ${GRADIENT_START} 0%, ${ACCENT_COLOR} 100%)`,
              color: "#fff",
              border: "none",
              fontSize: 14, fontWeight: 600,
              textDecoration: "none", transition: "filter 0.25s", whiteSpace: "nowrap",
            }}
              onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}>
              Empieza gratis
            </Link>
          </div>
          <button className="apple-burger" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Menú">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d={mobileMenu ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className={`apple-mobile-menu ${mobileMenu ? "open" : ""}`} style={{ background: "var(--background)", border: "1px solid var(--hairline)", borderRadius: "0 0 24px 24px" }}>
          {[...PRODUCT_PILLARS, ...NAV_LINKS].map(([href, label]) => (
            <a key={href} href={href} onClick={() => setMobileMenu(false)}>{label}</a>
          ))}
          <Link href={LOGIN_URL} onClick={() => setMobileMenu(false)} style={{
            padding: "10px 0", color: "var(--text-secondary)", fontWeight: 500, fontSize: 15, textDecoration: "none",
          }}>
            Entrar
          </Link>
          <Link href={SIGNUP_URL} onClick={() => setMobileMenu(false)} style={{
            padding: "10px 0", color: ACCENT_COLOR, fontWeight: 600, fontSize: 15, textDecoration: "none",
          }}>
            Empieza gratis →
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
        {/* Hero background video (added behind all content — layout/padding untouched) */}
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          style={{
            position: "absolute", top: 0, left: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            zIndex: -2,
            pointerEvents: "none",
          }}
        >
          <source src="/hero/zefirus-hero.mp4" type="video/mp4" />
        </video>
        {/* Readability overlay over the video (keeps white text legible) */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0,
            zIndex: -1,
            pointerEvents: "none",
            background: "radial-gradient(ellipse 95% 70% at 50% 47%, rgba(9,11,16,0.82) 0%, rgba(9,11,16,0.46) 55%, rgba(9,11,16,0.10) 86%), linear-gradient(180deg, rgba(9,11,16,0.55) 0%, rgba(9,11,16,0.28) 24%, rgba(9,11,16,0.52) 74%, rgba(9,11,16,0.95) 100%)",
          }}
        />
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

        {/* Eyebrow — etiqueta de categoría (deck §1) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          style={{ marginBottom: 24, maxWidth: 640 }}
        >
          <span style={{
            fontSize: 13, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase",
            color: ACCENT_COLOR,
          }}>
            El centro de mando para agencias de marketing en LATAM
          </span>
        </motion.div>

        {/* Headline (Animated Text with Shimmer) */}
        <h1 
          className="col-hero-h1 text-shimmer" style={{
            fontFamily: "var(--font-instrument), Georgia, 'Times New Roman', serif",
            fontWeight: 400,
            fontSize: "clamp(48px, 7vw, 84px)",
            lineHeight: 1.05,
            marginBottom: 24,
            maxWidth: 900,
          }}
        >
          <AnimatedText text="Maneja tus 20 clientes desde" delayOffset={0.4} />
          <br/>
          <span style={{ fontStyle: "italic", WebkitTextFillColor: ACCENT_COLOR, color: ACCENT_COLOR }}>una sola pantalla.</span>
        </h1>

        {/* Subtitle */}
        <motion.p 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1.5, ease: "easeOut" }}
          style={{
            fontSize: "clamp(16px, 2vw, 20px)",
            fontWeight: 400,
            color: "rgba(255,255,255,0.90)",
            lineHeight: 1.6,
            maxWidth: 680,
            marginBottom: 48,
          }}
        >
          Zefirus junta la pauta, el WhatsApp y el contenido de todas tus cuentas en un solo login.
          Dejas de brincar entre Metas, TikToks y el Excel del lunes, y ves qué jala y qué quema
          presupuesto por cliente, en el mismo lugar. Hecho en México, en pesos y con soporte que sí contesta.
        </motion.p>

        {/* CTAs — un solo motion self-serve (deck §1) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1.7, ease: "easeOut" }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, position: "relative", zIndex: 10, marginBottom: 40 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
            <Link href={SIGNUP_URL} className="col-pill col-pill-primary" aria-label="Empieza gratis en Zefirus" style={{ height: 56, padding: "0 36px", borderRadius: 14 }}>
              Empieza gratis
            </Link>
            <a href="#como-funciona" className="col-pill col-pill-secondary" style={{ height: 56, padding: "0 28px", borderRadius: 14, display: "inline-flex", alignItems: "center" }}>
              Ver cómo funciona
            </a>
          </div>
          {/* Microcopy — reduce fricción */}
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", margin: 0, maxWidth: 560, lineHeight: 1.5 }}>
            Gratis para empezar. Sin tarjeta. Conectas tus cuentas y las ves todas juntas en minutos.
          </p>
          {/* Venta asistida — puerta secundaria, jerarquía baja */}
          {/* TODO: destino de venta asistida (correo/WhatsApp) por definir — hoy ancla a Precios/Enterprise */}
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
            ¿Equipo grande o necesidades a la medida?{" "}
            <a href="#precios" style={{ color: ACCENT_COLOR, textDecoration: "underline", textUnderlineOffset: 3 }}>
              Escríbenos y te armamos el arranque en un demo.
            </a>
          </p>
          {/* Chip de urgencia honesta (sin promesa de precio de por vida) */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 14px", borderRadius: 980,
            background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.25)",
            fontSize: 12.5, color: ACCENT_COLOR, fontWeight: 500, marginTop: 8,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: ACCENT_COLOR }} />
            Cohorte fundadora abierta · cupos limitados
          </div>
        </motion.div>

        {/* Caption honesta del mockup (deck §1) */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 2.0 }}
          style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 8px", maxWidth: 620, lineHeight: 1.5, position: "relative", zIndex: 3, textAlign: "center" }}
        >
          Así se ve tu agencia completa en Zefirus: las campañas, los chats y el calendario de todas
          tus cuentas, en un tablero. Los datos mostrados son de ejemplo.
        </motion.p>

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
          {/* Badge honesto: datos ilustrativos (regla dura de honestidad) */}
          <div style={{
            position: "absolute", top: 16, right: 16, zIndex: 20,
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "5px 12px", borderRadius: 980,
            background: "rgba(9,11,16,0.72)", border: "1px solid rgba(255,255,255,0.16)",
            backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
            fontSize: 11.5, fontWeight: 600, color: "var(--foreground)", letterSpacing: "0.02em",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--amber)" }} />
            Vista de ejemplo
          </div>
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
              El día a día real de tu agencia
             </div>
          </div>
          <h2 className="col-section-h2 col-title" style={{
            fontWeight: 700, fontSize: "clamp(36px, 5vw, 64px)",
            textAlign: "center", marginBottom: 20,
          }}>
            <span style={{ WebkitTextFillColor: ACCENT_COLOR, color: ACCENT_COLOR }}>20</span> clientes,{" "}
            <span style={{ WebkitTextFillColor: ACCENT_COLOR, color: ACCENT_COLOR }}>40</span> pestañas abiertas y un solo tú.
          </h2>
          <p style={{ fontSize: "clamp(16px, 2vw, 19px)", color: "var(--text-secondary)", textAlign: "center", maxWidth: 680, margin: "0 auto 72px", lineHeight: 1.6 }}>
            Sostienes cada cuenta con Excel, capturas de pantalla y pura memoria. Así se te va el mes:
            apagando fuegos en lugar de hacer crecer cuentas.
          </p>
        </Reveal>

        <div className="col-pain-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
          {[
            { icon: LineChart, title: "El reporte del lunes", desc: "Entras a Meta, brincas a TikTok, entras a Google Ads, copias el número, lo pegas en el Excel del lunes. Multiplícalo por 20 cuentas. Se te va la mañana vaciando datos a mano en lugar de decidir qué campaña subir y cuál apagar." },
            { icon: MessageSquare, title: "El lead que se enfría", desc: "Un cliente vende por WhatsApp, otro por Instagram, otro por Messenger. Los mensajes llegan a seis celulares distintos y a nadie en particular. Para cuando alguien contesta, el prospecto ya le compró al de enfrente. Y a ti te toca explicar en la junta por qué no cerraron." },
            { icon: DollarSign, title: "“¿Y cuánto vendí?”", desc: "El cliente te marca y te pregunta cuánto le dejó la inversión del mes. Tú abres cuatro plataformas, sumas de memoria y contestas con un “déjame lo checo y te confirmo”. Mientras tanto, el domingo en la noche vuelves a armar la parrilla de contenido desde cero para los mismos 20 clientes." },
          ].map((p, i) => {
            const Icon = p.icon;
            return (
              <Reveal key={i} delay={i * 0.12}>
                <SpotlightCard style={{ padding: "36px 30px", height: "100%" }}>
                  <div className="col-glow-bg" style={{ top: 0, right: 0, width: 150, height: 150, opacity: 0.08 }} />
                  <div style={{ position: "relative", zIndex: 1, textAlign: "left" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(224,168,60,0.10)", border: "1px solid rgba(224,168,60,0.22)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                      <Icon style={{ width: 22, height: 22, color: "var(--amber)" }} />
                    </div>
                    <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", marginBottom: 12, letterSpacing: "-0.01em" }}>{p.title}</h3>
                    <p style={{ fontSize: 15.5, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>{p.desc}</p>
                  </div>
                </SpotlightCard>
              </Reveal>
            );
          })}
        </div>

        {/* Cierre a ancho completo — puente hacia Outcome (deck §2) */}
        <Reveal delay={0.1}>
          <div style={{ marginTop: 40, padding: "34px 40px", borderRadius: 20, background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <p style={{ fontSize: "clamp(17px, 2.1vw, 22px)", color: "var(--foreground)", lineHeight: 1.55, margin: "0 auto", fontWeight: 500, textAlign: "center", maxWidth: 920 }}>
              Ninguna herramienta gringa te va a resolver esto: cobran en dólares, tratan WhatsApp como
              plugin y cuando algo truena te contesta un bot en inglés. El desgaste viene de operar
              cuenta por cuenta, pestaña por pestaña.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ═══════════════════════════════════════════════════════
         OUTCOME — Antes → Con Zefirus (deck §3)
         ═══════════════════════════════════════════════════════ */}
      <section id="outcome" style={{ position: "relative", zIndex: 1, padding: "120px 24px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <Reveal>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 16 }}>
            <div style={{ padding: "6px 16px", borderRadius: 980, background: "var(--cyan-dim)", border: `1px solid rgba(59,130,246, 0.2)`, color: ACCENT_COLOR, fontSize: 13, fontWeight: 600 }}>
              Así se ve tu agencia con Zefirus
            </div>
          </div>
          <h2 className="col-section-h2 col-title" style={{ fontWeight: 700, fontSize: "clamp(34px, 4.6vw, 58px)", textAlign: "center", marginBottom: 20, maxWidth: 940, marginLeft: "auto", marginRight: "auto" }}>
            De 40 pestañas y el Excel del lunes, a{" "}
            <span style={{ WebkitTextFillColor: ACCENT_COLOR, color: ACCENT_COLOR }}>una sola pantalla</span>{" "}
            que hasta tu cliente entiende.
          </h2>
          <p style={{ fontSize: "clamp(16px, 2vw, 19px)", color: "var(--text-secondary)", textAlign: "center", maxWidth: 760, margin: "0 auto 56px", lineHeight: 1.6 }}>
            Imagínate el lunes: abres un login, ves las 20 cuentas juntas, sabes qué campaña jala y cuál
            quema, contestas los WhatsApp del fin y mandas el reporte antes del café. Sin brincar entre
            logins, sin vaciar números a mano, sin sostener a tus clientes con alambritos.
          </p>
        </Reveal>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 980, margin: "0 auto" }}>
          {/* Encabezados (solo desktop) */}
          <div className="col-outcome-head" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "0 20px" }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>Antes</span>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: ACCENT_COLOR }}>Con Zefirus</span>
          </div>
          {[
            { antes: "6 apps peleadas entre sí y 40 pestañas abiertas para no perder ninguna cuenta.", con: "Un solo login para ver las 20 cuentas juntas. Se acabaron las 40 pestañas." },
            { antes: "El Excel del lunes: números de Meta, TikTok y Google copiados a mano, cliente por cliente.", con: "La pauta de todos tus clientes junta y actualizada sola. Adiós al Excel del lunes." },
            { antes: "WhatsApp del cliente contestado tarde, desde tres celulares distintos.", con: "Todos los WhatsApp, Instagram y Messenger en una bandeja, con bots que atienden 24/7." },
            { antes: "Domingo en la noche armando la parrilla de contenido de cero.", con: "Parrillas, copies y briefs con IA que habla como se habla aquí. Recuperas tu domingo." },
          ].map((row, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <div className="col-outcome-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "18px 20px", borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <X style={{ width: 18, height: 18, color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 15, color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>{row.antes}</p>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "18px 20px", borderRadius: 14, background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.25)" }}>
                  <CheckCircle2 style={{ width: 18, height: 18, color: ACCENT_COLOR, flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 15, color: "var(--foreground)", fontWeight: 500, lineHeight: 1.5, margin: 0 }}>{row.con}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 48 }}>
            <Link href={SIGNUP_URL} className="col-pill col-pill-primary" aria-label="Empieza gratis en Zefirus" style={{ height: 56, padding: "0 36px", borderRadius: 14 }}>
              Empieza gratis, sin tarjeta
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ═══════════════════════════════════════════════════════
         SOLUCIÓN — 3 pilares (deck §4)
         ═══════════════════════════════════════════════════════ */}
      <section id="solucion" style={{
        position: "relative", zIndex: 1,
        padding: "160px 24px",
      }}>
        {/* Massive Background Glow */}
        <div className="col-glow-bg" style={{ top: "30%", left: "50%", transform: "translate(-50%, -50%)", width: "80vw", height: 800, opacity: 0.08 }} />

        <div style={{ maxWidth: 1120, margin: "0 auto", position: "relative", zIndex: 2 }}>
          <Reveal>
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 16 }}>
               <div style={{ padding: "6px 16px", borderRadius: 980, background: "var(--cyan-dim)", border: `1px solid rgba(59,130,246, 0.2)`, color: ACCENT_COLOR, fontSize: 13, fontWeight: 600 }}>
                Toda tu operación, en tres frentes
               </div>
            </div>
            <h2 className="col-section-h2 col-title" style={{
              fontWeight: 700, fontSize: "clamp(34px, 4.6vw, 58px)",
              textAlign: "center", marginBottom: 24, maxWidth: 920, marginLeft: "auto", marginRight: "auto",
            }}>
              Pauta, conversaciones y contenido de todas tus cuentas, en un solo lugar.
            </h2>
          </Reveal>

          {[
            { n: "01", anchor: "pilar-publicidad", title: "Publicidad", blocks: [
              { icon: Target, name: "Impulso", benefit: "Toda la pauta de todos tus clientes, en una pantalla", desc: "Meta, TikTok y Google Ads de las 20 cuentas juntas, sin brincar entre logins ni vaciar números a mano. Adiós al Excel del lunes: aquí ves todo actualizado solo." },
              { icon: Activity, name: "Pulso", benefit: "Sabes qué campaña jala y cuál quema presupuesto, por cliente", desc: "El rendimiento de cada cuenta a la vista, cliente por cliente, en el mismo lugar. Detectas el presupuesto que se está quemando antes de que el cliente te lo reclame en la junta." },
            ] },
            { n: "02", anchor: "pilar-conversaciones", title: "Conversaciones", blocks: [
              { icon: MessageSquare, name: "Señal", benefit: "Todos los WhatsApp de tus clientes en una sola bandeja", desc: "El inbox de WhatsApp, Instagram y Messenger de todas tus cuentas junto, sin repartirte entre tres celulares. WhatsApp es el canal principal, tratado como se merece: por aquí es por donde de verdad se cierra." },
              { icon: Bot, name: "Piloto", benefit: "Bots que atienden, califican y asignan leads mientras duermes", desc: "Chatbots en español que contestan al instante 24/7, filtran al que sí va en serio y le pasan el lead caliente a tu equipo. Ningún mensaje del fin de semana se queda sin respuesta hasta el lunes." },
            ] },
            { n: "03", anchor: "pilar-contenido", title: "Contenido / IA", blocks: [
              { icon: Sparkles, name: "Nova", benefit: "Parrillas, copies y briefs con IA, sin empezar de cero cada semana", desc: "Una IA que habla como se habla aquí y te arma la parrilla, el copy y el brief de cada cliente en minutos. Recuperas la noche del domingo que hoy pierdes armando contenido." },
              { icon: Globe, name: "Lanzadera", benefit: "Programa y publica en las redes de todos tus clientes desde un calendario", desc: "Un solo calendario para agendar y publicar en las cuentas de las 20 marcas, sin andar entrando a cada perfil a la hora exacta. Programas la semana completa de una sentada y te olvidas." },
            ] },
          ].map((pilar, pi) => (
            <div key={pilar.anchor} id={pilar.anchor} style={{ scrollMarginTop: 100, marginTop: pi === 0 ? 64 : 80 }}>
              <Reveal>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                    Pilar <span style={{ color: ACCENT_COLOR }}>{pilar.n}</span> · {pilar.title}
                  </span>
                  <div style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
                </div>
              </Reveal>
              <div className="col-pilar-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                {pilar.blocks.map((b, bi) => {
                  const Icon = b.icon;
                  return (
                    <Reveal key={bi} delay={bi * 0.1}>
                      <SpotlightCard style={{ padding: "34px 30px", height: "100%" }}>
                        <div style={{ position: "relative", zIndex: 1 }}>
                          <div style={{
                            width: 48, height: 48, borderRadius: 13,
                            background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.05))",
                            border: "1px solid rgba(59,130,246,0.2)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            marginBottom: 20, color: ACCENT_COLOR,
                          }}>
                            <Icon style={{ width: 22, height: 22 }} />
                          </div>
                          <p style={{ fontSize: 12, fontWeight: 700, color: ACCENT_COLOR, marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                            {b.name}
                          </p>
                          <h3 style={{ fontSize: "clamp(19px, 2vw, 22px)", fontWeight: 700, marginBottom: 12, letterSpacing: "-0.01em", color: "var(--foreground)", lineHeight: 1.25 }}>
                            {b.benefit}
                          </h3>
                          <p style={{ fontSize: 15.5, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                            {b.desc}
                          </p>
                        </div>
                      </SpotlightCard>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Cierre del bloque Solución (deck §4) */}
          <Reveal delay={0.1}>
            <div style={{ marginTop: 56, padding: "30px 40px", borderRadius: 20, background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <p style={{ fontSize: "clamp(16px, 2vw, 20px)", color: "var(--foreground)", lineHeight: 1.55, margin: "0 auto", fontWeight: 500, textAlign: "center", maxWidth: 900 }}>
                Todo esto vive en un solo login, hecho en México, en pesos y con soporte humano que
                contesta en español. Es la pantalla desde donde manejas tu agencia completa.
              </p>
            </div>
          </Reveal>

          {/* CTA — primario + venta asistida secundaria */}
          <Reveal delay={0.1}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexWrap: "wrap", marginTop: 40 }}>
              <Link href={SIGNUP_URL} className="col-pill col-pill-primary" aria-label="Empieza gratis en Zefirus" style={{ height: 56, padding: "0 36px", borderRadius: 14 }}>
                Empieza gratis, sin tarjeta
              </Link>
              <a href="#precios" style={{ fontSize: 15, color: "var(--text-secondary)", textDecoration: "none" }}>
                ¿Equipo grande? <span style={{ color: ACCENT_COLOR, textDecoration: "underline", textUnderlineOffset: 3 }}>Habla con nosotros</span>
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
         HOW IT WORKS
         ═══════════════════════════════════════════════════════ */}
      <section id="como-funciona" style={{ position: "relative", zIndex: 1, padding: "120px 24px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <Reveal>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 16 }}>
             <div style={{ padding: "6px 16px", borderRadius: 980, background: "var(--cyan-dim)", border: `1px solid rgba(59,130,246, 0.2)`, color: ACCENT_COLOR, fontSize: 13, fontWeight: 600 }}>
              Cómo Funciona
             </div>
          </div>
          <h2 className="col-section-h2 col-title" style={{
            fontWeight: 700, fontSize: "clamp(34px, 4.6vw, 58px)",
            textAlign: "center", marginBottom: 20, maxWidth: 880, marginLeft: "auto", marginRight: "auto",
          }}>
            De 40 pestañas a una sola pantalla en 3 pasos
          </h2>
          <p style={{ fontSize: "clamp(16px, 2vw, 19px)", color: "var(--text-secondary)", textAlign: "center", maxWidth: 680, margin: "0 auto 72px", lineHeight: 1.6 }}>
            Sin migraciones eternas, sin consultor, sin manual de 80 páginas. Conectas tus cuentas y el
            lunes ya operas distinto.
          </p>
        </Reveal>

        <div className="col-steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
          {[
            { step: "01", title: "Conecta tus cuentas", desc: "Enlazas los Meta, TikTok, Google Ads y WhatsApp de todos tus clientes con el login oficial de cada plataforma. Zefirus se conecta por la puerta de enfrente, con los permisos que tú controlas y sin contraseñas prestadas ni pantallazos. Toma minutos.", icon: <Globe style={{ width: 28, height: 28 }} /> },
            { step: "02", title: "Míralas todas juntas", desc: "Toda la pauta, todos los mensajes y todo el contenido de tus 20 cuentas caen en un solo tablero. Ves qué campaña jala y cuál quema presupuesto, cliente por cliente, sin brincar entre logins ni vaciar números a mano en el Excel del lunes.", icon: <LineChart style={{ width: 28, height: 28 }} /> },
            { step: "03", title: "Opera y responde desde ahí", desc: "Contestas WhatsApp, programas contenido y armas el reporte del cliente sin salir de Zefirus. Lo que antes te comía el viernes en la noche ahora sale en una pantalla. Se acabó perseguir pestañas.", icon: <TrendingUp style={{ width: 28, height: 28 }} /> },
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

        {/* Microcopy honesto (deck §5) */}
        <Reveal delay={0.1}>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", textAlign: "center", maxWidth: 620, margin: "48px auto 0", lineHeight: 1.6 }}>
            Los números que ves en la demo son una vista de ejemplo. Tus datos reales aparecen en cuanto
            conectas tu primera cuenta.
          </p>
        </Reveal>
      </section>

      {/* ═══════════════════════════════════════════════════════
         POR QUÉ ZEFIRUS — comparativa vs. las gringas (deck §6)
         ═══════════════════════════════════════════════════════ */}
      <section id="por-que" style={{ position: "relative", zIndex: 1, padding: "120px 24px", maxWidth: 1200, margin: "0 auto", width: "100%", scrollMarginTop: 90 }}>
        <Reveal>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 16 }}>
            <div style={{ padding: "6px 16px", borderRadius: 980, background: "var(--cyan-dim)", border: `1px solid rgba(59,130,246, 0.2)`, color: ACCENT_COLOR, fontSize: 13, fontWeight: 600 }}>
              Zefirus vs. las gringas
            </div>
          </div>
          <h2 className="col-section-h2 col-title" style={{ fontWeight: 700, fontSize: "clamp(32px, 4.4vw, 54px)", textAlign: "center", marginBottom: 18, maxWidth: 940, marginLeft: "auto", marginRight: "auto" }}>
            Las plataformas gringas no entienden cómo se vende en México.
          </h2>
          <p style={{ fontSize: "clamp(16px, 2vw, 20px)", color: "var(--text-secondary)", textAlign: "center", maxWidth: 800, margin: "0 auto 24px", lineHeight: 1.5, fontWeight: 500 }}>
            Cobran en dólares, tratan WhatsApp como plugin y cuando algo truena te dejan con un bot en
            inglés. Nosotros operamos como tú operas.
          </p>
          <p style={{ fontSize: "clamp(15px, 1.8vw, 17px)", color: "var(--text-muted)", textAlign: "center", maxWidth: 760, margin: "0 auto 56px", lineHeight: 1.6 }}>
            Zefirus reemplaza el Frankenstein de 6 apps más el Excel del lunes con el que hoy sostienes
            a tus clientes. Compara lo que usas ahora contra una sola pantalla para todas tus cuentas.
          </p>
        </Reveal>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 1040, margin: "0 auto" }}>
          {/* Encabezados de columna (solo desktop) */}
          <div className="col-porque-head" style={{ display: "grid", gridTemplateColumns: "170px 1fr 1fr", gap: 14, padding: "0 20px" }}>
            <span />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>Tu stack de hoy</span>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: ACCENT_COLOR }}>Con Zefirus</span>
          </div>
          {[
            { label: "Costo", left: "Suscripciones en dólares que suben cada vez que el tipo de cambio se mueve, más 6 herramientas que pagas por separado.", right: "Un solo precio en pesos, sin sustos de tipo de cambio. Toda tu operación en un plan." },
            { label: "Plataformas", left: "40 pestañas abiertas: Meta por aquí, TikTok por allá, Google Ads en otra, y un login distinto por cada cliente.", right: "Meta, TikTok y Google Ads de las 20 cuentas juntas en una pantalla. Un login, todas tus cuentas." },
            { label: "Inbox", left: "Mensajes regados: WhatsApp en un celular, Instagram en otro, y los leads que se enfrían mientras alguien los ve.", right: "WhatsApp, Instagram y Messenger de todos tus clientes en una sola bandeja, con bots que atienden, califican y asignan 24/7." },
            { label: "Reportes y ROI", left: "El Excel del lunes: vaciar números a mano, cliente por cliente, para armar el reporte del viernes en vez de venderle.", right: "Ves qué campaña jala y cuál quema presupuesto por cliente, en vivo y en el mismo lugar. El reporte ya está hecho." },
            { label: "WhatsApp", star: true, left: "Un plugin de segunda, pegado con alambritos, cuando aquí es el canal por el que de verdad se vende.", right: "WhatsApp como canal de primera, integrado desde el día uno. Porque aquí se cierra por WhatsApp, y eso lo sabemos." },
            { label: "Soporte", left: "Cuando algo truena a las 8 de la noche, un chatbot en inglés y un ticket que contestan en tres días.", right: "Personas reales que contestan en español y entienden tu operación. Soporte que sí contesta." },
            { label: "Hecho para", left: "Un mercado que no es el tuyo, traducido del inglés a medias.", right: "Agencias de LATAM que cargan con 10, 20 o 50 cuentas. Hecho en México, por gente que sabe cómo se vende aquí." },
          ].map((row, i) => (
            <Reveal key={i} delay={Math.min(i, 3) * 0.06}>
              <div className="col-porque-row" style={{
                display: "grid", gridTemplateColumns: "170px 1fr 1fr", gap: 14, alignItems: "stretch",
                padding: row.star ? 4 : 0, borderRadius: 16,
                background: row.star ? "rgba(59,130,246,0.06)" : "transparent",
                border: row.star ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 20px", fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>
                  {row.star && <Star style={{ width: 16, height: 16, color: ACCENT_COLOR, fill: ACCENT_COLOR }} />}
                  {row.label}
                </div>
                <div style={{ display: "flex", gap: 11, alignItems: "flex-start", padding: "16px 20px", borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <X style={{ width: 17, height: 17, color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 14.5, color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>{row.left}</p>
                </div>
                <div style={{ display: "flex", gap: 11, alignItems: "flex-start", padding: "16px 20px", borderRadius: 14, background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.25)" }}>
                  <CheckCircle2 style={{ width: 17, height: 17, color: ACCENT_COLOR, flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 14.5, color: "var(--foreground)", fontWeight: 500, lineHeight: 1.5, margin: 0 }}>{row.right}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <p style={{ fontSize: "clamp(17px, 2.1vw, 21px)", color: "var(--foreground)", textAlign: "center", maxWidth: 820, margin: "48px auto 0", lineHeight: 1.55, fontWeight: 500 }}>
            Dejas de perseguir pestañas y empiezas a manejar tu agencia completa desde un solo lugar.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexWrap: "wrap", marginTop: 32 }}>
            <Link href={SIGNUP_URL} className="col-pill col-pill-primary" aria-label="Empieza gratis en Zefirus" style={{ height: 56, padding: "0 36px", borderRadius: 14 }}>
              Empieza gratis, sin tarjeta
            </Link>
            <a href="#precios" style={{ fontSize: 15, color: "var(--text-secondary)", textDecoration: "none" }}>
              ¿Equipo grande o a la medida? <span style={{ color: ACCENT_COLOR, textDecoration: "underline", textUnderlineOffset: 3 }}>Cuéntanos</span>
            </a>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", marginTop: 16 }}>
            Cupos de cohorte fundadora limitados. Entra antes de que se cierre.
          </p>
        </Reveal>
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
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>© {new Date().getFullYear()} Zefirus. Todos los derechos reservados.</span>
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
