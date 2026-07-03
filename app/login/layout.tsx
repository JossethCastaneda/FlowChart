import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sodare - Authentication",
  description: "Login to the Sodare Multichannel Intelligence platform.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
