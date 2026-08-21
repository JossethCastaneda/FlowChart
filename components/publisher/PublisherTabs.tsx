"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Calendar, CheckCircle2, Clock, Images, Zap, Users } from "lucide-react";
import { Composer, type PublishTarget } from "./Composer";
import { ScheduledCalendar } from "./ScheduledCalendar";
import { ApprovalsPanel } from "./ApprovalsPanel";
import { MediaLibrary } from "./MediaLibrary";
import { AssetGroupManager } from "./AssetGroupManager";

/**
 * Subnav del módulo Publicación.
 *
 * Estructura tomada del diseño (Modulo_Publicacion.dc.html): pestaña activa en
 * color de acento con fondo tenue y esquinas superiores redondeadas, riel de
 * 2.5px debajo, y contador de pendientes en Aprobaciones.
 */

const TABS = [
  { key: "composer", label: "Redactor", icon: Zap },
  { key: "calendar", label: "Calendario", icon: Calendar },
  { key: "approvals", label: "Aprobaciones", icon: CheckCircle2 },
  { key: "library", label: "Biblioteca", icon: Images },
  { key: "groups", label: "Grupos", icon: Users },
  { key: "historial", label: "Historial", icon: Clock },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const TAB_KEYS = TABS.map((t) => t.key) as TabKey[];

function isTabKey(value: string | null): value is TabKey {
  return !!value && (TAB_KEYS as string[]).includes(value);
}

export function PublisherTabs() {
  return (
    <Suspense fallback={null}>
      <PublisherTabsInner />
    </Suspense>
  );
}

/**
 * Solo la barra de pestañas. La usa /dashboard/historial, que es ruta propia,
 * para que la navegación del módulo no desaparezca al entrar en esa pestaña.
 */
export function PublisherSubnav() {
  return (
    <Suspense fallback={null}>
      <PublisherTabsInner navOnly />
    </Suspense>
  );
}

function PublisherTabsInner({ navOnly = false }: { navOnly?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Historial vive en su propia ruta; cuando se está en ella, esa es la
  // pestaña activa aunque no haya ?tab= en la URL.
  const onHistorial = pathname?.startsWith("/dashboard/historial") ?? false;
  const paramTab = searchParams.get("tab");
  const activeTab: TabKey = onHistorial ? "historial" : isTabKey(paramTab) ? paramTab : "composer";

  const setActiveTab = useCallback(
    (key: TabKey) => {
      if (key === "historial") {
        router.push("/dashboard/historial");
        return;
      }
      const params = new URLSearchParams(searchParams.toString());
      if (key === "composer") params.delete("tab");
      else params.set("tab", key);
      const query = params.toString();
      const target = `/dashboard/publisher${query ? `?${query}` : ""}`;
      if (onHistorial) router.push(target);
      else router.replace(target, { scroll: false });
    },
    [router, searchParams, onHistorial]
  );

  // Contador de pendientes para el badge de Aprobaciones (el endpoint ya
  // devuelve approvalCounts junto al listado, así que no hay llamada extra).
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/publisher/posts?approvalStatus=pending&limit=1")
      .then((r) => r.json())
      .then((p) => {
        if (!cancelled) setPendingCount(p.data?.approvalCounts?.pending ?? 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  // Cuentas precargadas por "Publicar en el grupo →" (Grupos → Redactor).
  const [pendingComposerTargets, setPendingComposerTargets] = useState<PublishTarget[] | null>(null);
  const publishToGroup = useCallback(
    (targets: PublishTarget[]) => {
      setPendingComposerTargets(targets);
      setActiveTab("composer");
    },
    [setActiveTab]
  );

  // Post a precargar por "Abrir en Redactor" (Calendario → Redactor).
  const [pendingEditPostId, setPendingEditPostId] = useState<string | null>(null);
  const openInRedactor = useCallback(
    (postId: string) => {
      setPendingEditPostId(postId);
      setActiveTab("composer");
    },
    [setActiveTab]
  );

  return (
    <div
      style={
        navOnly
          ? { display: "flex", flexDirection: "column" }
          : { display: "flex", flexDirection: "column", gap: 18, height: "100%", minHeight: 0 }
      }
    >
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 2,
          overflowX: "auto",
          borderBottom: "1px solid var(--hairline)",
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          const showBadge = tab.key === "approvals" && pendingCount > 0;
          return (
            <div
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{ display: "flex", flexDirection: "column", cursor: "pointer", flex: "none" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "11px 15px",
                  fontSize: 12.5,
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? "var(--fc-accent)" : "var(--fc-text-muted)",
                  whiteSpace: "nowrap",
                  borderRadius: "9px 9px 0 0",
                  background: isActive ? "rgba(53,211,217,0.08)" : "transparent",
                  transition: "all 160ms cubic-bezier(.2,.8,.2,1)",
                }}
              >
                <Icon style={{ width: 14, height: 14, flex: "none" }} />
                <span>{tab.label}</span>
                {showBadge && (
                  <span
                    style={{
                      padding: "2px 7px",
                      borderRadius: 999,
                      background: "rgba(242,169,59,0.14)",
                      border: "1px solid rgba(242,169,59,0.32)",
                      fontFamily: "var(--fc-font-mono, monospace)",
                      fontSize: 10,
                      fontWeight: 500,
                      color: "var(--fc-warning)",
                    }}
                  >
                    {pendingCount}
                  </span>
                )}
              </div>
              <div
                style={{
                  height: 2.5,
                  borderRadius: "2px 2px 0 0",
                  background: isActive ? "var(--fc-accent)" : "transparent",
                }}
              />
            </div>
          );
        })}
      </div>

      {!navOnly && (
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {activeTab === "composer" && (
          <Composer
            initialTargets={pendingComposerTargets}
            onConsumeInitialTargets={() => setPendingComposerTargets(null)}
            prefillFromPostId={pendingEditPostId}
            onConsumePrefillFromPostId={() => setPendingEditPostId(null)}
          />
        )}
        {activeTab === "calendar" && <ScheduledCalendar onOpenInComposer={openInRedactor} />}
        {activeTab === "approvals" && <ApprovalsPanel />}
        {activeTab === "library" && <MediaLibrary />}
        {activeTab === "groups" && <AssetGroupManager onPublishToGroup={publishToGroup} />}
      </div>
      )}
    </div>
  );
}
