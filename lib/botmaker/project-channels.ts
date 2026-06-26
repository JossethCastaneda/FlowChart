/**
 * Auto-mapping proyecto → canales de Botmaker.
 *
 * Un proyecto guarda los identificadores de sus canales del bot en columnas
 * `whatsapp[]` (número de línea), `instagram[]`/`fanpage[]` (nombre del canal) y
 * `webchat[]` (id del widget). Esos valores se capturan en el formulario eligiendo
 * los canales REALES que devuelve Botmaker (`/api/integrations/botmaker/channels`),
 * así que coinciden 1-a-1 con el listado de `listChannels`. Esta función resuelve
 * ese match y devuelve los **ids de canal de Botmaker** que pertenecen al proyecto,
 * para acotar el dashboard de Bot Analytics sin configuración manual extra.
 *
 * El match es por igualdad exacta normalizada (trim + lowercase, sin `@`), de modo
 * que las páginas de FB/IG capturadas solo para Ads (que no son canales del bot)
 * simplemente no encuentran par y se ignoran sin ruido.
 */

interface ChannelForMatch {
  id: string;
  name?: string;
  canonical?: string | null;
  number?: string | null;
}

interface ProjectChannelRefs {
  whatsapp?: string[] | null;
  instagram?: string[] | null;
  fanpage?: string[] | null;
  webchat?: string[] | null;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/^@/, "");
const toSet = (arr?: string[] | null) => new Set((arr || []).filter(Boolean).map(norm));

export function resolveProjectChannelIds(
  project: ProjectChannelRefs,
  channels: ChannelForMatch[]
): string[] {
  const wa = toSet(project.whatsapp);
  const ig = toSet(project.instagram);
  const fb = toSet(project.fanpage);
  // webchat se guarda como id del canal → se compara sin normalizar a minúsculas.
  const web = new Set((project.webchat || []).filter(Boolean).map((s) => s.trim()));

  const ids = new Set<string>();
  for (const c of channels) {
    const name = norm(c.name || "");
    const number = norm(c.number || "");
    switch (c.canonical) {
      case "whatsapp":
        if (wa.has(number) || (name && wa.has(name))) ids.add(c.id);
        break;
      case "instagram":
        if (name && ig.has(name)) ids.add(c.id);
        break;
      case "facebook":
      case "messenger":
        if (name && fb.has(name)) ids.add(c.id);
        break;
      case "webchat":
        if (web.has(c.id) || (name && web.has(c.name || ""))) ids.add(c.id);
        break;
    }
  }
  return [...ids];
}
