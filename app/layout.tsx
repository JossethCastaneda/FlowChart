import type { Metadata, Viewport } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
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
import { SodareBrandDefs } from "@/components/ui/SodareBrandDefs";
import { PopupCloseHandler } from "@/components/layout/PopupCloseHandler";
import { PaywallInterceptor } from "@/components/layout/PaywallInterceptor";

// Solo inyectar los tags si el ID tiene el formato real (GTM-XXXX / G-XXXX);
// así un placeholder en Vercel no genera scripts rotos en producción.
const rawGtmId = process.env.NEXT_PUBLIC_GTM_ID;
const rawGa4Id = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
const GTM_ID = rawGtmId?.startsWith("GTM-") ? rawGtmId : undefined;
const GA4_ID = rawGa4Id?.startsWith("G-") ? rawGa4Id : undefined;

const inter = Inter_Tight({ subsets: ["latin"], variable: "--font-inter" });
const jbMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jbmono" });

export const viewport: Viewport = {
  themeColor: "#0b0d12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const safeUrl = (url: string | undefined): URL => {
  if (!url) return new URL("https://sodare.xyz");
  const cleaned = url.replace(/^"|"$/g, "").trim();
  if (!cleaned) return new URL("https://sodare.xyz");
  if (!cleaned.startsWith("http")) return new URL(`http://${cleaned}`);
  try {
    return new URL(cleaned);
  } catch {
    return new URL("https://sodare.xyz");
  }
};

export const metadata: Metadata = {
  metadataBase: safeUrl(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL),
  title: {
    default: "Sodare — Plataforma de Marketing Multicanal para Agencias | LATAM",
    template: "%s | Sodare",
  },
  description:
    "Gestiona campañas de Meta Ads, TikTok Ads y Google Ads, inbox de WhatsApp y reportes de ROI en una sola plataforma. Diseñada para agencias y anunciantes en México y LATAM. Empieza gratis.",
  keywords: [
    "plataforma marketing digital",
    "gestión campañas publicitarias",
    "ads manager multicanal",
    "inbox unificado WhatsApp",
    "reportes ROI agencia",
    "herramienta marketing LATAM",
    "Meta Ads TikTok Google Ads",
    "software agencias marketing México",
    "automatización marketing digital",
    "dashboard anuncios",
  ],
  authors: [{ name: "Sodare", url: "https://sodare.xyz" }],
  creator: "Sodare",
  publisher: "Sodare",
  alternates: {
    canonical: "/",
    languages: { "es-MX": "/", "es": "/" },
  },
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "https://sodare.xyz",
    siteName: "Sodare",
    title: "Sodare — Tu Centro de Mando de Marketing Multicanal",
    description:
      "Unifica campañas de Meta, TikTok y Google Ads, inbox de WhatsApp y reportes de ROI. Diseñada para agencias en LATAM. Empieza gratis, sin tarjeta.",
    images: [
      {
        url: "/sodare-logo-1024.jpg",
        width: 1024,
        height: 1024,
        alt: "Sodare — Plataforma de Marketing Multicanal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sodare — Marketing Multicanal para Agencias | LATAM",
    description:
      "Gestiona Meta Ads, TikTok Ads, Google Ads, WhatsApp y reportes de ROI en una sola plataforma. Empieza gratis.",
    images: ["/sodare-logo-1024.jpg"],
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
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Aplica el tema guardado antes del primer paint (evita FOUC) */}
        <script
          id="theme-script"
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("sodare:theme");if(t==="claro")document.documentElement.classList.add("theme-claro");else if(t==="azul_medianoche")document.documentElement.classList.add("theme-azul-medianoche");}catch(e){}`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${jbMono.variable} font-sans antialiased`}>
        <SodareBrandDefs />
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
      </body>
    </html>
  );
}
