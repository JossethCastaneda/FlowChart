import OpsPage from "./OpsClient";

// Force dynamic rendering — OPS page uses useSession, fetch, etc.
export const dynamic = "force-dynamic";

export default function Page() {
  return <OpsPage />;
}
