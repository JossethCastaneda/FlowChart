// Force all dashboard routes to render dynamically (no static prerendering).
// Dashboard pages rely on useSession, fetch, etc. which don't work at build time.
export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
