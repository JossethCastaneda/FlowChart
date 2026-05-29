import type { Metadata } from "next";
import "@/styles/login.css";

export const metadata: Metadata = {
  title: "Sodare - Authentication",
  description: "Login to the Sodare Multichannel Intelligence platform.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  );
}
