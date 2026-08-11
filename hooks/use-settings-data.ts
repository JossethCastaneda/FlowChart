/**
 * hooks/use-settings-data.ts
 * =====================================================================
 * Hooks compartidos por toda la sección de Configuración.
 *
 * Centralizar aquí las queries evita el bug que tenía cada pantalla por
 * separado: leer `res.json()` sin desenvolver el sobre `{ success, data }`,
 * lo que dejaba `workspace.id` en `undefined` y vaciaba media sección sin
 * mostrar ningún error. Todas usan las mismas queryKeys, así que invalidar
 * una refresca a todas las pantallas montadas.
 */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiFetch, apiSend } from "@/lib/api-client";
import type { Area, WorkspaceBranding } from "@/lib/workflow-config";
import type { WorkspaceGeneral } from "@/lib/workspace-general";

// ── Tipos ───────────────────────────────────────────────────────────────────

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  memberCount: number;
  projectCount: number;
  createdAt: string;
  isActive: boolean;
  /** Marca del workspace, para distinguirlo en el selector sin abrir Configuración. */
  branding?: {
    displayName: string | null;
    logoUrl: string | null;
    accentColor: string | null;
  };
}

export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  whatsappPhone: string | null;
}

export interface ProfilePayload {
  profile: UserProfile;
  providers: string[];
}

export interface WorkspaceMemberRow {
  id: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  activityStatus?: string;
  /** Overrides por módulo: { ops: { view, edit }, … }. Null = hereda del área. */
  permissions?: Record<string, { view: boolean; edit: boolean }> | null;
  user: { id: string; name: string | null; email: string | null; image: string | null };
}

export interface WorkspaceInviteRow {
  id: string;
  email: string;
  role: string;
  expires: string;
}

// ── Queries ─────────────────────────────────────────────────────────────────

export const settingsKeys = {
  workspaces: ["workspaces"] as const,
  profile: ["userProfile"] as const,
  members: (wsId?: string) => ["workspaceMembers", wsId] as const,
  invites: (wsId?: string) => ["workspaceInvites", wsId] as const,
  workspaceSettings: ["workspaceSettings"] as const,
  audit: (wsId?: string) => ["workspaceAudit", wsId] as const,
};

/** Lista de workspaces del usuario. El activo va primero (lo ordena la API). */
export function useWorkspaces() {
  return useQuery({
    queryKey: settingsKeys.workspaces,
    queryFn: () => apiFetch<WorkspaceSummary[]>("/api/workspace"),
    staleTime: 30_000,
  });
}

/**
 * Workspace activo. La API marca `isActive` según la cookie de sesión; si por
 * lo que sea ninguno viene marcado, caemos al primero para no dejar la
 * pantalla en blanco.
 */
export function useWorkspace() {
  const query = useWorkspaces();
  const list = query.data ?? [];
  const workspace = list.find((w) => w.isActive) ?? list[0] ?? null;

  return {
    workspace,
    workspaceId: workspace?.id,
    /** Rol real del usuario en ESTE workspace (no el de la sesión global). */
    role: workspace?.role,
    isAdmin: workspace?.role === "OWNER" || workspace?.role === "ADMIN",
    isOwner: workspace?.role === "OWNER",
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Rol efectivo del usuario. Prefiere el rol del workspace activo y usa el de
 * la sesión sólo mientras carga, porque la sesión puede quedar desfasada tras
 * cambiar de workspace.
 */
export function useCurrentRole(): "OWNER" | "ADMIN" | "MEMBER" {
  const { data: session } = useSession();
  const { role } = useWorkspace();
  return role ?? ((session?.user as { role?: string } | undefined)?.role as "OWNER" | "ADMIN" | "MEMBER") ?? "MEMBER";
}

export function useProfile() {
  return useQuery({
    queryKey: settingsKeys.profile,
    queryFn: () => apiFetch<ProfilePayload>("/api/user/profile"),
    staleTime: 30_000,
  });
}

export function useWorkspaceMembers(workspaceId?: string, enabled = true) {
  return useQuery({
    queryKey: settingsKeys.members(workspaceId),
    queryFn: () => apiFetch<WorkspaceMemberRow[]>(`/api/workspace/${workspaceId}/members`),
    enabled: !!workspaceId && enabled,
  });
}

export function useWorkspaceInvites(workspaceId?: string, enabled = true) {
  return useQuery({
    queryKey: settingsKeys.invites(workspaceId),
    queryFn: () => apiFetch<WorkspaceInviteRow[]>(`/api/workspace/${workspaceId}/invite`),
    enabled: !!workspaceId && enabled,
  });
}

// ── Configuración del workspace (áreas, branding, región) ───────────────────

export interface WorkspaceSettingsPayload {
  areas: Area[];
  requireLeadReview: boolean;
  branding: WorkspaceBranding;
  general: WorkspaceGeneral;
  configured?: boolean;
  needsMigration?: boolean;
}

/**
 * Fuente única de la configuración del workspace. Áreas, permisos, branding y
 * región comparten fila en la base de datos, así que comparten queryKey: al
 * guardar cualquiera de ellos se refrescan todas las pantallas montadas.
 */
export function useWorkspaceSettings() {
  return useQuery({
    queryKey: settingsKeys.workspaceSettings,
    queryFn: () => apiFetch<WorkspaceSettingsPayload>("/api/workspace/settings"),
  });
}

/** Escritura parcial: sólo se envían las claves indicadas. */
export function useSaveWorkspaceSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: Partial<Pick<WorkspaceSettingsPayload, "areas" | "requireLeadReview" | "branding">> & {
      general?: Partial<WorkspaceGeneral>;
    }) => apiSend<WorkspaceSettingsPayload>("/api/workspace/settings", "PUT", patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.workspaceSettings });
    },
  });
}

/** Invalida todo lo que depende del workspace activo. */
export function useInvalidateWorkspace() {
  const queryClient = useQueryClient();
  return (workspaceId?: string) => {
    queryClient.invalidateQueries({ queryKey: settingsKeys.workspaces });
    queryClient.invalidateQueries({ queryKey: settingsKeys.members(workspaceId) });
    queryClient.invalidateQueries({ queryKey: settingsKeys.invites(workspaceId) });
    queryClient.invalidateQueries({ queryKey: settingsKeys.workspaceSettings });
  };
}
