import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zefirus - Authentication",
  description: "Login to the Zefirus Multichannel Intelligence platform.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
