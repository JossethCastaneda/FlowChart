import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@/styles/animations.css";
import { ClientMainWrapper } from "@/components/layout/ClientMainWrapper";
import { AuthProvider } from "@/components/layout/AuthProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ToastContainer } from "@/components/ui/Toast";
import { ConfirmModalContainer } from "@/components/ui/ConfirmModal";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const viewport: Viewport = {
  themeColor: "#050812",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Sodare — Inteligencia Multicanal",
  description: "Plataforma avanzada de CRM, Analytics, Ads Manager y operaciones para agencias de marketing digital.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <ClientMainWrapper>{children}</ClientMainWrapper>
          <ToastContainer />
          <ConfirmModalContainer />
        </AuthProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
