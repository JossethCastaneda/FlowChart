import type { Metadata, Viewport } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
import { getBaseUrl } from "@/lib/get-base-url";
import { LanguageProvider } from "@/components/layout/LanguageContext";
import { FlowChartBrandDefs } from "@/components/ui/FlowChartBrandDefs";
import { PopupCloseHandler } from "@/components/layout/PopupCloseHandler";
import { PaywallInterceptor } from "@/components/layout/PaywallInterceptor";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AlertToastContainer } from "@/components/alerts/AlertToast";

// Solo inyectar los tags si el ID tiene el formato real (GTM-XXXX / G-XXXX);
// así un placeholder en Vercel no genera scripts rotos en producción.
const rawGtmId = process.env.NEXT_PUBLIC_GTM_ID;
const rawGa4Id = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
const GTM_ID = rawGtmId?.startsWith("GTM-") ? rawGtmId : undefined;
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
const GA4_ID = rawGa4Id?.startsWith("G-") ? rawGa4Id : undefined;

const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap", variable: "--font-manrope" });
const jbMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], display: "swap", variable: "--font-jbmono" });

export const viewport: Viewport = {
  themeColor: "var(--background)",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const safeUrl = (url: string | undefined): URL => {
  if (!url) return new URL("https://flowchart.lat");
  const cleaned = url.replace(/^"|"$/g, "").trim();
  if (!cleaned) return new URL("https://flowchart.lat");
  if (!cleaned.startsWith("http")) return new URL(`http://${cleaned}`);
  try {
    return new URL(cleaned);
  } catch {
    return new URL("https://flowchart.lat");
  }
};

export const metadata: Metadata = {
  metadataBase: safeUrl(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL),
  title: {
    default: "FlowChart — Todos tus canales en un solo flujo de datos",
    template: "%s | FlowChart",
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
  authors: [{ name: "FlowChart", url: "https://flowchart.lat" }],
  creator: "FlowChart",
  publisher: "FlowChart",
  alternates: {
    canonical: "/",
    languages: { "es-MX": "/", "es": "/" },
  },
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "https://flowchart.lat",
    siteName: "FlowChart",
    title: "FlowChart — Todos tus canales en un solo flujo de datos",
    description:
      "Maneja la pauta, el WhatsApp y el contenido de todas tus cuentas desde una sola pantalla. Meta, TikTok y Google Ads, inbox unificado y contenido con IA para agencias. Empieza gratis, sin tarjeta.",
    images: [
      {
        url: "/logo/isotipo-claro.svg",
        width: 1024,
        height: 1024,
        alt: "FlowChart — Plataforma de Marketing Multicanal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FlowChart — Todos tus canales en un solo flujo de datos",
    description:
      "Pauta, WhatsApp y contenido de todas tus cuentas en una sola pantalla. Para agencias. Empieza gratis, sin tarjeta.",
    images: ["/logo/isotipo-claro.svg"],
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
  verification: {
    google: "wiCvJG4XM_WWY4D-QooBOZYMtW2zwfT-lcn9KA16dwc",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${manrope.variable} ${jbMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('fc-theme') || 'dark';
                  var resolved = t === 'system'
                    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                    : t;
                  document.documentElement.setAttribute('data-theme', resolved);
                  localStorage.setItem('fc-theme', t);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem themes={["light", "dark"]}>
        <FlowChartBrandDefs />
        <AuthProvider>
          <LanguageProvider>
            <PermissionsProvider>
              <QueryProvider>
                <ClientMainWrapper>{children}</ClientMainWrapper>
              </QueryProvider>
              <ToastContainer />
              <AlertToastContainer />
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
