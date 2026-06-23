/**
 * Genera un slug URL-safe a partir de un nombre arbitrario.
 *
 * - Normaliza unicode (NFD) para separar diacríticos (á → a)
 * - Elimina todos los caracteres no ASCII después de la normalización
 * - Convierte a minúsculas y reemplaza espacios/guiones múltiples
 * - Trunca a maxLength (por defecto 50)
 *
 * @example
 *   generateSlug("Agencia Mamá & Papá")  // → "agencia-mama-papa"
 *   generateSlug("Sodare 2026!")          // → "sodare-2026"
 */
export function generateSlug(name: string, maxLength = 50): string {
  return name
    .normalize("NFD")                    // separa diacríticos: á → a + ́
    .replace(/[\u0300-\u036f]/g, "")    // elimina los diacríticos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")       // solo alfanumerico + espacios + guión
    .replace(/[\s_]+/g, "-")            // espacios y guiones bajos → guión
    .replace(/-{2,}/g, "-")             // guiones múltiples → uno
    .replace(/^-+|-+$/g, "")           // strip leading/trailing hyphens
    .substring(0, maxLength);
}

/**
 * Genera un slug único añadiendo un sufijo numérico si el base ya existe.
 *
 * @param base   Slug base (ya generado con generateSlug)
 * @param exists Función async que retorna true si el slug ya está en uso
 * @param max    Máximo de intentos antes de lanzar (default 20)
 */
export async function generateUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
  max = 20
): Promise<string> {
  let slug = base;
  for (let attempt = 0; attempt < max; attempt++) {
    if (!(await exists(slug))) return slug;
    slug = `${base}-${attempt + 1}`;
  }
  // Fallback: añadir timestamp para garantizar unicidad
  slug = `${base}-${Date.now()}`;
  return slug;
}
