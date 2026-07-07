import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Settings, ExternalLink, Plug } from "lucide-react";
import { PermissionGuard } from "@/components/layout/PermissionsContext";

export default function AnalisisConfiguracionPage() {
  return (
    <PermissionGuard permKey="canAccessAnalytics">
      <div className="space-y-6">
        <PageHeader
          title="Configuración de Análisis"
          description="Administra las conexiones a Botmaker y Cari AI."
          icon={<Settings className="w-6 h-6" style={{ color: "var(--cyan)" }} />}
        />

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "24px",
          }}
        >
          <div className="flex items-start gap-3">
            <Plug className="w-5 h-5 text-cyan-400 mt-0.5" />
            <div className="space-y-2">
              <h3 className="text-[var(--foreground)] text-sm font-bold">Conexión de integraciones</h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-2xl">
                Las conexiones a <strong>Botmaker</strong> y <strong>Cari AI</strong> ahora se
                administran de forma centralizada en la sección de Integraciones, junto al resto de
                los activos del workspace.
              </p>
              <Link
                href="/dashboard/integrations"
                className="inline-flex items-center gap-2 mt-2 bg-cyan-600 hover:bg-cyan-700 text-[var(--foreground)] text-sm font-bold py-2 px-4 rounded transition-colors"
              >
                Ir a Integraciones <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
