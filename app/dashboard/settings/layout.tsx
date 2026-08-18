"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Settings, Users, Shield, User, Plug, CreditCard, Globe, ChevronRight,
  Layers, Bell, Sparkles, History, Share2, Search, X,
} from "lucide-react";
import { motion } from "framer-motion";
import { useWorkspace } from "@/hooks/use-settings-data";

type Role = "OWNER" | "ADMIN" | "MEMBER";

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  desc: string;
  /** Roles que pueden abrirlo. Sin esto, visible para todos. */
  roles?: Role[];
  /** Términos extra para el buscador (sinónimos y nombres de ajustes). */
  keywords?: string;
}

/**
 * Jerarquía en tres bloques según de quién es el ajuste:
 *   Cuenta     → sólo me afecta a mí
 *   Workspace  → afecta a mi organización y su gente
 *   Plataforma → conexiones, consumo y rastro de la herramienta
 *
 * "Seguridad" vive en Cuenta y es visible para todos: antes estaba restringido
 * a OWNER, así que ningún miembro podía cambiar su propia contraseña.
 */
const SETTINGS_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: "Cuenta",
    items: [
      {
        path: "/dashboard/settings/profile",
        label: "Perfil",
        icon: User,
        desc: "Nombre, foto y WhatsApp",
        keywords: "avatar imagen foto telefono cuentas vinculadas google facebook",
      },
      {
        path: "/dashboard/settings/preferences",
        label: "Preferencias",
        icon: Bell,
        desc: "Notificaciones y apariencia",
        keywords: "tema oscuro claro correo email whatsapp animaciones tablas densidad",
      },
      {
        path: "/dashboard/settings/security",
        label: "Seguridad",
        icon: Shield,
        desc: "Contraseña y cuenta",
        keywords: "contrasena password cerrar sesion eliminar cuenta salir workspace",
      },
    ],
  },
  {
    group: "Workspace",
    items: [
      {
        path: "/dashboard/settings/workspace",
        label: "General",
        icon: Globe,
        desc: "Nombre, región y marca",
        keywords: "zona horaria idioma moneda horario laboral branding logo color slug plan",
      },
      {
        path: "/dashboard/settings/team",
        label: "Equipo",
        icon: Users,
        desc: "Miembros y permisos",
        roles: ["OWNER", "ADMIN"],
        keywords: "invitar invitaciones roles admin remover asientos",
      },
      {
        path: "/dashboard/settings/areas",
        label: "Áreas y flujos",
        icon: Layers,
        desc: "Estructura, SLA y accesos",
        keywords: "departamentos lideres sla tipos de solicitud permisos modulos",
      },
      {
        path: "/dashboard/settings/clients",
        label: "Portal de clientes",
        icon: Share2,
        desc: "Enlaces públicos",
        keywords: "compartir cliente token publico aprobaciones reportes",
      },
    ],
  },
  {
    group: "Plataforma",
    items: [
      {
        path: "/dashboard/settings/integrations",
        label: "Integraciones",
        icon: Plug,
        desc: "Conexiones externas",
        keywords: "meta facebook instagram google ads analytics whatsapp tiktok crm",
      },
      {
        path: "/dashboard/settings/inteligencia",
        label: "Inteligencia",
        icon: Sparkles,
        desc: "Modelo de IA del workspace",
        keywords: "ia ai aria gemini gpt claude modelo costo tokens",
      },
      {
        path: "/dashboard/settings/plan",
        label: "Plan y uso",
        icon: CreditCard,
        desc: "Suscripción y límites",
        roles: ["OWNER", "ADMIN"],
        keywords: "facturacion stripe pago limite proyectos miembros upgrade",
      },
      {
        path: "/dashboard/settings/actividad",
        label: "Actividad",
        icon: History,
        desc: "Registro de auditoría",
        roles: ["OWNER", "ADMIN"],
        keywords: "auditoria log historial cambios quien hizo",
      },
    ],
  },
];

/** Minúsculas y sin acentos: buscar "region" debe encontrar "Región". */
const DIACRITICS = /[̀-ͯ]/g;
function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(DIACRITICS, "");
}

function matches(item: NavItem, query: string) {
  return normalize(`${item.label} ${item.desc} ${item.keywords ?? ""}`).includes(query);
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { role } = useWorkspace();
  const [query, setQuery] = useState("");

  const normalizedQuery = normalize(query.trim());

  const visibleGroups = useMemo(() => {
    const userRole: Role = role ?? "MEMBER";
    return SETTINGS_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          (!item.roles || item.roles.includes(userRole)) &&
          (!normalizedQuery || matches(item, normalizedQuery)),
      ),
    })).filter((group) => group.items.length > 0);
  }, [role, normalizedQuery]);

  return (
    <div className="flex flex-col h-[calc(100vh-88px)] overflow-hidden">
      <div className="shrink-0 pb-3">
        <PageHeader
          title="Configuración"
          description="Tu cuenta, tu equipo y la plataforma."
          icon={<Settings className="w-6 h-6 text-[var(--fc-accent)]" />}
        />
      </div>

      <div className="flex flex-col md:flex-row flex-1 gap-6 overflow-hidden min-h-0">
        {/* ── Navegación ── */}
        <nav
          aria-label="Secciones de configuración"
          className="w-full md:w-60 shrink-0 flex flex-col md:overflow-y-auto md:overflow-x-hidden pb-4 md:pb-16 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[var(--fc-border)] border-b md:border-b-0 border-[var(--fc-border)]"
        >
          {/* Buscador: con 11 pantallas, encontrar "zona horaria" a ojo es lento */}
          <div className="relative mb-3 shrink-0">
            <Search className="w-3.5 h-3.5 text-[var(--fc-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar ajuste…"
              aria-label="Buscar un ajuste"
              className="w-full bg-[var(--fc-surface-hover)] border border-[var(--fc-border)] text-[var(--fc-text)] text-xs rounded-lg pl-9 pr-8 py-2 outline-none transition-all focus:border-[var(--fc-accent)] focus:ring-1 focus:ring-[var(--fc-accent)]"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Limpiar búsqueda"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--fc-text-muted)] hover:text-[var(--fc-text)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {visibleGroups.length === 0 && (
            <p className="text-[11px] text-[var(--fc-text-muted)] px-3 py-4">
              Ningún ajuste coincide con «{query}».
            </p>
          )}

          <div className="flex flex-row md:flex-col gap-2 md:gap-0 overflow-x-auto md:overflow-x-visible scrollbar-hide">
            {visibleGroups.map((group, groupIndex) => (
              <div key={group.group} className="flex flex-row md:flex-col gap-1 md:gap-0 shrink-0">
                <div className="hidden md:block">
                  {groupIndex > 0 && <div className="h-px bg-[var(--fc-surface-hover)] mx-2 my-2.5" />}
                  <div className="text-[9px] font-extrabold tracking-widest uppercase text-[var(--fc-text-muted)] px-3 pb-2">
                    {group.group}
                  </div>
                </div>

                <div className="flex flex-row md:flex-col gap-1">
                  {group.items.map((item) => {
                    const active = pathname === item.path || pathname.startsWith(`${item.path}/`);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        aria-current={active ? "page" : undefined}
                        className={`relative flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-lg transition-colors text-sm md:text-[13px] whitespace-nowrap md:whitespace-normal ${
                          active
                            ? "text-[var(--fc-text)] font-semibold"
                            : "text-[var(--fc-text-secondary)] hover:text-[var(--fc-text)] hover:bg-[var(--fc-surface-hover)]"
                        }`}
                      >
                        {active && (
                          <motion.div
                            layoutId="settings-active-tab"
                            className="absolute inset-0 bg-[var(--fc-surface-raised)] border border-[var(--fc-border)] rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-2 md:gap-3 w-full">
                          <Icon
                            className={`w-4 h-4 md:w-[15px] md:h-[15px] shrink-0 ${
                              active
                                ? "text-[var(--fc-accent)] drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                                : "text-[var(--fc-text-muted)]"
                            }`}
                          />
                          <span className="flex-1 text-left hidden md:block">
                            <span className="block">{item.label}</span>
                            <span
                              className={`block text-[10px] font-normal mt-0.5 ${
                                active ? "text-[var(--fc-text-secondary)]" : "text-[var(--fc-text-muted)]"
                              }`}
                            >
                              {item.desc}
                            </span>
                          </span>
                          <span className="md:hidden text-[13px]">{item.label}</span>
                          {active && (
                            <ChevronRight className="hidden md:block w-3 h-3 text-[var(--fc-accent)] opacity-60 ml-auto" />
                          )}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* ── Contenido ── */}
        <main className="flex-1 w-full overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[var(--fc-border)] pb-16">
          <div className="max-w-4xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
