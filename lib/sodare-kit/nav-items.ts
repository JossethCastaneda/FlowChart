/* ════════════════════════════════════════════════════════════
   SODARE · NAV ITEMS (sidebar)
   Deriva del registro central — NO declares nombres aquí otra vez.
   Reemplaza el NAV_ITEMS hardcodeado de ClientMainWrapper.tsx.

   La esencia (codename) se muestra como subtítulo tenue o tooltip,
   NUNCA como la etiqueta principal. Así el marketer entiende el menú
   al instante y la marca conserva personalidad.
   ════════════════════════════════════════════════════════════ */

import { MODULES, GROUP_LABELS, type ModuleDef, type GroupKey } from "./modules";

export interface NavGroup {
  title: string;
  key: GroupKey;
  items: ModuleDef[];
}

const ORDER: GroupKey[] = ["operacion", "contenido", "crecimiento", "sistema"];

export const NAV_GROUPS: NavGroup[] = ORDER.map((g) => ({
  title: GROUP_LABELS[g],
  key: g,
  items: MODULES.filter((m) => m.group === g),
}));

/* Ejemplo de render (Next.js / React) ───────────────────────────
import { NAV_GROUPS } from "@/sodare-kit/nav-items";
import { usePathname } from "next/navigation";

{NAV_GROUPS.map((group) => (
  <div key={group.key} className={group.key === "sistema" ? "nav-group nav-group--system" : "nav-group"}>
    <p className="t-label px-2 pb-2">{group.title}</p>
    {group.items.map((m) => {
      const active = pathname.startsWith(m.route);
      return (
        <Link
          key={m.key}
          href={m.route}
          title={`✦ ${m.code} — ${m.tagline}`}   // esencia en el tooltip
          style={{ borderLeftColor: active ? m.color : "transparent" }}
          className="nav-item"
        >
          <Icon name={m.icon} style={{ color: m.color }} />
          <span>{m.label}</span>                  // etiqueta funcional
        </Link>
      );
    })}
  </div>
))}

NOTA:
- El grupo "sistema" (Integraciones, Configuración) va al PIE del sidebar,
  separado por un margin-top:auto y en gris (color: var(--text-muted)).
- Los submódulos (m.tabs) NO se renderizan en el sidebar: son pestañas
  dentro de la página del módulo. Ver <ModuleTabs/> + breadcrumb.
───────────────────────────────────────────────────────────────── */
