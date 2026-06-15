import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth.config";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { resolveProjectScopeView } from "@/lib/analytics/project-scope.server";
import { PageHeader } from "@/components/ui/PageHeader";
import { PermissionGuard } from "@/components/layout/PermissionsContext";
import { ProjectAnalyticsView } from "@/components/analytics-v2/ProjectAnalyticsView";
import { BarChart2, ArrowLeft, MessageSquareShare, PlugZap } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Proyectos → Análisis de Resultados.
 *
 * Reutiliza el módulo global de Análisis de Resultados (AdvancedAnalyticsDashboard)
 * pero acotado al proyecto: todos los KPIs/conversaciones/campañas/etc. se filtran
 * por los proveedores (bot) y canales configurados en el proyecto. El alcance se
 * resuelve en el servidor verificando ANTES la propiedad multi-tenant del proyecto.
 */
export default async function ProjectAnalisisResultadosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const workspaceId = await getActiveWorkspaceId(session.user.id);
  if (!workspaceId) redirect("/dashboard/proyectos");

  const scope = await resolveProjectScopeView(workspaceId, id);
  if (!scope) notFound();

  const projectLabel = scope.alias || scope.name;
  const backHref = `/dashboard/proyectos/${id}`;

  const header = (
    <div className="space-y-2">
      <Link
        href={backHref}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(148,163,184,0.8)", textDecoration: "none" }}
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Volver al proyecto
      </Link>
      <PageHeader
        title="Análisis de Resultados"
        description={`Métricas conversacionales acotadas a "${projectLabel}" y a sus canales configurados.`}
        icon={<BarChart2 className="w-6 h-6" style={{ color: "#00d4ff" }} />}
      />
    </div>
  );

  // Estado 1) Proyecto sin canales configurados.
  if (scope.channels.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyConfig
          icon={<MessageSquareShare className="w-12 h-12" />}
          title="Sin canales configurados"
          description="Este proyecto aún no tiene canales configurados para analizar resultados."
          ctaLabel="Configurar canales"
          ctaHref={backHref}
        />
      </div>
    );
  }

  // Estado 2) Canales configurados pero sin integraciones de analytics activas.
  if (scope.providers.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyConfig
          icon={<PlugZap className="w-12 h-12" />}
          title="Sin integraciones de analytics"
          description="Este proyecto tiene canales configurados, pero aún no hay integraciones de analytics activas."
          ctaLabel="Configurar integración"
          ctaHref={backHref}
        />
      </div>
    );
  }

  // Estado 5) Error de permisos.
  const permissionDenied = (
    <div className="space-y-6">
      {header}
      <EmptyConfig
        icon={<PlugZap className="w-12 h-12" />}
        title="Acceso denegado"
        description="No tienes permisos para ver el análisis de este proyecto."
        ctaLabel="Volver al proyecto"
        ctaHref={backHref}
      />
    </div>
  );

  return (
    <PermissionGuard permKey="canAccessAnalytics" fallback={permissionDenied}>
      <div className="space-y-6">
        {header}
        <ProjectAnalyticsView
          projectId={scope.projectId}
          clientId={scope.clientId}
          availableChannels={scope.channels}
          availableProviders={scope.providers}
        />
      </div>
    </PermissionGuard>
  );
}

function EmptyConfig({
  icon,
  title,
  description,
  ctaLabel,
  ctaHref,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="glass-panel" style={{ padding: "56px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ color: "rgba(148,163,184,0.65)", marginBottom: 16 }}>{icon}</div>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: "0.2em", color: "#94a3b8", textTransform: "uppercase" }}>{title}</p>
      <p style={{ fontSize: 12, color: "#64748b", marginTop: 8, maxWidth: 460, lineHeight: 1.5 }}>{description}</p>
      <Link href={ctaHref} className="btn-primary" style={{ marginTop: 24, display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
        {ctaLabel}
      </Link>
    </div>
  );
}
