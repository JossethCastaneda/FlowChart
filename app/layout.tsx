import type { Metadata, Viewport } from "next";
import { Inter_Tight, JetBrains_Mono, Orbitron, Space_Grotesk, Sora, Instrument_Serif } from "next/font/google";
import "./globals.css";
import "@/styles/animations.css";
import { ClientMainWrapper } from "@/components/layout/ClientMainWrapper";
import { AuthProvider } from "@/components/layout/AuthProvider";
import { QueryProvider } from "@/components/layout/QueryProvider";
// import { SpeedInsights } from "@vercel/speed-insights/next";
// import { GoogleTagManager, GoogleAnalytics } from "@next/third-parties/google";
import { ToastContainer } from "@/components/ui/Toast";
import { ConfirmModalContainer } from "@/components/ui/ConfirmModal";
import { PermissionsProvider } from "@/components/layout/PermissionsContext";
import { getBaseUrl } from "@/lib/get-base-url";
import { LanguageProvider } from "@/components/layout/LanguageContext";
import { ZefirusBrandDefs } from "@/components/ui/ZefirusBrandDefs";
import { PopupCloseHandler } from "@/components/layout/PopupCloseHandler";
import { PaywallInterceptor } from "@/components/layout/PaywallInterceptor";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

// Solo inyectar los tags si el ID tiene el formato real (GTM-XXXX / G-XXXX);
// así un placeholder en Vercel no genera scripts rotos en producción.
const rawGtmId = process.env.NEXT_PUBLIC_GTM_ID;
const rawGa4Id = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
const GTM_ID = rawGtmId?.startsWith("GTM-") ? rawGtmId : undefined;
const GA4_ID = rawGa4Id?.startsWith("G-") ? rawGa4Id : undefined;

const inter = Inter_Tight({ subsets: ["latin"], variable: "--font-inter" });
const jbMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-jbmono" });
const orbitron = Orbitron({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-orbitron" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-space" });
const sora = Sora({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sora" });
const instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument" });

export const viewport: Viewport = {
  themeColor: "var(--background)",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const safeUrl = (url: string | undefined): URL => {
  if (!url) return new URL("https://zefirus.xyz");
  const cleaned = url.replace(/^"|"$/g, "").trim();
  if (!cleaned) return new URL("https://zefirus.xyz");
  if (!cleaned.startsWith("http")) return new URL(`http://${cleaned}`);
  try {
    return new URL(cleaned);
  } catch {
    return new URL("https://zefirus.xyz");
  }
};

export const metadata: Metadata = {
  metadataBase: safeUrl(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL),
  title: {
    default: "Zefirus — El centro de mando para agencias de marketing",
    template: "%s | Zefirus",
  },
  description:
    "Maneja la pauta, el WhatsApp y el contenido de todas tus cuentas desde una sola pantalla. Meta, TikTok y Google Ads, inbox unificado y contenido con IA para agencias. Empieza gratis, sin tarjeta.",
  keywords: [
    "plataforma marketing digital",
    "gestión campañas publicitarias",
    "ads manager multicanal",
    "inbox unificado WhatsApp",
    "reportes ROI agencia",
    "herramienta marketing multicuenta",
    "Meta Ads TikTok Google Ads",
    "software para agencias de marketing",
    "automatización marketing digital",
    "dashboard anuncios",
  ],
  authors: [{ name: "Zefirus", url: "https://zefirus.xyz" }],
  creator: "Zefirus",
  publisher: "Zefirus",
  alternates: {
    canonical: "/",
    languages: { "es-MX": "/", "es": "/" },
  },
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "https://zefirus.xyz",
    siteName: "Zefirus",
    title: "Zefirus — El centro de mando para agencias de marketing",
    description:
      "Maneja tus 20 clientes desde una sola pantalla: pauta, WhatsApp y contenido de todas tus cuentas en un solo login. Empieza gratis, sin tarjeta.",
    images: [
      {
        url: "/zefirus-logo-1024.jpg",
        width: 1024,
        height: 1024,
        alt: "Zefirus — Plataforma de Marketing Multicanal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zefirus — El centro de mando para agencias de marketing",
    description:
      "Pauta, WhatsApp y contenido de todas tus cuentas en una sola pantalla. Para agencias. Empieza gratis, sin tarjeta.",
    images: ["/zefirus-logo-1024.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "technology",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${jbMono.variable} ${orbitron.variable} ${spaceGrotesk.variable} ${sora.variable} ${instrumentSerif.variable}`} suppressHydrationWarning>
      <head>
      </head>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem themes={["light", "dark", "azul"]}>
        <ZefirusBrandDefs />
        <AuthProvider>
          <LanguageProvider>
            <PermissionsProvider>
              <QueryProvider>
                <ClientMainWrapper>{children}</ClientMainWrapper>
              </QueryProvider>
              <ToastContainer />
              <ConfirmModalContainer />
              <PopupCloseHandler />
              <PaywallInterceptor />
            </PermissionsProvider>
          </LanguageProvider>
        </AuthProvider>
        {/* <SpeedInsights />
        {GTM_ID && <GoogleTagManager gtmId={GTM_ID} />}
        {GA4_ID && <GoogleAnalytics gaId={GA4_ID} />} */}
        </ThemeProvider>
      </body>
    </html>
  );
}
