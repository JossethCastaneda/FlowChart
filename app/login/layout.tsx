import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FlowChart - Authentication",
  description: "Login to the FlowChart Multichannel Intelligence platform.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
