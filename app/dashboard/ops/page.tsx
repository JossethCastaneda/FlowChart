import OpsPage from "./OpsClient";
import { PermissionGuard } from "@/components/layout/PermissionsContext";

// Force dynamic rendering — OPS page uses useSession, fetch, etc.
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <PermissionGuard permKey="canAccessOps">
      <OpsPage />
    </PermissionGuard>
  );
}
