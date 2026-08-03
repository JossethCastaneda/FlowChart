/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-unused-vars, react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
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
  ChevronDown,
  MapPin,
  X
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   ZEFIRUS · Landing Page — Collabora-Inspired Theme
   Dark obsidian background, cyan glows, glassmorphism,
   metallic typography, and smooth scrolling.
   ═══════════════════════════════════════════════════════ */

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

// Subhead del hero como slider rotatorio (arriba → abajo)
const HERO_SLIDES: string[] = [
  "No es un programador de posts más: Zefirus reúne la pauta, el WhatsApp y el contenido de todas tus cuentas —lo que realmente mueve el dinero— en un solo login.",
  "Operar cliente por cliente entre Meta, TikTok, WhatsApp y Excel te cuesta horas y deja que el presupuesto se fugue. Aquí ves qué rinde y qué lo drena, por cliente, en un solo lugar.",
];

// Tiempo en pantalla de cada slide según su longitud: lectura cómoda en español
// (~2.8 palabras/seg) + base para la animación de entrada/salida y comprensión.
// Acotado entre 6 s (mínimo legible) y 15 s (máximo antes de sentirse estancado).
const slideReadMs = (text: string): number => {
  const words = text.trim().split(/\s+/).length;
  return Math.min(15000, Math.max(6000, 2000 + Math.round((words / 2.8) * 1000)));
};


// Sección "problema": stepper fijado por scroll (imágenes cinematográficas en /public/pain)
const PAIN_STEPS = [
  {
    n: "01",
    nav: "Decides a ciegas",
    title: "Decides a ciegas y tarde",
    desc: "El rendimiento vive repartido en Meta, TikTok y Google Ads, cuenta por cuenta. Para cuando terminas de vaciarlo al Excel, la campaña que quemaba presupuesto ya lo quemó.",
    cost: "Optimizas días tarde, con presupuesto evitable ya gastado.",
    img: "/pain/pain-1-decides.jpg",
  },
  {
    n: "02",
    nav: "Los leads se enfrían",
    title: "Los leads se enfrían sin dueño",
    desc: "WhatsApp, Instagram y Messenger repartidos entre varios teléfonos y sin un responsable claro. Un lead que no se responde en minutos, se pierde.",
    cost: "El prospecto le compra a quien contestó primero.",
    img: "/pain/pain-2-leads.jpg",
  },
  {
    n: "03",
    nav: "No pruebas tu valor",
    title: "No puedes probar tu valor",
    desc: "Cuando el cliente pregunta qué le dejó su inversión, la respuesta está en cuatro plataformas y en tu memoria. Sin números a la mano, defiendes el fee con anécdotas.",
    cost: "Llegas a cada renovación sin con qué sustentar tu trabajo.",
    img: "/pain/pain-3-valor.jpg",
  },
];

// ── Carrusel de funciones (Solución): tarjetas con mini-mockups de UI real ──
const PILAR_CARDS: { type: string; pilar: string; name: string; benefit: string; desc: string }[] = [
  { type: "ads", pilar: "Publicidad", name: "Impulso", benefit: "Toda la pauta de todos tus clientes, en una pantalla", desc: "Meta, TikTok y Google Ads de las 20 cuentas juntas, sin alternar entre logins ni capturar números a mano." },
  { type: "perf", pilar: "Publicidad", name: "Pulso", benefit: "Sabes qué campaña rinde y cuál desperdicia presupuesto", desc: "El rendimiento de cada cuenta a la vista, cliente por cliente. Detectas el gasto que no rinde antes de la junta." },
  { type: "inbox", pilar: "Conversaciones", name: "Señal", benefit: "Todos los WhatsApp de tus clientes en una sola bandeja", desc: "WhatsApp, Instagram y Messenger de todas tus cuentas juntos, sin repartir tu atención entre tres teléfonos." },
  { type: "bot", pilar: "Conversaciones", name: "Piloto", benefit: "Bots que atienden, califican y asignan leads 24/7", desc: "Contestan al instante, filtran al que va en serio y le pasan el lead caliente a tu equipo. Ningún mensaje sin respuesta." },
  { type: "ai", pilar: "Contenido", name: "Nova", benefit: "Parrillas, copies y briefs con IA, sin empezar de cero", desc: "Una IA que te arma la parrilla, el copy y el brief de cada cliente en minutos. Recuperas la noche del domingo." },
  { type: "calendar", pilar: "Contenido", name: "Lanzadera", benefit: "Programa y publica en las redes de todos tus clientes", desc: "Un solo calendario para agendar y publicar en las 20 marcas. Programas la semana completa de una sentada." },
];

// ── "Cómo funciona": 3 pasos con imagen sincronizada (estilo ejemplo 3) ──
const HOW_STEPS = [
  { step: "01", title: "Conecta tus cuentas", desc: "Enlazas los Meta, TikTok, Google Ads y WhatsApp de todos tus clientes con el login oficial de cada plataforma. Zefirus se conecta por la vía oficial, con los permisos que tú controlas y sin contraseñas compartidas ni capturas de pantalla. Toma minutos.", img: "/steps/step-1-conecta.jpg" },
  { step: "02", title: "Míralas todas juntas", desc: "Toda la pauta, todos los mensajes y todo el contenido de tus 20 cuentas caen en un solo tablero. Ves qué campaña rinde y cuál desperdicia presupuesto, cliente por cliente, sin alternar entre logins ni capturar números a mano en el Excel del lunes.", img: "/steps/step-2-juntas.jpg" },
  { step: "03", title: "Opera y responde desde ahí", desc: "Contestas WhatsApp, programas contenido y armas el reporte del cliente sin salir de Zefirus. Lo que antes te tomaba el viernes por la noche ahora sale en una pantalla. Se terminó saltar entre pestañas.", img: "/steps/step-3-opera.jpg" },
];

const MOCK_CY = "#5b9bff";
const mbar = (w: number | string, h = 7, c = "rgba(255,255,255,0.16)") => (
  <span style={{ display: "block", width: w, height: h, borderRadius: 4, background: c }} />
);

function MockupFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "linear-gradient(180deg, #141821, #0b0d12)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        <span style={{ display: "flex", gap: 5 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c, i) => <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.6 }} />)}
        </span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, marginLeft: 4 }}>{title}</span>
      </div>
      <div style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", gap: 9, overflow: "hidden" }}>{children}</div>
    </div>
  );
}

function PilarMockup({ type }: { type: string }) {
  const rowBox: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 11px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" };
  const dotColors = ["#25d366", "#e1306c", "#0084ff"];
  switch (type) {
    case "ads":
      return (
        <MockupFrame title="Pauta · todas tus cuentas">
          {[0, 1, 2].map((i) => (
            <div key={i} style={rowBox}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 22, height: 22, borderRadius: 7, background: "rgba(91,155,255,0.16)", border: "1px solid rgba(91,155,255,0.25)" }} />
                <span style={{ display: "flex", flexDirection: "column", gap: 5 }}>{mbar(80)}{mbar(50, 6, "rgba(255,255,255,0.09)")}</span>
              </div>
              <span style={{ width: 42, height: 18, borderRadius: 6, background: i === 0 ? "rgba(91,155,255,0.9)" : "rgba(255,255,255,0.10)" }} />
            </div>
          ))}
        </MockupFrame>
      );
    case "perf":
      return (
        <MockupFrame title="Rendimiento por cliente">
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 8, padding: "6px 4px 10px" }}>
            {[38, 62, 48, 80, 55, 96, 70].map((h, i) => (
              <span key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 5, background: i === 5 ? MOCK_CY : "rgba(255,255,255,0.10)" }} />
            ))}
          </div>
          <div style={{ ...rowBox, padding: "9px 11px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: `8px solid ${MOCK_CY}` }} />
              {mbar(90)}
            </div>
            <span style={{ width: 40, height: 16, borderRadius: 6, background: "rgba(91,155,255,0.9)" }} />
          </div>
        </MockupFrame>
      );
    case "inbox":
      return (
        <MockupFrame title="Inbox unificado">
          {[0, 1, 2].map((i) => (
            <div key={i} style={rowBox}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: `2px solid ${dotColors[i]}` }} />
                <span style={{ display: "flex", flexDirection: "column", gap: 5 }}>{mbar(70)}{mbar(110, 6, "rgba(255,255,255,0.09)")}</span>
              </div>
              {i < 2 ? <span style={{ width: 8, height: 8, borderRadius: "50%", background: MOCK_CY }} /> : <span style={{ width: 8, height: 8 }} />}
            </div>
          ))}
        </MockupFrame>
      );
    case "bot":
      return (
        <MockupFrame title="Piloto · respuestas 24/7">
          <div style={{ alignSelf: "flex-start", maxWidth: "72%", padding: "10px 12px", borderRadius: "12px 12px 12px 3px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 6 }}>{mbar(120)}{mbar(80, 6)}</div>
          <div style={{ alignSelf: "flex-end", maxWidth: "72%", padding: "10px 12px", borderRadius: "12px 12px 3px 12px", background: "rgba(91,155,255,0.16)", border: "1px solid rgba(91,155,255,0.3)", display: "flex", flexDirection: "column", gap: 6 }}>{mbar(100, 7, "rgba(255,255,255,0.5)")}{mbar(64, 6, "rgba(255,255,255,0.28)")}</div>
          <div style={{ alignSelf: "flex-end", display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 11px", borderRadius: 980, background: "rgba(52,183,124,0.14)", border: "1px solid rgba(52,183,124,0.35)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34b77c" }} />{mbar(64, 6, "rgba(255,255,255,0.4)")}
          </div>
        </MockupFrame>
      );
    case "ai":
      return (
        <MockupFrame title="Contenido con IA">
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "4px 2px" }}>{mbar("100%")}{mbar("92%")}{mbar("70%")}</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {[54, 68, 44].map((w, i) => <span key={i} style={{ height: 18, width: w, borderRadius: 980, background: "rgba(91,155,255,0.12)", border: "1px solid rgba(91,155,255,0.2)" }} />)}
          </div>
          <div style={{ marginTop: "auto", alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 980, background: "rgba(91,155,255,0.16)", border: "1px solid rgba(91,155,255,0.3)" }}>
            <Sparkles style={{ width: 13, height: 13, color: MOCK_CY }} />{mbar(72, 6, "rgba(255,255,255,0.45)")}
          </div>
        </MockupFrame>
      );
    case "calendar":
      return (
        <MockupFrame title="Calendario de contenido">
          <div style={{ display: "flex", gap: 6 }}>{[0, 1, 2, 3, 4, 5, 6].map((i) => <span key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.12)" }} />)}</div>
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "1fr", gap: 6 }}>
            {Array.from({ length: 21 }).map((_, i) => {
              const filled = [2, 5, 9, 12, 15, 18].includes(i);
              return <span key={i} style={{ borderRadius: 6, background: filled ? "rgba(91,155,255,0.85)" : "rgba(255,255,255,0.04)", border: filled ? "none" : "1px solid rgba(255,255,255,0.05)" }} />;
            })}
          </div>
        </MockupFrame>
      );
    default:
      return null;
  }
}

// ── Showcase de ads: carrusel de pantallas con UI real de Meta / TikTok / WhatsApp ──
const AD_CARDS: { platform: "tiktok" | "instagram" | "whatsapp"; img: string; handle: string; caption: string; likes?: string; comments?: string; saves?: string; music?: string }[] = [
  { platform: "tiktok", img: "/ads/ad-cream.jpg", handle: "@bymariana", caption: "Mi rutina de skincare en 30 seg ✨ el frasco que me cambió la piel #skincare #glow", likes: "128.4k", comments: "2,140", saves: "9,882", music: "sonido original — bymariana" },
  { platform: "instagram", img: "/ads/ad-soda.jpg", handle: "urbansoda.mx", caption: "El sabor de la ciudad 🌆 nueva lata edición limitada.", likes: "54,203" },
  { platform: "tiktok", img: "/ads/ad-car.jpg", handle: "@drivelab", caption: "POV: la ciudad es tuya de noche 🌧️ #cars #nightdrive", likes: "301.7k", comments: "5,660", saves: "22,410", music: "night drive — synthwave mix" },
  { platform: "instagram", img: "/ads/ad-sneakers.jpg", handle: "runstep.mx", caption: "Corre distinto. Nueva colección 👟🔥", likes: "89,410" },
  { platform: "whatsapp", img: "/ads/ad-realestate.jpg", handle: "Altura Bienes Raíces", caption: "" },
];

function TikTokOverlay({ card }: { card: (typeof AD_CARDS)[number] }) {
  const rail = [
    { d: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 10-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z", label: card.likes, fill: "#fe2c55", stroke: "#fe2c55" },
    { d: "M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z", label: card.comments, fill: "none", stroke: "#fff" },
    { d: "M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z", label: card.saves, fill: "none", stroke: "#fff" },
    { d: "M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13", label: "Compartir", fill: "none", stroke: "#fff" },
  ];
  return (
    <>
      <div style={{ position: "absolute", top: 14, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 18, color: "#fff", fontSize: 13.5, fontWeight: 600, textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
        <span style={{ opacity: 0.7 }}>Siguiendo</span>
        <span style={{ borderBottom: "2px solid #fff", paddingBottom: 3 }}>Para ti</span>
      </div>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 44%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", right: 9, bottom: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 15, color: "#fff" }}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", border: "2px solid #fff", backgroundImage: `url(${card.img})`, backgroundSize: "cover", backgroundPosition: "center", marginBottom: 2 }} />
        {rail.map((r, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <svg width="29" height="29" viewBox="0 0 24 24" fill={r.fill} stroke={r.stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }}><path d={r.d} /></svg>
            <span style={{ fontSize: 11.5, fontWeight: 600, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>{r.label}</span>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 13, right: 68, bottom: 18, color: "#fff" }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 5, textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>{card.handle}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.4, marginBottom: 8, textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>{card.caption}</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
          <span>{card.music}</span>
        </div>
      </div>
    </>
  );
}

function InstagramOverlay({ card }: { card: (typeof AD_CARDS)[number] }) {
  return (
    <>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "12px", display: "flex", alignItems: "center", gap: 10, background: "linear-gradient(180deg, rgba(0,0,0,0.5), transparent)" }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", border: "2px solid #fff", backgroundImage: `url(${card.img})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div style={{ flex: 1, color: "#fff" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>{card.handle}</div>
          <div style={{ fontSize: 10.5, opacity: 0.85, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>Patrocinado</div>
        </div>
        <span style={{ color: "#fff", fontSize: 18, letterSpacing: 1 }}>⋯</span>
      </div>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,0.65) 0%, transparent 40%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: 12, right: 12, bottom: 92, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.16)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", color: "#fff" }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Comprar ahora</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
      </div>
      <div style={{ position: "absolute", left: 12, right: 12, bottom: 52, display: "flex", alignItems: "center", gap: 16, color: "#fff" }}>
        {["M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 10-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z", "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z", "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"].map((d, i) => (
          <svg key={i} width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }}><path d={d} /></svg>
        ))}
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }}><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" /></svg>
      </div>
      <div style={{ position: "absolute", left: 12, right: 12, bottom: 16, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 3 }}>{card.likes} Me gusta</div>
        <div style={{ fontSize: 12, lineHeight: 1.35 }}><strong>{card.handle}</strong> {card.caption}</div>
      </div>
    </>
  );
}

function WhatsAppChat({ card }: { card: (typeof AD_CARDS)[number] }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "#0b141a" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px", background: "#1f2c34", flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e9edef" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        <div style={{ width: 34, height: 34, borderRadius: "50%", backgroundImage: `url(${card.img})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div style={{ flex: 1, color: "#e9edef" }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{card.handle}</div>
          <div style={{ fontSize: 10.5, color: "#8696a0" }}>cuenta de empresa · en línea</div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#8696a0"><path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z" /></svg>
      </div>
      <div style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 8, background: "#0b141a", overflow: "hidden" }}>
        <div style={{ alignSelf: "flex-start", maxWidth: "82%", background: "#1f2c34", borderRadius: "0 12px 12px 12px", overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
          <div style={{ width: "100%", aspectRatio: "1 / 1", backgroundImage: `url(${card.img})`, backgroundSize: "cover", backgroundPosition: "center" }} />
          <div style={{ padding: "8px 10px 4px", color: "#e9edef", fontSize: 12.5, lineHeight: 1.4 }}>Nuevo depa en preventa 🏙️ 2 recámaras con vista, entrega 2026. ¿Te agendo una visita?</div>
          <div style={{ padding: "0 10px 7px", color: "#8696a0", fontSize: 10, textAlign: "right" }}>9:41</div>
        </div>
        <div style={{ alignSelf: "flex-start", width: "82%", background: "#1f2c34", borderRadius: 10, padding: "10px", textAlign: "center", color: "#53bdeb", fontSize: 12.5, fontWeight: 600 }}>Ver disponibilidad</div>
        <div style={{ alignSelf: "flex-end", maxWidth: "72%", background: "#005c4b", borderRadius: "12px 0 12px 12px", padding: "8px 10px", color: "#e9edef", fontSize: 12.5, lineHeight: 1.4 }}>¡Sí, me interesa! 🙌<span style={{ color: "#8fb7ac", fontSize: 10, marginLeft: 6 }}>9:42 ✓✓</span></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#0b141a", flexShrink: 0 }}>
        <div style={{ flex: 1, height: 36, borderRadius: 20, background: "#1f2c34" }} />
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#00a884", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
        </div>
      </div>
    </div>
  );
}

function AdMockup({ card }: { card: (typeof AD_CARDS)[number] }) {
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "9 / 16", borderRadius: 26, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 30px 60px rgba(0,0,0,0.5)", background: card.platform === "whatsapp" ? "#0b141a" : "#000" }}>
      {card.platform === "whatsapp" ? (
        <WhatsAppChat card={card} />
      ) : (
        <>
          <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${card.img})`, backgroundSize: "cover", backgroundPosition: "center" }} />
          {card.platform === "tiktok" ? <TikTokOverlay card={card} /> : <InstagramOverlay card={card} />}
        </>
      )}
    </div>
  );
}

const AD_PLATFORM_LABEL: Record<string, string> = { tiktok: "TikTok", instagram: "Meta · Instagram", whatsapp: "WhatsApp" };

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
    const [mounted, setMounted] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [heroSlide, setHeroSlide] = useState(0);
  const [painStep, setPainStep] = useState(0);
  const painRef = useRef<HTMLDivElement>(null);
  const [pilarIdx, setPilarIdx] = useState(0);
  const pilarRef = useRef<HTMLDivElement>(null);
  const [howStep, setHowStep] = useState(0);
  const [adIdx, setAdIdx] = useState(0);
  const adRef = useRef<HTMLDivElement>(null);

  // Cada slide dura según su longitud (tiempo de lectura), no un intervalo fijo.
  useEffect(() => {
    const id = setTimeout(
      () => setHeroSlide((s) => (s + 1) % HERO_SLIDES.length),
      slideReadMs(HERO_SLIDES[heroSlide]),
    );
    return () => clearTimeout(id);
  }, [heroSlide]);

  // Stepper de "problema" fijado por scroll: leemos la posición por rAF (Lenis no dispara 'scroll' nativo).
  useEffect(() => {
    let raf = 0;
    const N = PAIN_STEPS.length;
    const loop = () => {
      const el = painRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const scrollable = rect.height - window.innerHeight;
        const progress = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;
        const step = Math.min(N - 1, Math.floor(progress * N));
        setPainStep((prev) => (prev !== step ? step : prev));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // "Cómo funciona": auto-avanza el paso activo; el clic manual reinicia el temporizador.
  useEffect(() => {
    const id = setTimeout(() => setHowStep((s) => (s + 1) % HOW_STEPS.length), 5200);
    return () => clearTimeout(id);
  }, [howStep]);

   
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
        "description": "El centro de mando para agencias de marketing: pauta de Meta, TikTok y Google Ads, inbox unificado de WhatsApp, Instagram y Messenger, y contenido con IA, para manejar todas tus cuentas desde un solo login.",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "MXN", "description": "Plan gratuito disponible, sin tarjeta." }
      },
      {
        "@type": "Organization",
        "name": "Zefirus",
        "url": "https://zefirus.xyz",
        "logo": "https://zefirus.xyz/zefirus-logo-1024.jpg",
        "contactPoint": { "@type": "ContactPoint", "email": "soporte@zefirus.xyz", "contactType": "customer service", "availableLanguage": ["Spanish"] },
        "sameAs": []
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          { "@type": "Question", "name": "¿Cuánto cuesta cuando se acaba el plan gratis?", "acceptedAnswer": { "@type": "Answer", "text": "Empiezas gratis y sin tarjeta, para siempre, con tus primeras cuentas. Cuando creces, los planes de paga tienen precios claros, sin letra chiquita." } },
          { "@type": "Question", "name": "¿Mis datos y los de mis clientes están seguros?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Nos conectamos a Meta, TikTok y Google con su login oficial (OAuth): nunca guardamos ni pedimos las contraseñas de tus clientes, y tú decides qué cuentas entran y cuáles salen cuando quieras. Tratamos la información conforme a la Ley Federal de Protección de Datos Personales (LFPDPPP). Sin reventa de datos." } },
          { "@type": "Question", "name": "¿Sirve si solo manejo 2 o 3 cuentas?", "acceptedAnswer": { "@type": "Answer", "text": "Sirve. Zefirus brilla cuando cargas con 20, pero si hoy llevas 2 o 3 es justo el momento de dejar de crecer sobre pestañas y Excel. Montas la operación ordenada desde chico y cuando lleguen más clientes ya está armado." } },
          { "@type": "Question", "name": "¿Reemplaza las herramientas que ya uso?", "acceptedAnswer": { "@type": "Answer", "text": "Esa es la idea: cambiar el Frankenstein de 6 apps peleadas entre sí por un solo login. Pauta, WhatsApp y contenido de todas tus cuentas viven en Zefirus, así que dejas de pagar tres suscripciones y de saltar de una a otra todo el día." } }
        ]
      }
    ]
  };

  return (
    <ReactLenis root options={{ lerp: 0.05, duration: 1.5, smoothWheel: true }}>
    <div className="landing-dark" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--background)", color: "var(--foreground)" }}>

      {/* Fondo tipo Framer: mesh de gradientes animado + grano de película */}
      <div className="zef-bg" aria-hidden />
      <div className="zef-grain" aria-hidden />

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

        /* Todos los H2 usan la serif del hero (Instrument Serif) en su peso natural (400) */
        .col-section-h2 {
          font-family: var(--font-instrument), Georgia, 'Times New Roman', serif;
          font-weight: 400 !important;
          letter-spacing: -0.015em;
        }

        /* ── La landing siempre en DARK (sin importar el tema del sistema): redeclara los
              tokens que el tema claro voltea, de vuelta a sus valores oscuros. Arregla el
              texto blanco sobre fondo blanco sin tocar el tema de la app. ── */
        .landing-dark {
          --background: #0b0d12; --bg-raised: #12151c; --surface: #12151c; --surface-hover: #1a1e27;
          --foreground: #e8ebf0; --text-secondary: #9aa4b2; --text-muted: #667082;
          --border: rgba(255,255,255,0.08); --border-strong: rgba(255,255,255,0.16);
          --border-neutral: rgba(148,163,184,0.10); --hairline: rgba(255,255,255,0.06);
          --c-brand: #3b82f6; --c-success: #34b77c; --c-warning: #e0a83c; --c-danger: #e5484d; --c-info: #8b8df2;
          --cyan: #5b9bff; --cyan-dim: rgba(59,130,246,0.12); --purple-dim: rgba(139,141,242,0.10);
          --emerald-dim: rgba(52,183,124,0.10); --amber-dim: rgba(224,168,60,0.10); --red-dim: rgba(229,72,77,0.12);
          --glass-border: rgba(255,255,255,0.08); --panel-bg: var(--surface); --topbar-bg: var(--surface);
          --overlay-dark: rgba(0,0,0,0.72); --row-hover: rgba(255,255,255,0.03);
        }

        /* ── Fondo animado tipo Framer: mesh de gradientes que deriva lento ── */
        .zef-bg {
          position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden;
          background:
            radial-gradient(60vw 50vh at 15% 6%, rgba(59,130,246,0.10), transparent 60%),
            radial-gradient(55vw 55vh at 85% 92%, rgba(120,110,255,0.07), transparent 60%),
            #070809;
        }
        .zef-bg::before, .zef-bg::after {
          content: ""; position: absolute; border-radius: 50%; filter: blur(100px); will-change: transform;
        }
        .zef-bg::before {
          width: 60vw; height: 60vw; left: -12vw; top: -18vh;
          background: radial-gradient(circle, rgba(59,130,246,0.20), transparent 62%);
          animation: zefFloat1 28s ease-in-out infinite alternate;
        }
        .zef-bg::after {
          width: 55vw; height: 55vw; right: -14vw; bottom: -20vh;
          background: radial-gradient(circle, rgba(120,110,255,0.16), transparent 62%);
          animation: zefFloat2 34s ease-in-out infinite alternate;
        }
        @keyframes zefFloat1 { from { transform: translate(0,0) scale(1); } to { transform: translate(16vw, 14vh) scale(1.18); } }
        @keyframes zefFloat2 { from { transform: translate(0,0) scale(1); } to { transform: translate(-14vw, -12vh) scale(1.22); } }

        /* ── Grano de película animado, DETRÁS del contenido (z-index 0, junto al mesh).
              Sin mix-blend-mode: si va encima con blend, genera cajas "fantasma" al
              componer sobre los elementos animados de framer-motion (bug de Chrome). ── */
        .zef-grain {
          position: fixed; inset: -60%; width: 220%; height: 220%; z-index: 0; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          opacity: 0.14;
          animation: zefGrain 0.5s steps(3) infinite;
        }
        @keyframes zefGrain {
          0% { transform: translate(0,0); } 20% { transform: translate(-6%,4%); }
          40% { transform: translate(5%,-6%); } 60% { transform: translate(-4%,7%); }
          80% { transform: translate(7%,-3%); } 100% { transform: translate(0,0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .zef-bg::before, .zef-bg::after, .zef-grain { animation: none; }
        }

        /* Carrusel de funciones: ocultar scrollbar (webkit) */
        .col-pilar-carousel::-webkit-scrollbar { display: none; }
        .col-pilar-carousel { -ms-overflow-style: none; }

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
        /* ── CTA iridiscente: botón oscuro con anillo tornasol giratorio ── */
        @property --zef-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes zef-spin { to { --zef-angle: 360deg; } }

        /* cuerpo: disco oscuro glossy abombado (luz arriba + sombra interna = relieve) */
        .col-pill-primary {
          position: relative;
          isolation: isolate;
          background: radial-gradient(135% 130% at 50% -12%, #262b36 0%, #14171e 46%, #080a0e 100%);
          color: #fff;
          border: none;
          box-shadow:
            inset 0 1.5px 0.5px rgba(255,255,255,0.12),   /* canto brillante superior */
            inset 0 -10px 20px rgba(0,0,0,0.64),          /* sombra interna inferior (domo) */
            inset 0 0 0 1px rgba(120,220,255,0.06),        /* borde tenue cian */
            0 14px 36px rgba(0,0,0,0.55),                  /* sombra dramática exterior */
            0 0 22px rgba(38,178,236,0.18);                /* halo cian constante (Tron) */
        }
        /* anillo: TRON — luz eléctrica azul/cian con un pulso blanco que recorre el borde */
        .col-pill-primary::before {
          content: "";
          position: absolute; inset: 0;
          border-radius: inherit;
          padding: 1.6px;
          background: conic-gradient(from var(--zef-angle),
            #1fb0ea 0deg,
            #35c4f4 70deg,
            #a6f2ff 108deg,
            #ffffff 130deg,          /* pulso blanco-cian */
            #a6f2ff 152deg,
            #35c4f4 194deg,
            #1fb0ea 260deg,
            #178fce 320deg,
            #1fb0ea 360deg);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
                  mask-composite: exclude;
          animation: zef-spin 5.5s linear infinite;
          pointer-events: none;
          z-index: 2;
        }
        /* glow Tron: halo cian alrededor + pulso brillante que recorre */
        .col-pill-primary::after {
          content: "";
          position: absolute; inset: -2px;
          border-radius: inherit;
          background: conic-gradient(from var(--zef-angle),
            rgba(40,180,235,0.5) 0deg,
            rgba(120,240,255,0.85) 108deg,
            rgba(255,255,255,0.95) 130deg,   /* pulso */
            rgba(120,240,255,0.85) 152deg,
            rgba(40,180,235,0.5) 250deg,
            rgba(40,180,235,0.5) 360deg);
          filter: blur(8px);
          opacity: 0.55;
          animation: zef-spin 5.5s linear infinite;
          pointer-events: none;
          z-index: -1;
        }
        .col-pill-primary:hover {
          transform: translateY(-2px);
          box-shadow:
            inset 0 1.5px 0.5px rgba(255,255,255,0.16),
            inset 0 -10px 20px rgba(0,0,0,0.64),
            inset 0 0 0 1px rgba(120,220,255,0.1),
            0 18px 46px rgba(0,0,0,0.6),
            0 0 30px rgba(38,178,236,0.32);
        }
        .col-pill-primary:hover::after { opacity: 0.8; filter: blur(10px); }
        @media (prefers-reduced-motion: reduce) {
          .col-pill-primary::before, .col-pill-primary::after { animation: none; }
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
          .col-pain-stage { padding: 0 20px !important; }
          .col-pain-navlabel { display: none !important; }
          .col-how-grid { grid-template-columns: 1fr !important; gap: 32px !important; max-width: 460px; margin-left: auto; margin-right: auto; }
          .col-outcome-row { grid-template-columns: 1fr !important; }
          .col-outcome-head { display: none !important; }
          .col-outcome-cell { border-right: none !important; }
          .col-outcome-row > .col-outcome-cell:first-child { border-bottom: 1px solid var(--border); }
          .col-pilar-grid { grid-template-columns: 1fr !important; }
          .col-porque-row { grid-template-columns: 1fr !important; }
          .col-porque-head { display: none !important; }
          .col-precios-grid { grid-template-columns: 1fr !important; max-width: 420px; margin-left: auto; margin-right: auto; }
          .col-trust-grid { grid-template-columns: 1fr !important; }
          .col-hero-h1 { font-size: 40px !important; }
          .col-hero-slides { min-height: 200px !important; }
          .col-hero-strip { flex-direction: column; align-items: center; gap: 12px; }
          .col-hero-strip > div { border-left: none !important; padding: 0 !important; text-align: center !important; }
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
            <Link href={SIGNUP_URL} className="col-pill col-pill-primary" aria-label="Empieza gratis en Zefirus" style={{
              padding: "9px 22px", borderRadius: 980,
              fontSize: 14, fontWeight: 600, whiteSpace: "nowrap",
            }}>
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
            El centro de mando para agencias de marketing
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
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 1.3, ease: "easeOut" }}
          className="col-hero-slides"
          style={{ position: "relative", width: "100%", maxWidth: 780, minHeight: 128, marginBottom: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <AnimatePresence mode="wait">
            <motion.p
              key={heroSlide}
              initial={{ opacity: 0, y: -26 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 26 }}
              transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
              style={{
                position: "absolute", left: 0, right: 0, margin: 0,
                fontSize: "clamp(19px, 2.7vw, 27px)",
                fontWeight: 400,
                color: "rgba(255,255,255,0.94)",
                lineHeight: 1.45,
                textAlign: "center",
              }}
            >
              {HERO_SLIDES[heroSlide]}
            </motion.p>
          </AnimatePresence>
        </motion.div>

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
          {/* Tira de confianza — 3 columnas (título + detalle) estilo feature strip */}
          {/* TODO: destino de venta asistida (correo/WhatsApp) por definir — hoy ancla a Precios/Enterprise */}
          <div className="col-hero-strip" style={{ display: "flex", alignItems: "stretch", justifyContent: "center", flexWrap: "wrap", marginTop: 6 }}>
            {[
              { t: "Gratis para empezar", s: "Sin tarjeta" },
              { t: "Listo en minutos", s: "Conectas y ves todo junto" },
              { t: "A la medida", s: "Demo para equipos grandes", href: "#precios" },
            ].map((c, i) => (
              <div key={i} style={{ textAlign: "center", padding: "0 22px", borderLeft: i === 0 ? "none" : "1px solid rgba(255,255,255,0.16)" }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", lineHeight: 1.4 }}>{c.t}</div>
                {c.href ? (
                  <a href={c.href} style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.4, textDecoration: "none" }}>{c.s}</a>
                ) : (
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>{c.s}</div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Statement del showcase — H2, funciona como segunda sección (deck §1) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 2.0, ease: "easeOut" }}
          style={{ position: "relative", zIndex: 3, textAlign: "center", maxWidth: 1000, margin: "72px auto 8px" }}
        >
          <h2 className="col-section-h2" style={{
            fontSize: "clamp(30px, 4.2vw, 50px)",
            lineHeight: 1.18,
            color: "rgba(255,255,255,0.96)",
            margin: 0,
          }}>
            Así se ve tu agencia completa en Zefirus: las campañas, los chats y el calendario de todas tus cuentas, en un tablero.
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: "18px 0 0" }}>
            Los datos mostrados son de ejemplo.
          </p>
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
          {/* Badge honesto: datos ilustrativos (regla dura de honestidad) */}
          <div style={{
            position: "absolute", top: 16, right: 16, zIndex: 20,
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "5px 12px", borderRadius: 980,
            background: "rgba(9,11,16,0.72)", border: "1px solid rgba(255,255,255,0.16)",
            backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
            fontSize: 11.5, fontWeight: 600, color: "#fff", letterSpacing: "0.02em",
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
              { icon: <Globe style={{ width: 18, height: 18 }} />, text: "Soporte que sí contesta" },
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
      <section id="problema" style={{ position: "relative", zIndex: 1 }}>
        {/* Intro — ocupa una pantalla completa para que el stepper (siguiente) no se asome
            mientras se lee; entra limpio, con su borde redondeado, solo al hacer scroll. */}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "96px 24px 56px", width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", boxSizing: "border-box" }}>
          <Reveal>
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 16 }}>
               <div style={{ padding: "6px 16px", borderRadius: 980, background: "rgba(8,9,12,0.45)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)", color: "#fff", fontSize: 13, fontWeight: 600 }}>
                El costo oculto de operar disperso
               </div>
            </div>
            <h2 className="col-section-h2 col-title" style={{ fontWeight: 700, fontSize: "clamp(34px, 4.8vw, 60px)", textAlign: "center", marginBottom: 20, lineHeight: 1.08 }}>
              No pierdes clientes por la estrategia. Los pierdes en la operación.
            </h2>
            <p style={{ fontSize: "clamp(16px, 2vw, 19px)", color: "var(--text-secondary)", textAlign: "center", maxWidth: 720, margin: "0 auto", lineHeight: 1.6 }}>
              Operar 20 cuentas entre plataformas, hojas de cálculo y chats sueltos no es un problema de esfuerzo: es donde se te fugan las horas, el margen y los clientes.
            </p>
          </Reveal>
        </div>

        {/* Stepper fijado por scroll. El multiplicador (vh por paso) controla qué tan "pesado"
            se siente el scroll aquí: más alto = hay que scrollear más para avanzar de paso. */}
        <div ref={painRef} style={{ position: "relative", height: `${PAIN_STEPS.length * 175}vh` }}>
          <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", background: "#060607", borderTopLeftRadius: 40, borderTopRightRadius: 40 }}>
            {/* Imágenes full-bleed con crossfade + ken-burns */}
            {PAIN_STEPS.map((s, i) => (
              <div key={i} aria-hidden style={{
                position: "absolute", inset: 0,
                backgroundImage: `url(${s.img})`, backgroundSize: "cover", backgroundPosition: "center",
                opacity: painStep === i ? 1 : 0,
                transform: painStep === i ? "scale(1.05)" : "scale(1)",
                transition: "opacity 0.9s ease, transform 7s ease-out",
              }} />
            ))}
            {/* Degradados para legibilidad (izquierda + base) */}
            <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(6,6,7,0.95) 0%, rgba(6,6,7,0.78) 34%, rgba(6,6,7,0.2) 62%, rgba(6,6,7,0) 82%)" }} />
            <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(6,6,7,0.55) 0%, transparent 26%)" }} />

            <div className="col-pain-stage" style={{ position: "relative", height: "100%", maxWidth: 1280, margin: "0 auto", padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 40 }}>
              {/* Texto (crossfade por paso) */}
              <div style={{ maxWidth: 560, position: "relative" }}>
                <AnimatePresence mode="wait">
                  <motion.div key={painStep}
                    initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
                  >
                    <h3 className="col-section-h2" style={{ fontSize: "clamp(30px, 4vw, 52px)", lineHeight: 1.08, color: "#fff", margin: "0 0 20px" }}>
                      {PAIN_STEPS[painStep].title}
                    </h3>
                    <p style={{ fontSize: "clamp(16px, 1.5vw, 19px)", lineHeight: 1.6, color: "rgba(255,255,255,0.82)", margin: "0 0 26px", maxWidth: 480 }}>
                      {PAIN_STEPS[painStep].desc}
                    </p>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 12,
                      padding: "11px 18px", borderRadius: 12,
                      background: "rgba(8,9,12,0.45)",
                      backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                    }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>Costo</span>
                      <span style={{ fontSize: 15, color: "rgba(255,255,255,0.92)", lineHeight: 1.4 }}>{PAIN_STEPS[painStep].cost}</span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Índice numerado */}
              <div className="col-pain-index" style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "flex-end", flexShrink: 0 }}>
                {PAIN_STEPS.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, opacity: painStep === i ? 1 : 0.45, transition: "opacity 0.4s" }}>
                    <span className="col-pain-navlabel" style={{ fontSize: 15, fontWeight: 500, color: painStep === i ? "#fff" : "rgba(255,255,255,0.72)" }}>{s.nav}</span>
                    <span style={{ fontSize: 13, fontFamily: "var(--font-jbmono), monospace", color: painStep === i ? ACCENT_COLOR : "rgba(255,255,255,0.4)" }}>{s.n}</span>
                    <span aria-hidden style={{ width: painStep === i ? 26 : 8, height: 2, borderRadius: 2, background: painStep === i ? ACCENT_COLOR : "rgba(255,255,255,0.25)", transition: "width 0.4s, background 0.4s" }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Progreso inferior */}
            <div aria-hidden style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.08)" }}>
              <div style={{ height: "100%", width: `${((painStep + 1) / PAIN_STEPS.length) * 100}%`, background: ACCENT_COLOR, transition: "width 0.5s ease" }} />
            </div>
          </div>
        </div>

      </section>

      {/* ═══════════════════════════════════════════════════════
         OUTCOME — Antes → Con Zefirus (deck §3)
         ═══════════════════════════════════════════════════════ */}
      <section id="outcome" style={{ position: "relative", zIndex: 1, padding: "120px 24px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <Reveal>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 16 }}>
            <div style={{ padding: "6px 16px", borderRadius: 980, background: "rgba(8,9,12,0.45)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)", color: "#fff", fontSize: 13, fontWeight: 600 }}>
              Así se ve tu agencia con Zefirus
            </div>
          </div>
          <h2 className="col-section-h2 col-title" style={{ fontWeight: 700, fontSize: "clamp(34px, 4.6vw, 58px)", textAlign: "center", marginBottom: 20, maxWidth: 940, marginLeft: "auto", marginRight: "auto" }}>
            De 40 pestañas y el Excel del lunes, a{" "}
            <span style={{ WebkitTextFillColor: ACCENT_COLOR, color: ACCENT_COLOR }}>una sola pantalla</span>{" "}
            que hasta tu cliente entiende.
          </h2>
          <p style={{ fontSize: "clamp(16px, 2vw, 19px)", color: "var(--text-secondary)", textAlign: "center", maxWidth: 760, margin: "0 auto 56px", lineHeight: 1.6 }}>
            Imagina el lunes: abres un login, ves las 20 cuentas juntas, sabes qué campaña rinde y cuál
            desperdicia presupuesto, respondes los WhatsApp del fin de semana y mandas el reporte temprano.
            Sin alternar entre logins, sin capturar números a mano, sin sostener cada cuenta con hojas de cálculo y memoria.
          </p>
        </Reveal>

        <Reveal>
          <div className="col-outcome-panel" style={{
            maxWidth: 1000, margin: "0 auto", borderRadius: 20, overflow: "hidden",
            border: "1px solid var(--border)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012))",
            boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          }}>
            {/* Encabezado de la tabla */}
            <div className="col-outcome-row col-outcome-head" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid var(--border)" }}>
              <div className="col-outcome-cell" style={{ padding: "15px 26px", borderRight: "1px solid var(--border)" }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)" }}>Antes</span>
              </div>
              <div className="col-outcome-cell" style={{ padding: "15px 26px", background: "rgba(59,130,246,0.05)" }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: ACCENT_COLOR }}>Con Zefirus</span>
              </div>
            </div>
            {[
              { antes: "6 apps peleadas entre sí y 40 pestañas abiertas para no perder ninguna cuenta.", con: "Un solo login para ver las 20 cuentas juntas. Se acabaron las 40 pestañas." },
              { antes: "El Excel del lunes: números de Meta, TikTok y Google copiados a mano, cliente por cliente.", con: "La pauta de todos tus clientes junta y actualizada sola. Adiós al Excel del lunes." },
              { antes: "WhatsApp del cliente contestado tarde, desde tres celulares distintos.", con: "Todos los WhatsApp, Instagram y Messenger en una bandeja, con bots que atienden 24/7." },
              { antes: "Domingo en la noche armando la parrilla de contenido de cero.", con: "Parrillas, copies y briefs con IA que habla como se habla aquí. Recuperas tu domingo." },
            ].map((row, i, arr) => (
              <div key={i} className="col-outcome-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div className="col-outcome-cell" style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "22px 26px", borderRight: "1px solid var(--border)" }}>
                  <X style={{ width: 16, height: 16, color: "var(--text-muted)", flexShrink: 0, marginTop: 3, opacity: 0.6 }} />
                  <p style={{ fontSize: 14.5, color: "var(--text-muted)", lineHeight: 1.55, margin: 0 }}>{row.antes}</p>
                </div>
                <div className="col-outcome-cell" style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "22px 26px", background: "rgba(59,130,246,0.05)" }}>
                  <CheckCircle2 style={{ width: 17, height: 17, color: ACCENT_COLOR, flexShrink: 0, marginTop: 2.5 }} />
                  <p style={{ fontSize: 14.5, color: "var(--foreground)", fontWeight: 500, lineHeight: 1.55, margin: 0 }}>{row.con}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

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
               <div style={{ padding: "6px 16px", borderRadius: 980, background: "rgba(8,9,12,0.45)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)", color: "#fff", fontSize: 13, fontWeight: 600 }}>
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

          {/* Carrusel de funciones (estilo ejemplo 2): mockup de UI real + texto + paginación */}
          <div style={{ marginTop: 56 }}>
            <div
              ref={pilarRef}
              className="col-pilar-carousel"
              onScroll={(e) => {
                const el = e.currentTarget;
                const card = el.querySelector(".col-pilar-card") as HTMLElement | null;
                const step = card ? card.offsetWidth + 24 : 424;
                setPilarIdx(Math.max(0, Math.min(PILAR_CARDS.length - 1, Math.round(el.scrollLeft / step))));
              }}
              style={{ display: "flex", gap: 24, overflowX: "auto", scrollSnapType: "x mandatory", padding: "6px 2px 4px", scrollbarWidth: "none" }}
            >
              {PILAR_CARDS.map((c, i) => (
                <div key={i} className="col-pilar-card" style={{ flex: "0 0 auto", width: 400, maxWidth: "82vw", scrollSnapAlign: "center" }}>
                  <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", border: "1px solid var(--border)", aspectRatio: "16 / 11", boxShadow: "0 24px 50px rgba(0,0,0,0.4)" }}>
                    <PilarMockup type={c.type} />
                  </div>
                  <div style={{ padding: "20px 4px 0" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: ACCENT_COLOR, marginBottom: 10 }}>{c.pilar} · {c.name}</div>
                    <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff", lineHeight: 1.3, letterSpacing: "-0.01em", margin: "0 0 8px" }}>{c.benefit}</h3>
                    <p style={{ fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginación + flechas */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, marginTop: 24, padding: "0 2px" }}>
              <div style={{ display: "flex", gap: 6, flex: 1, maxWidth: 340 }}>
                {PILAR_CARDS.map((_, i) => (
                  <span key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i === pilarIdx ? ACCENT_COLOR : "rgba(255,255,255,0.14)", transition: "background 0.3s" }} />
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-jbmono), monospace", minWidth: 34, textAlign: "right" }}>{pilarIdx + 1}/{PILAR_CARDS.length}</span>
                {([["prev", "M15 18l-6-6 6-6"], ["next", "M9 6l6 6-6 6"]] as const).map(([dir, d]) => (
                  <button
                    key={dir}
                    aria-label={dir === "prev" ? "Anterior" : "Siguiente"}
                    onClick={() => {
                      const el = pilarRef.current; if (!el) return;
                      const card = el.querySelector(".col-pilar-card") as HTMLElement | null;
                      const step = card ? card.offsetWidth + 24 : 424;
                      el.scrollBy({ left: dir === "next" ? step : -step, behavior: "smooth" });
                    }}
                    style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)", color: "var(--foreground)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d={d} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cierre del bloque Solución (deck §4) */}
          <Reveal delay={0.1}>
            <div style={{ marginTop: 56, padding: "30px 40px", borderRadius: 20, background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <p style={{ fontSize: "clamp(16px, 2vw, 20px)", color: "var(--foreground)", lineHeight: 1.55, margin: "0 auto", fontWeight: 500, textAlign: "center", maxWidth: 900 }}>
                Todo esto vive en un solo login, con soporte humano que sí contesta. Es la pantalla
                desde donde manejas tu agencia completa.
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
             <div style={{ padding: "6px 16px", borderRadius: 980, background: "rgba(8,9,12,0.45)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)", color: "#fff", fontSize: 13, fontWeight: 600 }}>
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

        <div className="col-how-grid" style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 56, alignItems: "center", maxWidth: 1080, margin: "0 auto" }}>
          {/* Imagen del paso activo (crossfade) + paginación */}
          <Reveal>
            <div>
              <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", aspectRatio: "4 / 5", border: "1px solid var(--border)", boxShadow: "0 30px 70px rgba(0,0,0,0.5)" }}>
                {HOW_STEPS.map((s, i) => (
                  <div key={i} aria-hidden style={{
                    position: "absolute", inset: 0,
                    backgroundImage: `url(${s.img})`, backgroundSize: "cover", backgroundPosition: "center",
                    opacity: howStep === i ? 1 : 0,
                    transform: howStep === i ? "scale(1.04)" : "scale(1)",
                    transition: "opacity 0.7s ease, transform 5.5s ease-out",
                  }} />
                ))}
                <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(6,6,8,0.55), transparent 42%)" }} />
                <div style={{ position: "absolute", left: 22, bottom: 18, fontSize: 12.5, fontWeight: 700, letterSpacing: "0.16em", color: "#fff", textTransform: "uppercase" }}>
                  Paso {HOW_STEPS[howStep].step} <span style={{ opacity: 0.5 }}>/ 03</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
                {HOW_STEPS.map((_, i) => (
                  <button key={i} onClick={() => setHowStep(i)} aria-label={`Ir al paso ${i + 1}`} style={{ flex: 1, height: 3, borderRadius: 2, border: "none", padding: 0, cursor: "pointer", background: i === howStep ? ACCENT_COLOR : "rgba(255,255,255,0.14)", transition: "background 0.3s" }} />
                ))}
              </div>
            </div>
          </Reveal>

          {/* Pasos como acordeón sincronizado con la imagen */}
          <Reveal delay={0.1}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {HOW_STEPS.map((s, i) => {
                const active = howStep === i;
                return (
                  <button
                    key={i}
                    onClick={() => setHowStep(i)}
                    style={{
                      display: "block", width: "100%", textAlign: "left", font: "inherit", color: "inherit",
                      background: active ? "rgba(255,255,255,0.03)" : "transparent",
                      border: "1px solid", borderColor: active ? "var(--border)" : "transparent",
                      borderRadius: 16, padding: "18px 22px", cursor: "pointer",
                      transition: "background 0.3s, border-color 0.3s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{ width: 34, height: 34, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13.5, fontWeight: 700, fontFamily: "var(--font-jbmono), monospace", color: active ? "#fff" : "var(--text-muted)", background: active ? ACCENT_COLOR : "rgba(255,255,255,0.04)", border: active ? "none" : "1px solid var(--border)", flexShrink: 0, transition: "all 0.3s" }}>
                        {s.step}
                      </span>
                      <h3 style={{ fontSize: 20, fontWeight: 600, color: active ? "#fff" : "var(--text-secondary)", margin: 0, letterSpacing: "-0.01em", transition: "color 0.3s" }}>
                        {s.title}
                      </h3>
                    </div>
                    <AnimatePresence initial={false}>
                      {active && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }} style={{ overflow: "hidden" }}>
                          <p style={{ fontSize: 15.5, color: "var(--text-secondary)", lineHeight: 1.6, margin: "12px 0 0", paddingLeft: 48 }}>
                            {s.desc}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                );
              })}
            </div>
          </Reveal>
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
         POR QUÉ ZEFIRUS — comparativa: tu stack actual vs. Zefirus (deck §6)
         ═══════════════════════════════════════════════════════ */}
      <section id="por-que" style={{ position: "relative", zIndex: 1, padding: "120px 24px", maxWidth: 1200, margin: "0 auto", width: "100%", scrollMarginTop: 90 }}>
        <Reveal>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 16 }}>
            <div style={{ padding: "6px 16px", borderRadius: 980, background: "rgba(8,9,12,0.45)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)", color: "#fff", fontSize: 13, fontWeight: 600 }}>
              Tu stack de hoy vs. Zefirus
            </div>
          </div>
          <h2 className="col-section-h2 col-title" style={{ fontWeight: 700, fontSize: "clamp(32px, 4.4vw, 54px)", textAlign: "center", marginBottom: 18, maxWidth: 940, marginLeft: "auto", marginRight: "auto" }}>
            El problema no es cada app. Es todo lo que se cae entre una y otra.
          </h2>
          <p style={{ fontSize: "clamp(16px, 2vw, 20px)", color: "var(--text-secondary)", textAlign: "center", maxWidth: 800, margin: "0 auto 24px", lineHeight: 1.5, fontWeight: 500 }}>
            Seis herramientas que no se hablan entre sí. Copias datos de una a otra a mano, saltas entre
            logins y sostienes la operación con pura memoria.
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
            { label: "Costo", left: "Seis herramientas que pagas por separado, cada una con su propia suscripción, que se acumulan mes con mes.", right: "Un solo plan para toda tu operación. Pagas una vez, no seis." },
            { label: "Plataformas", left: "40 pestañas abiertas: Meta por aquí, TikTok por allá, Google Ads en otra, y un login distinto por cada cliente.", right: "Meta, TikTok y Google Ads de las 20 cuentas juntas en una pantalla. Un login, todas tus cuentas." },
            { label: "Inbox", left: "Mensajes regados: WhatsApp en un celular, Instagram en otro, y los leads que se enfrían mientras alguien los ve.", right: "WhatsApp, Instagram y Messenger de todos tus clientes en una sola bandeja, con bots que atienden, califican y asignan 24/7." },
            { label: "Reportes y ROI", left: "El Excel del lunes: capturar números a mano, cliente por cliente, para armar el reporte del viernes en vez de vender.", right: "Ves qué campaña rinde y cuál desperdicia presupuesto por cliente, en vivo y en el mismo lugar. El reporte ya está hecho." },
            { label: "WhatsApp", star: true, left: "Un plugin de segunda, improvisado, cuando es el canal por el que de verdad se vende.", right: "WhatsApp como canal de primera, integrado desde el día uno. Porque aquí se cierra por WhatsApp, y eso lo sabemos." },
            { label: "Soporte", left: "Cuando algo truena a las 8 de la noche, un chatbot genérico y un ticket que contestan en tres días.", right: "Personas reales que contestan rápido y entienden tu operación. Soporte que sí contesta." },
            { label: "Hecho para", left: "Software pensado para una sola marca, no para una agencia que malabarea 20 cuentas a la vez.", right: "Hecho para agencias que cargan con 10, 20 o 50 cuentas al mismo tiempo." },
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
            Dejas de saltar entre pestañas y empiezas a manejar tu agencia completa desde un solo lugar.
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
        </Reveal>
      </section>

      {/* ═══════════════════════════════════════════════════════
         PRECIOS + GARANTÍAS + SEGURIDAD (deck §8)
         ⚠️ TODO(fundador): precios reales. Placeholders $[X] visibles abajo.
         ═══════════════════════════════════════════════════════ */}
      <section id="precios" style={{ position: "relative", zIndex: 1, padding: "120px 24px", maxWidth: 1200, margin: "0 auto", width: "100%", scrollMarginTop: 90 }}>
        <Reveal>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 16 }}>
            <div style={{ padding: "6px 16px", borderRadius: 980, background: "rgba(8,9,12,0.45)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)", color: "#fff", fontSize: 13, fontWeight: 600 }}>
              Precios claros. Sin letras chiquitas.
            </div>
          </div>
          <h2 className="col-section-h2 col-title" style={{ fontWeight: 700, fontSize: "clamp(32px, 4.4vw, 54px)", textAlign: "center", marginBottom: 20, maxWidth: 900, marginLeft: "auto", marginRight: "auto" }}>
            Un precio que sí entiendes, sin letra chiquita.
          </h2>
          <p style={{ fontSize: "clamp(16px, 2vw, 19px)", color: "var(--text-secondary)", textAlign: "center", maxWidth: 720, margin: "0 auto 24px", lineHeight: 1.6 }}>
            Un solo precio claro, sin cotizaciones ni sorpresas.
            Empiezas gratis, sin tarjeta, y creces cuando tu operación lo pida.
          </p>
          {/* Badge provisional — QUITAR antes de publicar cuando existan los montos */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 44 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 980, background: "rgba(224,168,60,0.12)", border: "1px solid rgba(224,168,60,0.3)", color: "var(--amber)", fontSize: 12.5, fontWeight: 600 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--amber)" }} />
              Provisional — montos por confirmar
            </span>
          </div>
        </Reveal>

        <div className="col-precios-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, alignItems: "stretch" }}>
          {/* ── Gratis ── */}
          <Reveal delay={0}>
            <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "32px 28px", borderRadius: 20, background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>Gratis <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>· Para probar sin compromiso</span></p>
              <div style={{ margin: "16px 0 10px" }}>
                <span style={{ fontSize: 40, fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.03em" }}>$0</span>
                <span style={{ fontSize: 15, color: "var(--text-muted)", marginLeft: 8 }}>para siempre. Sin tarjeta.</span>
              </div>
              <p style={{ fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: 20 }}>
                {/* TODO(fundador): [X] = cuentas del plan Gratis */}
                Conecta hasta <strong style={{ color: "var(--foreground)" }}>[X]</strong> cuentas y mira toda tu pauta, tu WhatsApp y tu contenido en una sola pantalla. Todo lo básico para dejar de alternar entre logins, sin pagar un peso.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                {["Hasta [X] cuentas de cliente conectadas", "Pauta de Meta, TikTok y Google en una vista", "Bandeja única de WhatsApp, Instagram y Messenger", "Contenido con IA que sí habla como se habla aquí"].map((f, i) => (
                  <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: "var(--text-secondary)" }}>
                    <CheckCircle2 style={{ width: 17, height: 17, color: ACCENT_COLOR, flexShrink: 0, marginTop: 1 }} /> {f}
                  </li>
                ))}
              </ul>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", textAlign: "center", marginBottom: 12 }}>Sin tarjeta. Listo en minutos.</p>
              <Link href={SIGNUP_URL} className="col-pill col-pill-secondary" style={{ height: 50, borderRadius: 12, width: "100%", textAlign: "center" }}>Empieza gratis</Link>
            </div>
          </Reveal>

          {/* ── Agencia (Recomendado) ── */}
          <Reveal delay={0.08}>
            <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%", padding: "32px 28px", borderRadius: 20, background: "var(--cyan-dim)", border: "1.5px solid rgba(59,130,246,0.45)", boxShadow: "0 20px 60px rgba(59,130,246,0.12)" }}>
              <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 980, background: `linear-gradient(180deg, ${GRADIENT_START}, ${ACCENT_COLOR})`, color: "#fff", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                <Star style={{ width: 13, height: 13, fill: "#fff" }} /> Recomendado
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", marginTop: 4 }}>Agencia</p>
              <div style={{ margin: "16px 0 10px" }}>
                {/* TODO(fundador): $[X] MXN = precio real del plan Agencia (mostrar "desde") */}
                <span style={{ fontSize: 15, color: "var(--text-secondary)" }}>Desde </span>
                <span style={{ fontSize: 40, fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.03em" }}>$[X]</span>
                <span style={{ fontSize: 15, color: "var(--text-muted)", marginLeft: 6 }}>/ mes</span>
              </div>
              <p style={{ fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: 20 }}>
                Para la agencia que carga 10, 20 o 50 cuentas y ya se cansó de sostenerlas con pestañas y el Excel del lunes. Toda tu operación de cuentas en un solo login, sin límites que te frenen.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                {["Cuentas de cliente ilimitadas", "Chatbots que atienden, califican y asignan leads 24/7", "Calendario para programar y publicar en las redes de todos tus clientes", "Reportes por cliente sin vaciar números a mano", "Soporte humano de gente que entiende tu operación"].map((f, i) => (
                  <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: "var(--foreground)" }}>
                    <CheckCircle2 style={{ width: 17, height: 17, color: ACCENT_COLOR, flexShrink: 0, marginTop: 1 }} /> {f}
                  </li>
                ))}
              </ul>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", textAlign: "center", marginBottom: 12 }}>Sin permanencia ni contrato. Cambias de plan cuando quieras.</p>
              <Link href={SIGNUP_URL} className="col-pill col-pill-primary" style={{ height: 50, borderRadius: 12, width: "100%", textAlign: "center" }}>Empieza gratis</Link>
            </div>
          </Reveal>

          {/* ── Enterprise ── */}
          <Reveal delay={0.16}>
            <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "32px 28px", borderRadius: 20, background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>Enterprise <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>· Equipos grandes y a la medida</span></p>
              <div style={{ margin: "16px 0 10px" }}>
                <span style={{ fontSize: 40, fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.03em" }}>Hablemos.</span>
              </div>
              <p style={{ fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: 20 }}>
                ¿Varios equipos operando en paralelo, con control de permisos, roles, migración asistida y facturación a la medida? Te armamos el plan contigo, con una persona real que te atiende directo.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                {["Onboarding y migración acompañados", "Permisos y roles por equipo", "Facturación a la medida"].map((f, i) => (
                  <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: "var(--text-secondary)" }}>
                    <CheckCircle2 style={{ width: 17, height: 17, color: ACCENT_COLOR, flexShrink: 0, marginTop: 1 }} /> {f}
                  </li>
                ))}
              </ul>
              {/* TODO(fundador): destino real de venta asistida (correo/WhatsApp) */}
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", textAlign: "center", marginBottom: 12 }}>Te respondemos el mismo día hábil.</p>
              <a href="#precios" className="col-pill col-pill-secondary" style={{ height: 50, borderRadius: 12, width: "100%", textAlign: "center", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>Agendar una llamada</a>
            </div>
          </Reveal>
        </div>

        {/* Garantías */}
        <Reveal delay={0.1}>
          <div style={{ marginTop: 72 }}>
            <h3 style={{ fontSize: "clamp(22px, 2.6vw, 30px)", fontWeight: 700, color: "var(--foreground)", textAlign: "center", marginBottom: 32 }}>Pruébalo sin riesgo. En serio.</h3>
            <div className="col-trust-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, maxWidth: 980, margin: "0 auto" }}>
              {[
                { t: "Sin tarjeta para empezar.", d: "Conectas tus cuentas y ves todo junto antes de pagar un solo peso." },
                { t: "Te ayudamos a migrar.", d: "Traes tus cuentas y tus clientes; nosotros te echamos la mano para dejarlo todo conectado, sin que pierdas un fin de semana en ello." },
                { t: "Cancela cuando quieras.", d: "Sin contratos amarrados ni penalizaciones escondidas en la letra chiquita." },
              ].map((g, i) => (
                <div key={i} style={{ padding: "24px", borderRadius: 16, background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: 15.5, fontWeight: 700, color: "var(--foreground)", marginBottom: 8 }}>{g.t}</p>
                  <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>{g.d}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Seguridad de datos */}
        <Reveal delay={0.1}>
          <div style={{ marginTop: 56, padding: "40px 40px", borderRadius: 24, background: "var(--surface)", border: "1px solid var(--border)", maxWidth: 980, marginLeft: "auto", marginRight: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8 }}>
              <Shield style={{ width: 24, height: 24, color: ACCENT_COLOR }} />
              <h3 style={{ fontSize: "clamp(20px, 2.4vw, 26px)", fontWeight: 700, color: "var(--foreground)", margin: 0, textAlign: "center" }}>Tus datos y los de tus clientes: bajo llave.</h3>
            </div>
            <p style={{ fontSize: 15, color: "var(--text-secondary)", textAlign: "center", maxWidth: 600, margin: "0 auto 28px", lineHeight: 1.5 }}>
              Manejas la información de decenas de clientes. Lo tratamos con el respeto que eso merece.
            </p>
            <div className="col-trust-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {[
                { t: "Conexión oficial vía OAuth de Meta y Google.", d: "Nunca vemos ni guardamos tus contraseñas.", img: "/icons/seg-oauth.png" },
                { t: "Cumplimos con la LFPDPPP.", d: "Tratamos tus datos conforme a la ley mexicana.", img: "/icons/seg-ley.png" },
                { t: "Tus datos son tuyos.", d: "Los exportas o los borras cuando quieras, sin pedir permiso ni abrir un ticket que nadie contesta.", img: "/icons/seg-datos.png" },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 6 }}>
                                    <img src={s.img} alt="" width={56} height={56} style={{ width: 56, height: 56, objectFit: "contain", marginBottom: 12 }} />
                  <p style={{ fontSize: 14.5, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{s.t}</p>
                  <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>{s.d}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", marginTop: 24 }}>
              <a href="/aviso-de-privacidad" style={{ color: ACCENT_COLOR, textDecoration: "underline", textUnderlineOffset: 3 }}>Aviso de privacidad</a> y detalle de seguridad disponibles antes de que conectes tu primera cuenta.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 48 }}>
            <Link href={SIGNUP_URL} className="col-pill col-pill-primary" aria-label="Empieza gratis en Zefirus" style={{ height: 56, padding: "0 36px", borderRadius: 14 }}>Empieza gratis, sin tarjeta</Link>
          </div>
        </Reveal>
      </section>

      {/* ═══════════════════════════════════════════════════════
         FAQ — acordeón (deck §9)
         ═══════════════════════════════════════════════════════ */}
      <section id="faq" style={{ position: "relative", zIndex: 1, padding: "120px 24px", maxWidth: 820, margin: "0 auto", width: "100%", scrollMarginTop: 90 }}>
        <Reveal>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 16 }}>
            <div style={{ padding: "6px 16px", borderRadius: 980, background: "rgba(8,9,12,0.45)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)", color: "#fff", fontSize: 13, fontWeight: 600 }}>
              Preguntas que seguro te estás haciendo
            </div>
          </div>
          <h2 className="col-section-h2 col-title" style={{ fontWeight: 700, fontSize: "clamp(30px, 4vw, 50px)", textAlign: "center", marginBottom: 56, maxWidth: 760, marginLeft: "auto", marginRight: "auto" }}>
            Lo que quieres saber antes de conectar tu primera cuenta
          </h2>
        </Reveal>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            {
              q: "¿Cuánto cuesta cuando se acaba el plan gratis?",
              /* TODO(fundador): $[XXX] MXN = precio provisional real del plan de paga */
              a: "Empiezas gratis y sin tarjeta, para siempre, con tus primeras cuentas. Cuando creces, los planes de paga arrancan en $[XXX] al mes, con precios claros y sin letra chiquita.",
            },
            {
              q: "¿Mis datos y los de mis clientes están seguros?",
              a: "Sí, y va en serio. Nos conectamos a Meta, TikTok y Google con su login oficial (OAuth): nunca guardamos ni pedimos las contraseñas de tus clientes, y tú decides qué cuentas entran y cuáles salen cuando quieras. Tratamos la información conforme a la Ley Federal de Protección de Datos Personales (LFPDPPP). Sin reventa de datos, sin sorpresas.",
            },
            {
              q: "¿Sirve si solo manejo 2 o 3 cuentas?",
              a: "Sirve. Zefirus brilla cuando cargas con 20, pero si hoy llevas 2 o 3 es justo el momento de dejar de crecer sobre pestañas y Excel. Montas la operación ordenada desde chico y cuando lleguen los clientes 10, 15, 20, no tienes que reinventar nada: ya está armado.",
            },
            {
              q: "¿Reemplaza las herramientas que ya uso?",
              a: "Esa es la idea: cambiar el Frankenstein de 6 apps peleadas entre sí por un solo login. Pauta, WhatsApp y contenido de todas tus cuentas viven en Zefirus, así que dejas de pagar tres suscripciones y de saltar de una a otra todo el día. Ahí vive tu operación completa.",
            },
          ].map((faq, i) => {
            const open = openFaq === i;
            return (
              <Reveal key={i} delay={i * 0.05}>
                <div style={{ borderRadius: 16, background: "var(--surface)", border: `1px solid ${open ? "rgba(59,130,246,0.3)" : "var(--border)"}`, overflow: "hidden", transition: "border-color 0.2s" }}>
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "22px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left", font: "inherit", color: "var(--foreground)" }}
                  >
                    <span style={{ fontSize: "clamp(16px, 2vw, 18px)", fontWeight: 600 }}>{faq.q}</span>
                    <ChevronDown style={{ width: 20, height: 20, color: ACCENT_COLOR, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.25s" }} />
                  </button>
                  {open && (
                    <div style={{ padding: "0 24px 24px" }}>
                      <p style={{ fontSize: 15.5, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0, maxWidth: 680 }}>{faq.a}</p>
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
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
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: ACCENT_COLOR, marginBottom: 20 }}>
            Empieza gratis, hoy
          </p>
          <h2 className="col-section-h2 col-title" style={{
            fontWeight: 700, fontSize: "clamp(36px, 5.4vw, 68px)",
            lineHeight: 1.08, marginBottom: 24, maxWidth: 900, marginLeft: "auto", marginRight: "auto",
          }}>
            Tu agencia completa, en una sola pantalla
          </h2>
          <p style={{ fontSize: "clamp(16px, 2vw, 19px)", color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 680, margin: "0 auto 40px" }}>
            Conecta Meta, TikTok, Google Ads y WhatsApp de todos tus clientes y opéralos desde una sola
            pantalla: pauta, conversaciones y contenido, juntos. Empiezas gratis y sin tarjeta; conectas
            tus cuentas y las ves todas juntas en minutos.
          </p>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <Link href={SIGNUP_URL} className="col-pill col-pill-primary" aria-label="Empieza gratis en Zefirus" style={{ padding: "18px 40px", fontSize: 18 }}>
              Empieza gratis — sin tarjeta
            </Link>
            <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Sin tarjeta. Sin contrato. Sales cuando quieras.</p>
            <a href="#precios" style={{ fontSize: 14.5, color: "var(--text-secondary)", textDecoration: "none", marginTop: 6 }}>
              ¿Equipo grande o necesidades a la medida? <span style={{ color: ACCENT_COLOR, textDecoration: "underline", textUnderlineOffset: 3 }}>Agenda una demo</span>
            </a>
          </div>
        </Reveal>
      </section>

      {/* ═══════════════════════════════════════════════════════
         SHOWCASE DE ADS — carrusel de pantallas (Meta / TikTok / WhatsApp)
         ═══════════════════════════════════════════════════════ */}
      <section style={{ position: "relative", zIndex: 1, padding: "40px 0 130px", overflow: "hidden" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
          <Reveal>
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 16 }}>
              <div style={{ padding: "6px 16px", borderRadius: 980, background: "rgba(8,9,12,0.45)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)", color: "#fff", fontSize: 13, fontWeight: 600 }}>
                Contenido que detiene el scroll
              </div>
            </div>
            <h2 className="col-section-h2 col-title" style={{ fontWeight: 700, fontSize: "clamp(32px, 4.4vw, 54px)", textAlign: "center", marginBottom: 18, maxWidth: 880, marginLeft: "auto", marginRight: "auto" }}>
              De Meta y TikTok a WhatsApp, todo se crea y publica desde un lugar.
            </h2>
            <p style={{ fontSize: "clamp(16px, 2vw, 19px)", color: "var(--text-secondary)", textAlign: "center", maxWidth: 700, margin: "0 auto", lineHeight: 1.6 }}>
              Ads que paran el pulgar, respuestas por WhatsApp y contenido programado — el de todos tus clientes, en una sola pantalla.
            </p>
          </Reveal>
        </div>

        <div
          ref={adRef}
          className="col-pilar-carousel"
          onScroll={(e) => {
            const el = e.currentTarget;
            const card = el.querySelector(".col-ad-card") as HTMLElement | null;
            const step = card ? card.offsetWidth + 20 : 308;
            setAdIdx(Math.max(0, Math.min(AD_CARDS.length - 1, Math.round(el.scrollLeft / step))));
          }}
          style={{ display: "flex", gap: 20, overflowX: "auto", scrollSnapType: "x mandatory", padding: "40px 24px 8px", scrollbarWidth: "none" }}
        >
          {AD_CARDS.map((c, i) => (
            <div key={i} className="col-ad-card" style={{ flex: "0 0 auto", width: 288, maxWidth: "76vw", scrollSnapAlign: "center" }}>
              <AdMockup card={c} />
              <div style={{ marginTop: 14, textAlign: "center", fontSize: 12.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>{AD_PLATFORM_LABEL[c.platform]}</div>
            </div>
          ))}
        </div>

        <div style={{ maxWidth: 1100, margin: "18px auto 0", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          <div style={{ display: "flex", gap: 6, flex: 1, maxWidth: 300 }}>
            {AD_CARDS.map((_, i) => (
              <span key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i === adIdx ? ACCENT_COLOR : "rgba(255,255,255,0.14)", transition: "background 0.3s" }} />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-jbmono), monospace", minWidth: 34, textAlign: "right" }}>{adIdx + 1}/{AD_CARDS.length}</span>
            {([["prev", "M15 18l-6-6 6-6"], ["next", "M9 6l6 6-6 6"]] as const).map(([dir, d]) => (
              <button key={dir} aria-label={dir === "prev" ? "Anterior" : "Siguiente"} onClick={() => { const el = adRef.current; if (!el) return; const card = el.querySelector(".col-ad-card") as HTMLElement | null; const step = card ? card.offsetWidth + 20 : 308; el.scrollBy({ left: dir === "next" ? step : -step, behavior: "smooth" }); }} style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)", color: "var(--foreground)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d={d} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            ))}
          </div>
        </div>

        <p style={{ maxWidth: 1100, margin: "16px auto 0", padding: "0 24px", fontSize: 12.5, color: "var(--text-muted)", textAlign: "center" }}>Ejemplos ilustrativos de contenido. Las cuentas y métricas son de muestra.</p>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ position: "relative", zIndex: 1, border: "1px solid var(--hairline)", background: "var(--surface)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 24px 40px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 48, flexWrap: "wrap" }}>
            <div style={{ maxWidth: 320 }}>
              <ZefirusLogo size="sm" animated={false} />
              <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 16, lineHeight: 1.6 }}>
                El centro de mando para agencias de marketing, con soporte que sí contesta.
              </p>
              <Link href={SIGNUP_URL} className="col-pill col-pill-primary" style={{ marginTop: 20, height: 46, padding: "0 22px", borderRadius: 12, display: "inline-flex", alignItems: "center", fontSize: 14 }}>
                Empieza gratis, sin tarjeta
              </Link>
            </div>
            <div className="col-footer-cols" style={{ display: "flex", gap: 56, flexWrap: "wrap" }}>
              <FooterCol title="Producto" links={[
                { label: "Publicidad", href: "#pilar-publicidad" },
                { label: "Conversaciones", href: "#pilar-conversaciones" },
                { label: "Contenido", href: "#pilar-contenido" },
                { label: "Precios", href: "#precios" },
                { label: "Por qué Zefirus", href: "#por-que" },
              ]} />
              <FooterCol title="Empresa" links={[
                { label: "Preguntas", href: "#faq" },
                { label: "Entrar", href: "/login" },
              ]} />
              <FooterCol title="Legal" links={[
                { label: "Aviso de privacidad (LFPDPPP)", href: "/aviso-de-privacidad" },
                { label: "Términos", href: "/condiciones-del-servicio" },
                { label: "Seguridad de datos", href: "#precios" },
              ]} />
            </div>
          </div>

          {/* Venta asistida — contacto */}
          {/* TODO(fundador): correo/WhatsApp de contacto por definir */}
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 48, lineHeight: 1.6 }}>
            ¿Equipo grande o necesidades a la medida? Escríbenos:{" "}
            <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>[correo/WhatsApp por definir]</span>
          </p>

          <div className="col-footer-bottom" style={{
            marginTop: 40, paddingTop: 24,
            borderTop: "1px solid var(--hairline)",
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
