import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@/styles/animations.css";
import { ClientMainWrapper } from "@/components/layout/ClientMainWrapper";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Sodare | Next-Gen AI & CRM Platform",
  description: "An advanced CRM, Analytics and BotMaker operations platform.",
};

import { AuthProvider } from "@/components/layout/AuthProvider";

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
        </AuthProvider>
      </body>
    </html>
  );
}
