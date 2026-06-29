"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AreaPermissions, DEFAULT_MEMBER_PERMS } from "@/lib/workflow-config";

interface PermissionsContextValue {
  perms: AreaPermissions;
  role: string;
  loading: boolean;
}

const PermissionsContext = createContext<PermissionsContextValue>({
  perms: DEFAULT_MEMBER_PERMS,
  role: "",
  loading: true,
});

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [perms, setPerms] = useState<AreaPermissions>(DEFAULT_MEMBER_PERMS);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workspace/members/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.permissions) setPerms(d.permissions);
        if (d.role) setRole(d.role);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <PermissionsContext.Provider value={{ perms, role, loading }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}

export function PermissionGuard({
  permKey,
  children,
  fallback,
}: {
  permKey: keyof AreaPermissions;
  children: React.ReactNode;
  /** Mensaje/UI a mostrar cuando falta el permiso (por defecto "Acceso denegado"). */
  fallback?: React.ReactNode;
}) {
  const { perms, loading } = usePermissions();

  if (loading) return null;

  if (!perms[permKey]) {
    if (fallback !== undefined) return <>{fallback}</>;
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2 style={{ fontSize: 20, color: "var(--foreground)", marginBottom: 10 }}>Acceso denegado</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No tienes permisos para acceder a este módulo.</p>
      </div>
    );
  }

  return <>{children}</>;
}
